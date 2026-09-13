import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildGraph, loadNote } from '../lib/indexer.mjs';

const root = await mkdtemp(path.join(tmpdir(), 'zettelkasten-indexer-'));
after(() => rm(root, { recursive: true, force: true }));

test('indexiert explizite Kanten und schließt Archive aus', async () => {
  await mkdir(path.join(root, 'SX', 'Zettel'), { recursive: true });
  await mkdir(path.join(root, 'SX', '_archive'), { recursive: true });
  await writeFile(path.join(root, 'SX', 'Zettel', 'Systemtheorie.md'), `---
title: Systemtheorie
aliases: [System Theory]
tags: [system]
related: ["[[Führung]]"]
area: organisation
---
Ein Anschluss an [[führung]] und [[Zettel/System Theory]].`);
  await writeFile(path.join(root, 'SX', 'Zettel', 'Führung.md'), '---\ntitle: Führung\n---\n');
  await writeFile(path.join(root, 'SX', '_archive', 'Vergangenheit.md'), '---\ntitle: Vergangenheit\n---\n');

  const graph = await buildGraph({ vaults: [{ id: 'SX', path: path.join(root, 'SX') }] });
  assert.equal(graph.stats.nodes, 2);
  assert.equal('body' in graph.nodes[0], false);
  assert.equal(graph.stats.edges, 3);
  assert.equal(graph.stats.unresolvedLinks, 0);
  assert.deepEqual(graph.edges.map((edge) => edge.kind).sort(), ['inline', 'inline', 'related']);
  assert.deepEqual([...new Set(graph.edges.map((edge) => edge.target))].sort(), ['SX:Zettel/Führung.md', 'SX:Zettel/Systemtheorie.md']);
});

test('lädt einen einzelnen Zettel getrennt von der Graph-API', async () => {
  const config = { vaults: [{ id: 'SX', path: path.join(root, 'SX') }] };
  const note = await loadNote(config, 'SX:Zettel/Führung.md');
  assert.equal(note.title, 'Führung');
  assert.equal('content' in note, true);
  assert.equal('body' in note, false);
});
