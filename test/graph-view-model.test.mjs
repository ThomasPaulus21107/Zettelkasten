import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateGraphEdges, filterGraph, localNeighborhood } from '../lib/graph-view-model.mjs';

const nodes = [
  { id: 'A', title: 'A', vault: 'SX', area: ['Organisation'], type: 'zettel', status: 'aktiv' },
  { id: 'B', title: 'B', vault: 'SX', area: 'Organisation', type: 'zettel', status: 'aktiv' },
  { id: 'C', title: 'C', vault: 'DX', area: 'Architecture', type: 'quote', status: 'rohling' },
  { id: 'D', title: 'D', vault: 'DX', area: 'Architecture', type: 'zettel', status: 'aktiv' }
];
const rawEdges = [
  { source: 'A', target: 'B', kind: 'inline' },
  { source: 'A', target: 'B', kind: 'inline' },
  { source: 'A', target: 'B', kind: 'related' },
  { source: 'B', target: 'C', kind: 'inline' },
  { source: 'C', target: 'D', kind: 'inline' },
  { source: 'D', target: null, kind: 'inline' }
];

test('aggregiert gerichtete Kanten und erhält Herkunft sowie Vorkommen', () => {
  const edges = aggregateGraphEdges(rawEdges);
  assert.equal(edges.length, 3);
  assert.deepEqual(edges[0], { id: 'edge:0', source: 'A', target: 'B', kinds: ['inline', 'related'], weight: 3 });
});

test('kombiniert Vault- und Metadatenfilter mit Beziehungstypen', () => {
  const result = filterGraph(nodes, rawEdges, {
    vaults: new Set(['SX']), kinds: new Set(['inline']), area: 'Organisation', type: '', status: ''
  });
  assert.deepEqual(result.nodes.map((node) => node.id), ['A', 'B']);
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0].weight, 2);
});

test('kann Tags filtern und Waisen ausblenden', () => {
  const taggedNodes = nodes.map((node, index) => ({ ...node, tags: index < 2 ? ['gemeinsam'] : ['anders'] }));
  const result = filterGraph(taggedNodes, rawEdges, {
    vaults: new Set(['SX', 'DX']), kinds: new Set(['inline', 'related']), area: '', tag: 'gemeinsam', type: '', status: '', showOrphans: false
  });
  assert.deepEqual(result.nodes.map((node) => node.id), ['A', 'B']);
});

test('lokaler Graph verwendet kürzeste ungerichtete Distanz und separates Limit', () => {
  const edges = aggregateGraphEdges(rawEdges);
  const result = localNeighborhood(nodes, edges, 'A', 3, 3);
  assert.deepEqual(result.nodes.map((node) => node.id), ['A', 'B', 'C']);
  assert.equal(result.total, 4);
  assert.equal(result.levels.get('D'), 3);
  assert.equal(result.edges.length, 2);
});
