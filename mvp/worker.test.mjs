import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, searchExpression } from './worker.mjs';

const revision = 'a'.repeat(40);
const state = { source_branch: 'main', source_commit: revision, indexed_at: '2026-10-03T00:00:00Z', note_count: 1900 };
const env = {
  ALLOWED_EMAILS: 'owner@example.com', GITHUB_TOKEN: 'test-token', GITHUB_OWNER: 'owner',
  GITHUB_REPO: 'VAULTS', GITHUB_BRANCH: 'main',
  DB: { prepare() { return { first: async () => state }; } }
};
const authenticated = { access: { getIdentity: async () => ({ email: 'owner@example.com' }) } };

test('all routes are private, including UI assets', async () => {
  for (const path of ['/', '/app.js', '/api/source', '/api/search?q=test']) {
    const response = await handleRequest(new Request('https://example.com' + path), env, {});
    assert.equal(response.status, 403);
  }
  assert.equal((await handleRequest(new Request('https://example.com/'), env,
    { access: { getIdentity: async () => ({ email: 'other@example.com' }) } })).status, 403);
});

test('stale or unreachable GitHub source fails closed', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ commit: { sha: 'b'.repeat(40) } }) });
  let response = await handleRequest(new Request('https://example.com/api/source'), env, authenticated);
  assert.equal(response.status, 503);
  globalThis.fetch = async () => { throw new Error('offline'); };
  response = await handleRequest(new Request('https://example.com/api/source'), env, authenticated);
  assert.equal(response.status, 503);
});

test('search input is converted to safe FTS prefix terms', () => {
  assert.equal(searchExpression('digital transformation'), '"digital"* AND "transformation"*');
  assert.equal(searchExpression('x <script> OR *'), '"script"* AND "OR"*');
  assert.equal(searchExpression('a'), '');
});

test('Inbox drafts remain searchable and keep their original Markdown', async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ commit: { sha: revision } }) });
  const markdown = '---\nstatus: rohling\n---\nEntwurf';
  const inbox = {
    id: 'DX/_inbox/Idee.md', vault: 'DX', path: 'DX/_inbox/Idee.md', title: 'Idee',
    status: 'draft', source_status: 'rohling', aliases: '[]', markdown
  };
  const db = { prepare(sql) { return {
    bind() { return this; },
    async first() { return sql.includes('index_state') ? state : inbox; },
    async all() { return { results: [{ id: inbox.id, title: inbox.title, status: inbox.status }] }; }
  }; } };
  const search = await handleRequest(new Request('https://example.com/api/search?q=Idee'), { ...env, DB: db }, authenticated);
  assert.equal(search.status, 200);
  assert.equal((await search.json()).results[0].status, 'draft');
  const note = await handleRequest(new Request('https://example.com/api/note?id=DX%2F_inbox%2FIdee.md'), { ...env, DB: db }, authenticated);
  assert.equal(note.status, 200);
  const data = await note.json();
  assert.equal(data.status, 'draft');
  assert.equal(data.source_status, 'rohling');
  assert.equal(data.markdown, markdown);
});
