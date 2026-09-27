import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { createQuizQuestions } from './quiz.mjs';

const DEFAULT_EXCLUDES = new Set(['_archive', '_backups', '.obsidian', '.git']);

export async function loadConfig(configPath) {
  const raw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.vaults) || config.vaults.length === 0) {
    throw new Error('vaults.config.json braucht mindestens einen Vault.');
  }
  return config;
}

export async function buildGraph(config) {
  const { nodes, edges } = await buildIndex(config);
  const publicNodes = nodes.map(({ body, ...node }) => node);
  return {
    generatedAt: new Date().toISOString(),
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      unresolvedLinks: edges.filter((edge) => edge.unresolved).length,
      emptyNotes: nodes.filter((node) => node.emptyBody).length,
      markedNotes: nodes.filter((node) => node.markerCount > 0).length,
      markerOccurrences: nodes.reduce((sum, node) => sum + node.markerCount, 0)
    },
    nodes: publicNodes.sort((a, b) => a.title.localeCompare(b.title, 'de')),
    edges
  };
}

export async function buildQuiz(config, options = {}) {
  const { nodes, edges } = await buildIndex(config);
  const questions = createQuizQuestions(nodes, edges, options);
  return {
    generatedAt: new Date().toISOString(),
    questionCount: questions.length,
    questions
  };
}

export async function loadNote(config, noteId) {
  const { nodes } = await buildIndex(config);
  const node = nodes.find((candidate) => candidate.id === noteId);
  if (!node) throw new Error('Zettel nicht gefunden.');
  const { body, ...metadata } = node;
  return { ...metadata, content: body, revision: contentRevision(body) };
}

