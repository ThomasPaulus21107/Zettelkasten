import path from 'node:path';
import { promises as fs } from 'node:fs';
import { parseDocument } from 'yaml';

const DEFAULT_EXCLUDES = new Set(['_archive', '_backups', '.obsidian', '.git', 'node_modules']);
const SKIPPED_KINDS = new Set(['draft', 'system', 'log']);

export async function loadConfig(configPath) {
  const raw = await fs.readFile(configPath, 'utf8');
  const config = JSON.parse(raw);
  if (!Array.isArray(config.vaults) || config.vaults.length === 0) throw new Error('vaults.config.json braucht mindestens einen Vault.');
  return config;
}

export async function buildGraph(config) {
  const { nodes, edges, diagnostics } = await buildIndex(config);
  return {
    generatedAt: new Date().toISOString(),
    stats: { nodes: nodes.length, edges: edges.length, unresolvedLinks: edges.filter((edge) => edge.resolution === 'unresolved').length, ambiguousLinks: edges.filter((edge) => edge.resolution === 'ambiguous').length, diagnostics: diagnostics.length },
    diagnostics,
    nodes: nodes.map(({ body, diagnostics: nodeDiagnostics, ...node }) => node).sort(compareNodes),
    edges
  };
}

export async function loadNote(config, noteId) {
  const { nodes } = await buildIndex(config);
  const node = nodes.find((candidate) => candidate.id === noteId);
  if (!node) throw new Error('Zettel nicht gefunden.');
  const { body, ...metadata } = node;
  return { ...metadata, content: body };
}

async function buildIndex(config) {
  const excludes = new Set([...(config.excludeDirectories ?? []), ...DEFAULT_EXCLUDES]);
  const files = [];
  for (const vault of config.vaults) await collectMarkdownFiles(vault, vault.path, excludes, files);
  const parsed = await Promise.all(files.map(readNode));
  const diagnostics = parsed.flatMap(({ diagnostics: itemDiagnostics }) => itemDiagnostics);
  const nodes = parsed.filter((node) => !SKIPPED_KINDS.has(node.classification));
  const resolve = makeResolver(nodes, config.vaults);
  return { nodes, edges: nodes.flatMap((node) => createEdges(node, resolve)), diagnostics };
}

async function collectMarkdownFiles(vault, directory, excludes, results) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludes.has(entry.name)) await collectMarkdownFiles(vault, absolutePath, excludes, results);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) results.push({ vault, absolutePath });
  }
}

async function readNode({ vault, absolutePath }) {
  const markdown = await fs.readFile(absolutePath, 'utf8');
  const relativePath = path.relative(vault.path, absolutePath).split(path.sep).join('/');
  const { frontmatter, body, errors } = parseFrontmatter(markdown);
  const fileName = path.basename(relativePath, '.md');
  return {
    id: vault.id + ':' + relativePath,
    vault: vault.id,
    path: relativePath,
    title: stringValue(frontmatter.title) ?? fileName,
    aliases: stringArray(frontmatter.aliases),
    tags: stringArray(frontmatter.tags),
    related: stringArray(frontmatter.related),
    area: stringArray(frontmatter.area),
    type: stringValue(frontmatter.type),
    status: stringValue(frontmatter.status),
    classification: classify(relativePath, frontmatter),
    body,
    diagnostics: errors.map((message) => ({ type: 'yaml', vault: vault.id, path: relativePath, message }))
  };
}

function parseFrontmatter(markdown) {
  const normalized = markdown.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { frontmatter: {}, body: normalized, errors: [] };
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { frontmatter: {}, body: normalized, errors: ['Frontmatter ist nicht abgeschlossen.'] };
  const document = parseDocument(normalized.slice(4, end));
  const errors = document.errors.map((error) => error.message);
  let frontmatter = {};
  if (errors.length === 0) {
    const value = document.toJS();
    if (value && typeof value === 'object' && !Array.isArray(value)) frontmatter = value;
  }
  return { frontmatter, body: normalized.slice(end + 4), errors };
}

