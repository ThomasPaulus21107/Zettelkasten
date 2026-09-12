import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildGraph, loadConfig } from './lib/indexer.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(root, 'vaults.config.json');
const port = Number(process.env.PORT ?? 4173);

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === '/api/graph') {
      const graph = await buildGraph(await loadConfig(configPath));
      return sendJson(response, 200, graph);
    }
    if (request.url === '/' || request.url === '/index.html') return sendFile(response, 'public/index.html', 'text/html; charset=utf-8');
    if (request.url === '/app.js') return sendFile(response, 'public/app.js', 'application/javascript; charset=utf-8');
    if (request.url === '/styles.css') return sendFile(response, 'public/styles.css', 'text/css; charset=utf-8');
    sendJson(response, 404, { error: 'Nicht gefunden.' });
  } catch (error) {
    const message = error.code === 'ENOENT' ? 'Konfiguration fehlt: vaults.config.json anhand der Beispieldatei anlegen.' : error.message;
    sendJson(response, 500, { error: message });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Zettelkasten Interaktion läuft auf http://localhost:${port}`));

async function sendFile(response, file, contentType) {
  response.writeHead(200, { 'content-type': contentType });
  response.end(await fs.readFile(path.join(root, file)));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}
