import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildGraph, loadConfig, loadNote, saveNote } from './lib/indexer.mjs';
import { prepareVaultSource } from './lib/vault-source.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(root, 'vaults.config.json');
const port = Number(process.env.PORT ?? 4173);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    if (url.pathname === '/api/graph') {
      const { config, source } = await currentConfig();
      const graph = { ...await buildGraph(config), source };
      return sendJson(response, 200, graph);
    }
    if (url.pathname === '/api/note' && request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (!id) return sendJson(response, 400, { error: 'Zettelkennung fehlt.' });
      const { config } = await currentConfig();
      return sendJson(response, 200, await loadNote(config, id));
    }
    if (url.pathname === '/api/note' && request.method === 'POST') {
      const payload = await readJsonBody(request);
      const { config } = await currentConfig();
      return sendJson(response, 200, await saveNote(config, payload));
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return sendFile(response, 'public/index.html', 'text/html; charset=utf-8');
    if (url.pathname === '/app.js') return sendFile(response, 'public/app.js', 'application/javascript; charset=utf-8');
    if (url.pathname === '/styles.css') return sendFile(response, 'public/styles.css', 'text/css; charset=utf-8');
    sendJson(response, 404, { error: 'Nicht gefunden.' });
  } catch (error) {
    const message = error.code === 'ENOENT' ? 'Konfiguration oder lokaler Vault-Cache fehlt. Bitte vaults.config.json prüfen.' : error.message;
    sendJson(response, error.status ?? 500, { error: message });
  }
});

async function currentConfig() {
  return prepareVaultSource(await loadConfig(configPath));
}

server.listen(port, '127.0.0.1', () => console.log(`Zettelkasten Interaktion läuft auf http://localhost:${port}`));

async function sendFile(response, file, contentType) {
  response.writeHead(200, { 'content-type': contentType });
  response.end(await fs.readFile(path.join(root, file)));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_100_000) throw Object.assign(new Error('Anfrage ist zu groß.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Ungültige JSON-Anfrage.'), { status: 400 });
  }
}