export async function saveNote(config, { noteId, content, expectedRevision, confirmed, reason }) {
  if (confirmed !== true) throw httpError(400, 'Die Änderung wurde nicht ausdrücklich bestätigt.');
  if (typeof reason !== 'string' || !reason.trim()) throw httpError(400, 'Eine Begründung für die Änderung fehlt.');
  if (typeof content !== 'string') throw httpError(400, 'Der Zettelinhalt fehlt.');
  if (Buffer.byteLength(content, 'utf8') > 2_000_000) throw httpError(413, 'Der Zettelinhalt ist zu groß.');
  const { absolutePath } = resolveNotePath(config, noteId);
  const markdown = await fs.readFile(absolutePath, 'utf8');
  const currentBody = splitFrontmatter(markdown).body;
  if (!expectedRevision || contentRevision(currentBody) !== expectedRevision) {
    throw httpError(409, 'Der Zettel wurde zwischenzeitlich geändert. Bitte neu laden und die Änderung erneut prüfen.');
  }
  const nextMarkdown = replaceBody(markdown, content);
  const temporaryPath = `${absolutePath}.zettelkasten-${process.pid}-${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, nextMarkdown, 'utf8');
    await fs.rename(temporaryPath, absolutePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
  return loadNote(config, noteId);
}

function resolveNotePath(config, noteId) {
  const separator = String(noteId).indexOf(':');
  if (separator <= 0) throw httpError(400, 'Ungültige Zettelkennung.');
  const vaultId = noteId.slice(0, separator);
  const relativePath = noteId.slice(separator + 1).replace(/\\/g, '/');
  const vault = config.vaults.find((candidate) => candidate.id === vaultId);
  if (!vault || !relativePath.toLowerCase().endsWith('.md')) throw httpError(404, 'Zettel nicht gefunden.');
  const vaultRoot = path.resolve(vault.path);
  const absolutePath = path.resolve(vaultRoot, relativePath);
  const resolvedRelative = path.relative(vaultRoot, absolutePath);
  if (!resolvedRelative || resolvedRelative.startsWith('..') || path.isAbsolute(resolvedRelative)) {
    throw httpError(400, 'Ungültiger Zettelpfad.');
  }
  return { vault, absolutePath };
}

function replaceBody(markdown, body) {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return body;
  const closing = /\r?\n---(?=\r?\n|$)/g;
  closing.lastIndex = markdown.startsWith('---\r\n') ? 5 : 4;
  const match = closing.exec(markdown);
  if (!match) throw httpError(422, 'Das Frontmatter ist nicht eindeutig abgeschlossen.');
  const prefixEnd = match.index + match[0].length;
  return `${markdown.slice(0, prefixEnd)}${body}`;
}

function contentRevision(content) {
  return createHash('sha256').update(content).digest('hex');
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function buildIndex(config) {
  const excludeDirectories = new Set([...(config.excludeDirectories ?? []), ...DEFAULT_EXCLUDES]);
  const files = [];
  for (const vault of config.vaults) {
    await collectMarkdownFiles(vault, vault.path, excludeDirectories, files);
  }

  const nodes = await Promise.all(files.map(readNode));
  const resolver = makeResolver(nodes);
  const edges = [];
  for (const node of nodes) {
    for (const link of extractWikiLinks(node.body)) addResolvedEdge(edges, resolver, node, link, 'inline');
    for (const link of node.related) addResolvedEdge(edges, resolver, node, link, 'related');
  }

  return { nodes, edges };
}

async function collectMarkdownFiles(vault, directory, excludes, results) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludes.has(entry.name)) await collectMarkdownFiles(vault, absolutePath, excludes, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push({ vault, absolutePath });
    }
  }
}

async function readNode({ vault, absolutePath }) {
  const markdown = await fs.readFile(absolutePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(markdown);
  const relativePath = path.relative(vault.path, absolutePath).split(path.sep).join('/');
  const fileName = path.basename(relativePath, '.md');
  const title = frontmatter.title ?? fileName;
  const markers = extractAtMarkers(body);
  const markerCounts = markers.reduce((counts, marker) => ({ ...counts, [marker]: (counts[marker] ?? 0) + 1 }), {});
  return {
    id: `${vault.id}:${relativePath}`,
    vault: vault.id,
    path: relativePath,
    title,
    aliases: asArray(frontmatter.aliases),
    tags: asArray(frontmatter.tags),
    related: asArray(frontmatter.related),
    area: frontmatter.area ?? null,
    type: frontmatter.type ?? null,
    status: frontmatter.status ?? null,
    created: normalizeDate(frontmatter.created),
    modified: normalizeDate(frontmatter.modified),
    emptyBody: body.trim().length === 0,
    markers: [...new Set(markers)],
    markerCounts,
    markerCount: markers.length,
    body
  };
}

function splitFrontmatter(markdown) {
  if (!markdown.startsWith('---\n') && !markdown.startsWith('---\r\n')) return { frontmatter: {}, body: markdown };
  const normalized = markdown.replace(/\r\n/g, '\n');
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: {}, body: markdown };
  return { frontmatter: parseFrontmatter(normalized.slice(4, end)), body: normalized.slice(end + 4) };
}

function parseFrontmatter(text) {
  const result = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Za-z][\w -]*):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = splitYamlArray(value.slice(1, -1));
    } else if (value) {
      result[key] = unquote(value);
    }
  }
  return result;
}

function splitYamlArray(value) {
  const parts = [];
  let current = '';
  let quote = null;
  for (const character of value) {
    if ((character === '"' || character === "'") && (!quote || quote === character)) quote = quote ? null : character;
    if (character === ',' && !quote) {
      if (current.trim()) parts.push(unquote(current.trim()));
      current = '';
    } else current += character;
  }
  if (current.trim()) parts.push(unquote(current.trim()));
  return parts;
}

function unquote(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function normalizeDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
}

function makeResolver(nodes) {
  const byName = new Map();
  for (const node of nodes) {
    for (const name of [node.title, path.basename(node.path, '.md'), ...node.aliases]) {
      const key = normalizeTarget(name);
      if (!key) continue;
      const matches = byName.get(key) ?? [];
      matches.push(node);
      byName.set(key, matches);
    }
  }
  return (target, vault) => {
    const matches = byName.get(normalizeTarget(target)) ?? [];
    return matches.find((node) => node.vault === vault) ?? matches[0] ?? null;
  };
}

function addResolvedEdge(edges, resolver, source, rawTarget, kind) {
  const targetText = normalizeLink(rawTarget);
  if (!targetText) return;
  const target = resolver(targetText, source.vault);
  edges.push({
    id: `${source.id}:${kind}:${target?.id ?? targetText}`,
    source: source.id,
    target: target?.id ?? null,
    targetText,
    kind,
    unresolved: !target
  });
}

function extractWikiLinks(text) {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1]);
}

function extractAtMarkers(text) {
  return [...text.matchAll(/(^|[^\p{L}\p{N}_])@([\p{L}\p{N}_-]+)/gu)].map((match) => `@${match[2]}`);
}

function normalizeLink(link) {
  const trimmed = String(link).trim();
  const target = trimmed.startsWith('[[') && trimmed.endsWith(']]') ? trimmed.slice(2, -2) : trimmed;
  return target.split('|')[0].split('#')[0].trim();
}

function normalizeTarget(value) {
  return unquote(String(value).trim()).replace(/\\/g, '/').split('/').at(-1).toLocaleLowerCase('de');
}
