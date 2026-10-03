import http from 'node:http';
import worker from '../worker.mjs';

const revision = 'a'.repeat(40);
const notes = [
  { id: 'SX/Beispiel.md', vault: 'SX', path: 'SX/Beispiel.md', title: 'Soziale Systeme', status: 'rohling', source_status: 'rohling', aliases: '[]', markdown: '---\ntitle: Soziale Systeme\n---\n# Ein Zettel\n\nDies ist ein synthetisches Beispiel für die mobile Vorschau.' },
  { id: 'DX/Beispiel.md', vault: 'DX', path: 'DX/Beispiel.md', title: 'Digitale Transformation', status: 'hypothese', source_status: 'hypothese', aliases: '[]', markdown: '---\ntitle: Digitale Transformation\n---\n# Ein Zettel\n\nAuch dies ist nur ein synthetischer Vorschauinhalt.' },
  { id: 'DX/_inbox/Idee.md', vault: 'DX', path: 'DX/_inbox/Idee.md', title: 'Idee im Eingang', status: 'draft', source_status: 'rohling', aliases: '[]', markdown: '---\ntitle: Idee im Eingang\nstatus: rohling\n---\n# Noch ein Entwurf\n\nDieser Inhalt ist ein synthetischer Inbox-Zettel.' }
];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => String(input).startsWith('https://api.github.com/')
  ? new Response(JSON.stringify({ commit: { sha: revision } }), { headers: { 'content-type': 'application/json' } })
  : originalFetch(input, init);
const env = {
  GITHUB_TOKEN: 'preview', GITHUB_OWNER: 'preview', GITHUB_REPO: 'preview', GITHUB_BRANCH: 'main', ALLOWED_EMAILS: 'preview@example.test',
  DB: { prepare(sql) { return { bind(...params) { this.params = params; return this; },
    async first() { if (sql.includes('index_state')) return { source_branch: 'main', source_commit: revision, indexed_at: new Date().toISOString(), note_count: notes.length }; return notes.find(note => note.id === this.params[1]) ?? null; },
    async all() { const term = String(this.params[0]).replace(/[^\p{L}\p{N}]/gu, '').toLowerCase(); return { results: notes.filter(note => (note.title + note.markdown).toLowerCase().includes(term)).map(({ id, vault, path, title, status, markdown }) => ({ id, vault, path, title, status, excerpt: markdown.slice(0, 90) })) }; }
  }; } }
};
http.createServer(async (incoming, outgoing) => {
  const request = new Request(`http://localhost:4174${incoming.url}`, { method: incoming.method });
  const response = await worker.fetch(request, env, { access: { getIdentity: async () => ({ email: 'preview@example.test' }) } });
  outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
}).listen(4174, '127.0.0.1', () => console.log('MVP preview: http://localhost:4174/'));