function classify(relativePath, frontmatter) {
  const segments = relativePath.split('/');
  const base = segments.at(-1).toLocaleLowerCase('de');
  if (segments.some((segment) => ['_inbox', '_proposals', '_maintenance'].includes(segment))) return 'draft';
  if (base === 'log.md') return 'log';
  if (['agents.md', 'claude.md', 'zustand.md', 'konzept.md'].includes(base) || !segments.includes('Zettel')) return 'system';
  if (base.startsWith('index_') || frontmatter.type === 'meta') return 'moc';
  return 'zettel';
}

function makeResolver(nodes, vaults) {
  const byVault = new Map(vaults.map((vault) => [vault.id, []]));
  for (const node of nodes) byVault.get(node.vault)?.push(node);
  const indexes = new Map([...byVault].map(([vault, entries]) => [vault, makeVaultIndex(entries)]));
  return (targetText, sourceVault) => {
    const crossVault = targetText.match(/^([A-Za-z][\w-]*):(.*)$/);
    const vault = crossVault ? crossVault[1] : sourceVault;
    const target = crossVault ? crossVault[2].trim() : targetText;
    const index = indexes.get(vault);
    if (!index) return { resolution: 'unresolved', candidates: [] };
    const exact = index.byPath.get(normalizePath(target)) ?? index.byPath.get(normalizePath(target + '.md'));
    if (exact) return resolved(exact);
    const candidates = unique(index.byName.get(normalizeName(target)) ?? []);
    if (candidates.length === 1) return resolved(candidates[0]);
    return { resolution: candidates.length ? 'ambiguous' : 'unresolved', candidates: candidates.map((node) => node.id) };
  };
}

function makeVaultIndex(nodes) {
  const byPath = new Map();
  const byName = new Map();
  for (const node of nodes) {
    byPath.set(normalizePath(node.path), node);
    for (const name of [path.basename(node.path, '.md'), node.title, ...node.aliases]) {
      const key = normalizeName(name);
      if (!key) continue;
      const entries = byName.get(key) ?? [];
      entries.push(node);
      byName.set(key, entries);
    }
  }
  return { byPath, byName };
}

function createEdges(node, resolve) {
  const occurrences = [...extractWikiLinks(node.body).map((link) => ({ ...link, kind: 'inline' })), ...node.related.map((rawTarget, position) => ({ rawTarget, position, kind: 'related' }))];
  return occurrences.map(({ rawTarget, position, kind }, occurrence) => {
    const targetText = normalizeLink(rawTarget);
    const outcome = targetText ? resolve(targetText, node.vault) : { resolution: 'unresolved', candidates: [] };
    return { id: node.id + ':' + kind + ':' + occurrence, source: node.id, target: outcome.target?.id ?? null, targetText, candidates: outcome.candidates, resolution: outcome.resolution, kind, position, occurrence };
  }).filter((edge) => edge.targetText);
}

function extractWikiLinks(text) { return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => ({ rawTarget: match[1], position: match.index })); }
function resolved(target) { return { resolution: 'resolved', target, candidates: [] }; }
function unique(nodes) { return [...new Map(nodes.map((node) => [node.id, node])).values()]; }
function normalizeLink(link) { return String(link).trim().replace(/^\[\[|\]\]$/g, '').split('|')[0].split('#')[0].trim(); }
function normalizePath(value) { return String(value).replace(/\\/g, '/').replace(/^\.\//, '').toLocaleLowerCase('de'); }
function normalizeName(value) { return normalizePath(String(value)).split('/').at(-1).replace(/\.md$/i, '').trim(); }
function stringValue(value) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function stringArray(value) { return (Array.isArray(value) ? value : value == null ? [] : [value]).filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean); }
function compareNodes(left, right) { return left.title.localeCompare(right.title, 'de') || left.id.localeCompare(right.id); }
