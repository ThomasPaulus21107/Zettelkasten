import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildGraph, loadNote } from '../lib/indexer.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'zettelkasten-indexer-'));
const sx = path.join(root, 'SX');
const dx = path.join(root, 'DX');
const config = { vaults: [{ id: 'SX', path: sx }, { id: 'DX', path: dx }] };
await mkdir(dx, { recursive: true });
after(() => rm(root, { recursive: true, force: true }));

async function note(vault, relativePath, content) {
  const file = path.join(vault, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

test('liest Block- und Inline-YAML, CRLF und hält Körper aus der Graph-API heraus', async () => {
  await note(sx, 'Zettel/Systemtheorie.md', `---\r
title: Systemtheorie\r
aliases:\r
  - System Theory\r
tags: [system, organisation]\r
related:\r
  - "[[Führung]]"\r
area:\r
  - organisation\r
---\r
Ein Anschluss an [[Führung]] und [[Zettel/Führung]].`);
  await note(sx, 'Zettel/Führung.md', `---
title: Führung
---
`);
  const graph = await buildGraph(config);
  const system = graph.nodes.find((node) => node.title === 'Systemtheorie');
  assert.deepEqual(system.aliases, ['System Theory']);
  assert.deepEqual(system.area, ['organisation']);
  assert.equal('body' in system, false);
  assert.equal(graph.stats.edges, 3);
  assert.equal(graph.stats.unresolvedLinks, 0);
  assert.equal(new Set(graph.edges.map((edge) => edge.id)).size, 3);
  assert.deepEqual(graph.edges.map((edge) => edge.kind).sort(), ['inline', 'inline', 'related']);
});

test('priorisiert Pfade, meldet Namenskonflikte und löst Cross-Vault nur explizit', async () => {
  await note(sx, 'Zettel/A/Begriff.md', `---
title: Begriff
---
`);
  await note(sx, 'Zettel/B/Begriff.md', `---
title: Begriff
---
`);
  await note(sx, 'Zettel/Quelle.md', '[[Zettel/A/Begriff]] [[Begriff]] [[DX:Zettel/Begriff]] [[DX:Begriff]]');
  await note(dx, 'Zettel/Begriff.md', `---
aliases: [DX-Begriff]
---
`);
  const graph = await buildGraph(config);
  const source = graph.nodes.find((node) => node.path === 'Zettel/Quelle.md');
  const edges = graph.edges.filter((edge) => edge.source === source.id);
  assert.equal(edges[0].target, 'SX:Zettel/A/Begriff.md');
  assert.equal(edges[1].resolution, 'ambiguous');
  assert.deepEqual(edges[1].candidates.sort(), ['SX:Zettel/A/Begriff.md', 'SX:Zettel/B/Begriff.md']);
  assert.equal(edges[2].target, 'DX:Zettel/Begriff.md');
  assert.equal(edges[3].target, 'DX:Zettel/Begriff.md');
  assert.equal(graph.stats.ambiguousLinks, 1);
});

test('schließt Steuer-, Log- und Entwurfsdateien aus und gibt YAML-Fehler als Diagnose aus', async () => {
  await note(sx, 'AGENTS.md', '# System');
  await note(sx, 'log.md', 'Protokoll');
  await note(sx, '_inbox/Entwurf.md', `---
title: Entwurf
---`);
  await note(sx, '_proposals/Vorschlag.md', `---
title: Vorschlag
---`);
  await note(sx, '_archive/Alt.md', `---
title: Alt
---`);
  await note(sx, 'Zettel/Fehler.md', `---
title: [ungültig
---
Text`);
  const graph = await buildGraph(config);
  assert.equal(graph.nodes.some((node) => node.path === 'AGENTS.md'), false);
  assert.equal(graph.nodes.some((node) => node.path === 'log.md'), false);
  assert.equal(graph.nodes.some((node) => node.path.includes('_inbox')), false);
  assert.equal(graph.nodes.some((node) => node.path.includes('_archive')), false);
  assert.equal(graph.diagnostics.length, 1);
  assert.equal(graph.diagnostics[0].path, 'Zettel/Fehler.md');
});

test('liefert den Markdown-Körper nur über die einzelne Zettelabfrage', async () => {
  const noteResult = await loadNote(config, 'SX:Zettel/Führung.md');
  assert.equal(noteResult.title, 'Führung');
  assert.equal(noteResult.content, '\n');
  assert.equal('body' in noteResult, false);
});
