import test from 'node:test';
import assert from 'node:assert/strict';
import { MARKERS, insertMarkerAtTarget, markerAlreadyFollows } from '../public/marker-model.js';

test('bietet nur die vier vereinbarten Marker an', () => {
  assert.deepEqual(MARKERS.map((marker) => marker.value), ['@add', '@new', '@fix', '@ask']);
});

test('setzt einen Marker direkt hinter das gewählte Wort', () => {
  const source = 'Das wichtige Wort steht hier.';
  const start = source.indexOf('Wort');
  const result = insertMarkerAtTarget(source, { start, end: start + 4 }, '@add');
  assert.equal(result, 'Das wichtige Wort @add steht hier.');
});

test('trennt einen Marker bei einer Position innerhalb eines Wortes', () => {
  assert.equal(insertMarkerAtTarget('vorhernachher', { start: 6, end: 6 }, '@ask'), 'vorher @ask nachher');
});

test('erkennt einen bereits folgenden Marker', () => {
  const source = 'Begriff @fix mit Kontext';
  assert.equal(markerAlreadyFollows(source, { end: 7 }, '@fix'), true);
  assert.equal(markerAlreadyFollows(source, { end: 7 }, '@ask'), false);
});
