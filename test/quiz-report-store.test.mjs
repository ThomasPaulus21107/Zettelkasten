import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuizReportStore } from '../lib/quiz-report-store.mjs';

test('erfasst Quizmeldungen sitzungsbezogen und begrenzt ihre Zahl', () => {
  const store = createQuizReportStore({ limit: 2 });
  const payload = {
    reason: 'too_easy', questionId: 'q-1', questionType: 'definition', sourceId: 'SX:Zettel/Test.md',
    question: { prompt: 'Was ist das?', clue: 'Kontext', choices: ['A', 'B', 'C', 'D'] }
  };
  const first = store.add(payload);
  store.add({ ...payload, questionId: 'q-2' });
  store.add({ ...payload, questionId: 'q-3' });
  assert.match(first.id, /^[a-f0-9-]{36}$/);
  assert.deepEqual(store.list().map((report) => report.questionId), ['q-2', 'q-3']);
});

test('weist unbekannte Meldegründe und unvollständige Zuordnung zurück', () => {
  const store = createQuizReportStore();
  assert.throws(() => store.add({ reason: 'delete-everything' }), /Meldegrund/);
  assert.throws(() => store.add({ reason: 'other' }), /eindeutig/);
});

test('erfasst fehlenden Kontext und eine individuelle Rework Note', () => {
  const store = createQuizReportStore();
  const base = {
    questionId: 'q-1', questionType: 'context', sourceId: 'SX:Zettel/Test.md',
    question: { prompt: 'Was fehlt?', clue: 'Ausschnitt', choices: ['A', 'B', 'C', 'D'] }
  };
  assert.equal(store.add({ ...base, reason: 'missing_context' }).reason, 'missing_context');
  assert.equal(store.add({ ...base, reason: 'other', details: 'Der vorausgehende Absatz wird für die Einordnung benötigt.' }).details,
    'Der vorausgehende Absatz wird für die Einordnung benötigt.');
  assert.throws(() => store.add({ ...base, reason: 'other', details: '   ' }), /darf nicht leer/);
});
