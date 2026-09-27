import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the browser's actual traversal without a DOM or private Vault data.
const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const traversal = source.slice(source.indexOf('function expand('), source.indexOf('function focusGraph('));

function explore(pairs, depth, limit) {
  const adjacency = new Map();
  for (const [a, b] of pairs) {
    for (const [from, to] of [[a, b], [b, a]]) {
      if (!adjacency.has(from)) adjacency.set(from, new Set());
      adjacency.get(from).add(to);
    }
  }
  const nodesById = new Map([...adjacency.keys()].map(id => [id, { title: id }]));
  return vm.runInNewContext(`${traversal}\nexpand(['A'], ${depth})`, { adjacency, nodesById, DISPLAY_LIMIT: limit });
}

test('Graphdistanz bleibt bei Zyklen die kürzeste Distanz', () => {
  const result = explore([['A', 'B'], ['B', 'C'], ['C', 'D'], ['A', 'D']], 3, 30);
  assert.equal(result.find(node => node.id === 'D').level, 1);
  assert.equal(result.find(node => node.id === 'C').level, 2);
  assert.equal(result.total, 4);
  assert.equal(new Set(result.map(node => node.id)).size, 4);
});

test('Limit beschränkt die Anzeige, nicht die Zahl erreichbarer Räume', () => {
  const result = explore([['A', 'B'], ['A', 'C'], ['B', 'D'], ['D', 'E']], 2, 2);
  assert.equal(result.length, 2);
  assert.equal(result.total, 4);
  assert.ok(result.every(node => node.parent === null || result.some(parent => parent.id === node.parent)));
});
