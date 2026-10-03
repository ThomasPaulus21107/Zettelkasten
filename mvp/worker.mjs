import { HTML, CSS, JS } from './generated-ui.mjs';

const SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff'
};

export default { fetch: handleRequest };

export async function handleRequest(request, env, ctx) {
  if (request.method !== 'GET') return response('Methode nicht erlaubt.', 405);
  if (!ctx.access) return response('Zugang erforderlich.', 403);

  const identity = await ctx.access.getIdentity();
  const allowed = String(env.ALLOWED_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!identity?.email || !allowed.includes(identity.email.toLowerCase())) return response('Zugang nicht freigeschaltet.', 403);

  const url = new URL(request.url);
  if (url.pathname === '/') return response(HTML, 200, 'text/html; charset=utf-8');
  if (url.pathname === '/app.css') return response(CSS, 200, 'text/css; charset=utf-8');
  if (url.pathname === '/app.js') return response(JS, 200, 'application/javascript; charset=utf-8');

  try {
    if (url.pathname === '/api/search') {
      const query = searchExpression(url.searchParams.get('q'));
      if (!query) return json({ results: [], source: null });
      const source = await verifiedSource(env);
      const rows = await env.DB.prepare(`
        SELECT n.id, n.vault, n.title, n.path,
          snippet(note_search, 4, '', '', ' … ', 16) AS excerpt
        FROM note_search JOIN notes n
          ON n.source_commit = note_search.source_commit AND n.id = note_search.id
        WHERE note_search MATCH ? AND n.source_commit = ?
        ORDER BY bm25(note_search, 0, 0, 10, 5, 1)
        LIMIT 40
      `).bind(query, source.revision).all();
      return json({ results: rows.results ?? [], source });
    }
    if (url.pathname === '/api/note') {
      const id = url.searchParams.get('id');
      if (!id || id.length > 512) return json({ error: 'Ungültige Zettelkennung.' }, 400);
      const source = await verifiedSource(env);
      const note = await env.DB.prepare(`
        SELECT id, vault, path, title, aliases, markdown FROM notes
        WHERE source_commit = ? AND id = ?
      `).bind(source.revision, id).first();
      if (!note) return json({ error: 'Zettel nicht gefunden.' }, 404);
      return json({ ...note, body: stripFrontmatter(note.markdown), aliases: JSON.parse(note.aliases), source });
    }
    if (url.pathname === '/api/source') return json({ source: await verifiedSource(env) });
    return json({ error: 'Nicht gefunden.' }, 404);
  } catch (error) {
    if (error instanceof SourceUnavailable) return json({ error: error.message }, 503);
    return json({ error: 'Die Anfrage konnte nicht verarbeitet werden.' }, 500);
  }
}

export function searchExpression(input) {
  const terms = String(input ?? '').normalize('NFKC').match(/[\p{L}\p{N}]{2,}/gu)?.slice(0, 8) ?? [];
  return terms.map((term) => `"${term}"*`).join(' AND ');
}

async function verifiedSource(env) {
  if (!env.DB || !env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || !env.GITHUB_BRANCH) {
    throw new SourceUnavailable('Die Quelle ist nicht vollständig konfiguriert.');
  }
  const state = await env.DB.prepare('SELECT source_branch, source_commit, indexed_at, note_count FROM index_state WHERE id = 1').first();
  if (!state || state.source_branch !== env.GITHUB_BRANCH) throw new SourceUnavailable('Der Zettelindex ist noch nicht bereit.');

  let revision;
  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/branches/${encodeURIComponent(env.GITHUB_BRANCH)}`;
    const response = await fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'user-agent': 'zettelkasten-reader'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('GitHub revision unavailable');
    revision = (await response.json()).commit?.sha;
  } catch {
    throw new SourceUnavailable('GitHub ist derzeit nicht erreichbar; der Index wird nicht als aktuell ausgegeben.');
  }
  if (!revision || revision !== state.source_commit) {
    throw new SourceUnavailable('Der Vault wurde geändert; der Suchindex wird aktualisiert.');
  }
  return { branch: state.source_branch, revision, indexedAt: state.indexed_at, noteCount: state.note_count };
}

class SourceUnavailable extends Error {}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
}

function json(value, status = 200) {
  return response(JSON.stringify(value), status, 'application/json; charset=utf-8');
}

function response(body, status, type = 'text/plain; charset=utf-8') {
  return new Response(body, { status, headers: { ...SECURITY_HEADERS, 'content-type': type } });
}
