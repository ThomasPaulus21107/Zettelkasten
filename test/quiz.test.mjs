import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createQuizQuestions } from '../lib/quiz.mjs';

const nodes = Array.from({ length: 8 }, (_, index) => ({
  id: `SX:Zettel/${index}.md`,
  vault: 'SX',
  path: `Zettel/${index}.md`,
  title: `Gedanke ${index}`,
  area: `area-${index % 4}`,
  body: `Dieser ausführliche Gedankenausschnitt Nummer ${index} beschreibt einen eigenständigen Zusammenhang und liefert genügend Text für eine verständliche Frage im Wissensspiel.`
}));
const edges = nodes.slice(1).map((node, index) => ({ source: nodes[index].id, target: node.id, kind: 'inline' }));
for (let index = 0; index < nodes.length - 1; index += 1) {
  nodes[index].body += ` Im praktischen Zusammenhang verweist dieser Gedanke ausdrücklich auf [[Gedanke ${index + 1}]], um die fachliche Verbindung verständlich einzuordnen.`;
  edges[index].targetText = `Gedanke ${index + 1}`;
}

test('erzeugt beantwortbare Quizfragen mit vier eindeutigen Optionen und Quelle', () => {
  const questions = createQuizQuestions(nodes, edges, { count: 9, random: () => 0.42 });
  assert.equal(questions.length, 9);
  assert.ok(questions.some((question) => question.type === 'excerpt'));
  assert.ok(questions.some((question) => question.type === 'context'));
  assert.ok(questions.some((question) => question.type === 'definition'));
  assert.ok(questions.every((question) => !['relation', 'area'].includes(question.type)));
  for (const question of questions) {
    assert.equal(question.choices.length, 4);
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    assert.ok(question.source.id.startsWith('SX:'));
  }
});

test('erzeugt beide Zitat-Richtungen nur aus belegten Zuschreibungen', () => {
  const quoteNodes = ['Ada Lovelace', 'Grace Hopper', 'Edsger Dijkstra', 'Alan Turing'].map((author, index) => ({
    id: `SX:Zettel/Zitat-${index}.md`, vault: 'SX', path: `Zettel/Zitat-${index}.md`,
    title: `Ein belegtes Zitat Nummer ${index}`, type: 'quote', area: 'wissen', related: [`[[${author}]]`],
    body: `> Ein eindeutig belegtes Zitat mit genügend Inhalt für die Quizfrage Nummer ${index}.\n\nDie Quelle und Zuschreibung sind geprüft.`
  }));
  quoteNodes.push({
    ...quoteNodes[0], id: 'SX:Zettel/Unklar.md', path: 'Zettel/Unklar.md', title: 'Unklare Zuschreibung',
    body: '> Ein möglicherweise falsch zugeschriebenes Zitat mit hinreichend langem Wortlaut.\n\n@gap Verbatim-Quelle prüfen.'
  });
  const questions = createQuizQuestions(quoteNodes, [], { count: 20, random: () => 0.42 });
  assert.ok(questions.some((question) => question.type === 'quote-author'));
  assert.ok(questions.some((question) => question.type === 'author-quote'));
  assert.ok(questions.filter((question) => ['quote-author', 'author-quote'].includes(question.type))
    .every((question) => question.source.id !== 'SX:Zettel/Unklar.md'));
  assert.ok(questions.filter((question) => question.type === 'author-quote')
    .every((question) => question.choiceAuthors.length === 4
      && question.choiceAuthors[question.correctIndex]
      && question.prompt.includes(question.choiceAuthors[question.correctIndex])));
});

test('verwendet bei Zitatfragen den vollständigen Wortlaut statt eines gekürzten Titels', () => {
  const fullQuotes = ['Ada Lovelace', 'Grace Hopper', 'Edsger Dijkstra', 'Alan Turing'].map((author, index) => ({
    id: `SX:Zettel/Langes-Zitat-${index}.md`, vault: 'SX', path: `Zettel/Langes-Zitat-${index}.md`,
    title: `Ein langer Zitattitel Nummer ${index}…`, type: 'quote', area: 'wissen', related: [`[[${author}]]`],
    body: `> Dies ist der vollständige, bewusst lange Wortlaut Nummer ${index}, der auch nach dem Titelabbruch ohne Auslassungszeichen komplett in der Quizfrage stehen muss.`
  }));
  const questions = createQuizQuestions(fullQuotes, [], { count: 20, random: () => 0.42 });
  const quoteQuestions = questions.filter((question) => ['quote-author', 'author-quote'].includes(question.type));
  assert.ok(quoteQuestions.length > 0);
  assert.ok(quoteQuestions.every((question) => !question.clue.includes('…') && question.choices.every((choice) => !choice.includes('…'))));
  assert.ok(quoteQuestions.some((question) => `${question.clue} ${question.choices.join(' ')}`.includes('komplett in der Quizfrage stehen muss')));
});

test('liefert bei zu kleinem Bestand nur tatsächlich mögliche Fragen', () => {
  const questions = createQuizQuestions(nodes.slice(0, 3), [], { count: 10, random: () => 0.5 });
  assert.deepEqual(questions, []);
});

test('schließt Entwürfe und Systemzettel aus', () => {
  const dirtyNodes = [
    ...nodes.map((node, index) => ({ ...node, area: index === 0 ? 'wissen # redaktioneller Hinweis' : node.area })),
    { ...nodes[0], id: 'SX:_inbox/Entwurf.md', path: '_inbox/Entwurf.md', title: 'Entwurf' },
    { ...nodes[1], id: 'SX:INDEX_SYSTEM.md', path: 'INDEX_SYSTEM.md', title: 'Index' },
    { ...nodes[2], id: 'SX:AGENTS.md', path: 'AGENTS.md', title: 'Systemanweisung' }
  ];
  const questions = createQuizQuestions(dirtyNodes, [], { count: 20, random: () => 0.42 });
  assert.ok(questions.every((question) => !['Entwurf', 'Index', 'Systemanweisung'].includes(question.source.title)));
});

test('verwendet redaktionelle Markerzeilen nicht als Frageausschnitt', () => {
  const markedNodes = nodes.map((node) => ({ ...node }));
  markedNodes[0].body = '@gap Verbatim-Quelle prüfen, weil dieser lange redaktionelle Hinweis ausdrücklich keine Quizfrage werden darf und nur der Pflege des Zettels dient.\n\nEin fachlich nutzbarer Absatz beschreibt dagegen einen belastbaren Zusammenhang mit ausreichend Inhalt für eine eigenständige und verständliche Wissensfrage.';
  const questions = createQuizQuestions(markedNodes, [], { count: 20, random: () => 0.42 });
  assert.ok(questions.every((question) => !question.clue.includes('Verbatim-Quelle')));
});

test('maskiert verlinkte Begriffe und verwirft Ausschnitte, die den Titel verraten', () => {
  const questions = createQuizQuestions(nodes, edges, { count: 20, random: () => 0.42 });
  const contextQuestion = questions.find((question) => question.type === 'context');
  assert.ok(contextQuestion.clue.includes('_____'));
  assert.ok(!contextQuestion.clue.includes(contextQuestion.choices[contextQuestion.correctIndex]));
  assert.ok(questions.filter((question) => question.type === 'excerpt')
    .every((question) => !question.clue.toLocaleLowerCase('de').includes(question.choices[question.correctIndex].toLocaleLowerCase('de'))));
});

test('verwirft morphologisch verräterische Ausschnitte und nahezu gleichnamige Verbindungen', () => {
  const trickyNodes = nodes.map((node) => ({ ...node }));
  trickyNodes[0].title = 'Autopoiesis';
  trickyNodes[0].body = 'Ein System ist autopoietisch, wenn es seine Bestandteile und Grenzen durch eigene Prozesse kontinuierlich selbst erzeugt und erhält.';
  trickyNodes[1].title = 'Organisation — Wortherkunft';
  trickyNodes[0].body += ' Die Bedeutung wird im Zusammenhang mit [[Organisation — Wortherkunft]] ausführlich erläutert und historisch eingeordnet.';
  const trickyEdges = [{ source: trickyNodes[0].id, target: trickyNodes[1].id, targetText: 'Organisation — Wortherkunft', kind: 'inline' }];
  const questions = createQuizQuestions(trickyNodes, trickyEdges, { count: 20, random: () => 0.42 });
  assert.ok(questions.filter((question) => question.type === 'excerpt' && question.source.id === trickyNodes[0].id)
    .every((question) => !question.clue.toLocaleLowerCase('de').includes('autopoi')));

  trickyNodes[0].title = 'Organisation';
  const similarTitleQuestions = createQuizQuestions(trickyNodes, trickyEdges, { count: 20, random: () => 0.42 });
  assert.ok(!similarTitleQuestions.some((question) => question.type === 'context' && question.source.id === trickyNodes[0].id));

  trickyNodes[2].title = 'PIP vs UV';
  trickyNodes[2].body = 'Wann ist klassisches pip ausreichend und wann lohnt sich der Wechsel zu UV für eine schnellere und reproduzierbare Python-Paketverwaltung?';
  const acronymQuestions = createQuizQuestions(trickyNodes, [], { count: 20, random: () => 0.42 });
  assert.ok(!acronymQuestions.some((question) => question.type === 'excerpt' && question.source.id === trickyNodes[2].id));
});
