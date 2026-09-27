const DEFAULT_COUNT = 10;

export function createQuizQuestions(nodes, edges, { count = DEFAULT_COUNT, random = Math.random } = {}) {
  const publicNodes = nodes.filter((node) => node.title && node.body?.trim() && isQuizNote(node));
  const nodesById = new Map(publicNodes.map((node) => [node.id, node]));
  const quoteRecords = buildQuoteRecords(nodes);
  const questionGroups = [
    excerptQuestions(publicNodes, random),
    contextQuestions(publicNodes, edges, nodesById, random),
    definitionQuestions(publicNodes, random),
    quoteAuthorQuestions(quoteRecords, publicNodes, random),
    authorQuoteQuestions(quoteRecords, random)
  ].filter((questions) => questions.length);

  const questions = [];
  let groupIndex = 0;
  while (questions.length < count && questionGroups.some((group) => group.length)) {
    const group = questionGroups[groupIndex % questionGroups.length];
    const question = group.shift();
    if (question) questions.push(question);
    groupIndex += 1;
  }

  return shuffle(questions, random).map((question, index) => ({
    ...question,
    id: `${index + 1}-${question.type}-${question.source.id}`
  }));
}

function definitionQuestions(nodes, random) {
  const candidates = nodes
    .filter((node) => !['person', 'quote', 'zitat'].includes(normalizedText(node.type)))
    .map((node) => ({ node, description: extractDescription(node.body, node.title) }))
    .filter(({ description }) => description);
  const questions = [];
  for (const candidate of shuffle([...candidates], random)) {
    const alternatives = contextualRecordAlternatives(candidates, candidate, random);
    const options = answerOptions(candidate.description, alternatives.map(({ description }) => description), random);
    if (!options) continue;
    const areas = normalizedAreas(candidate.node.area).map(formatArea);
    questions.push({
      type: 'definition',
      kicker: 'Was ist das?',
      prompt: `Was beschreibt „${candidate.node.title}“?`,
      clue: areas.length ? `Kontext: ${areas.join(' · ')} · ${candidate.node.vault}` : `Quelle: ${candidate.node.vault}-Vault`,
      ...options,
      explanation: `Nur diese Beschreibung stammt aus dem Zettel „${candidate.node.title}“.`,
      source: sourceFor(candidate.node)
    });
  }
  return questions;
}

function quoteAuthorQuestions(records, nodes, random) {
  const people = [...new Set([
    ...records.filter((record) => record.personalAuthor).map((record) => record.author),
    ...nodes.filter((node) => normalizedText(node.type) === 'person').map((node) => node.title)
  ])];
  const seenAuthors = new Set();
  const questions = [];
  for (const record of shuffle(records.filter((candidate) => candidate.personalAuthor), random)) {
    if (seenAuthors.has(normalizedText(record.author))) continue;
    const alternatives = shuffle(people.filter((person) => normalizedText(person) !== normalizedText(record.author)), random);
    const options = answerOptions(record.author, alternatives, random);
    if (!options) continue;
    seenAuthors.add(normalizedText(record.author));
    const areas = normalizedAreas(record.node.area).map(formatArea);
    questions.push({
      type: 'quote-author',
      kicker: areas.length ? `Zitat · ${areas.join(' · ')}` : 'Zitat',
      prompt: 'Von wem stammt dieses Zitat?',
      clue: `„${record.quote}“`,
      ...options,
      explanation: `Der Zettel weist das Zitat ${record.author} zu.`,
      source: sourceFor(record.node)
    });
  }
  return questions;
}

function authorQuoteQuestions(records, random) {
  const questions = [];
  const seenAuthors = new Set();
  for (const record of shuffle(records.filter((candidate) => candidate.personalAuthor), random)) {
    if (seenAuthors.has(normalizedText(record.author))) continue;
    const differentAuthors = records.filter((candidate) => normalizedText(candidate.author) !== normalizedText(record.author));
    const alternatives = [
      ...shuffle(differentAuthors.filter((candidate) => candidate.personalAuthor), random),
      ...shuffle(differentAuthors.filter((candidate) => !candidate.personalAuthor), random)
    ];
    const options = answerOptions(record.quote, alternatives.map((candidate) => candidate.quote), random);
    if (!options) continue;
    const choiceAuthors = options.choices.map((quote) => {
      if (normalizedText(quote) === normalizedText(record.quote)) return record.author;
      return alternatives.find((candidate) => normalizedText(candidate.quote) === normalizedText(quote))?.author ?? '';
    });
    seenAuthors.add(normalizedText(record.author));
    questions.push({
      type: 'author-quote',
      kicker: 'Zitat erkennen',
      prompt: `Welches Zitat stammt von ${record.author}?`,
      clue: 'Nur eines der vier Zitate ist dieser Person in der Vault-Quelle zugeordnet.',
      ...options,
      choiceAuthors,
      explanation: `„${record.quote}“ ist im Vault ${record.author} zugeordnet.`,
      source: sourceFor(record.node)
    });
  }
  return questions;
}

function excerptQuestions(nodes, random) {
  const candidates = [];
  for (const node of shuffle(nodes.filter((candidate) => !['quote', 'zitat'].includes(normalizedText(candidate.type))), random)) {
    const excerpt = extractExcerpt(node.body, node.title);
    if (!excerpt) continue;
    const alternatives = contextualAlternatives(nodes, node, new Set([node.id]), random);
    const options = answerOptions(node.title, alternatives.map((candidate) => candidate.title), random);
    if (!options) continue;
    candidates.push({
      type: 'excerpt',
      kicker: 'Gedankenausschnitt',
      prompt: 'Aus welchem Zettel stammt dieser Ausschnitt?',
      clue: `„${excerpt}“`,
      ...options,
      explanation: `Der Ausschnitt stammt aus „${node.title}“ im ${node.vault}-Vault.`,
      source: sourceFor(node)
    });
  }
  return candidates;
}

function contextQuestions(nodes, edges, nodesById, random) {
  const outgoingBySource = new Map();
  for (const edge of edges) {
    if (edge.kind !== 'inline' || !edge.target || !nodesById.has(edge.source) || !nodesById.has(edge.target) || edge.source === edge.target) continue;
    const outgoing = outgoingBySource.get(edge.source) ?? [];
    outgoing.push(edge);
    outgoingBySource.set(edge.source, outgoing);
  }
  const candidates = [];
  for (const source of shuffle([...nodes], random)) {
    const outgoing = shuffle([...(outgoingBySource.get(source.id) ?? [])], random);
    for (const edge of outgoing) {
      const answer = nodesById.get(edge.target);
      if (!answer || titlesTooSimilar(answer.title, source.title)) continue;
      const clue = extractLinkedContext(source.body, edge.targetText, answer.title);
      if (!clue) continue;
      const alternatives = contextualAlternatives(nodes, source, new Set([source.id, answer.id]), random);
      const options = answerOptions(answer.title, alternatives.map((node) => node.title), random);
      if (!options) continue;
      candidates.push({
        type: 'context',
        kicker: 'Gedanke im Kontext',
        prompt: 'Welcher Gedanke ergänzt die Lücke in diesem Zusammenhang?',
        clue: `„${clue}“`,
        ...options,
        explanation: `Im Zettel „${source.title}“ wird hier auf „${answer.title}“ verwiesen.`,
        source: sourceFor(source)
      });
      break;
    }
  }
  return candidates;
}

function answerOptions(answer, alternatives, random) {
  const distractors = [...new Set(alternatives.filter((value) => value && normalizedText(value) !== normalizedText(answer)))].slice(0, 3);
  if (distractors.length < 3) return null;
  const choices = shuffle([answer, ...distractors], random);
  return { choices, correctIndex: choices.indexOf(answer) };
}

function extractExcerpt(markdown, title) {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/^.*(?:^|\s)@(?:add|new|fix|ask|gap|link)\b.*$/gmi, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/\\(["'])/g, '$1')
    .replace(/[*_~`>]/g, '')
    .replace(/(^|\s)@[\p{L}\p{N}_-]+/gu, ' ');
  const paragraphs = cleaned.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/)
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => value.length >= 90 && value.length <= 360);
  const normalizedTitle = title.toLocaleLowerCase('de');
  const excerpt = paragraphs.find((value) => !value.toLocaleLowerCase('de').includes(normalizedTitle) && !revealsTitle(value, title));
  if (!excerpt) return null;
  return excerpt.length > 240 ? `${excerpt.slice(0, 237).replace(/\s+\S*$/, '')} …` : excerpt;
}

function extractDescription(markdown, title) {
  const sections = markdownSections(markdown);
  const candidates = sections.flatMap((section, sectionIndex) => section.content.split(/\n\s*\n/).map((paragraph, paragraphIndex) => {
    const cleaned = cleanDescriptionParagraph(paragraph);
    return { cleaned, score: descriptionSectionScore(section.heading, cleaned) - sectionIndex * .01 - paragraphIndex * .001 };
  })).filter(({ cleaned }) => cleaned.length >= 70 && cleaned.length <= 520 && (cleaned.match(/["„“]/g) ?? []).length <= 4)
    .sort((left, right) => right.score - left.score);
  const paragraph = candidates[0]?.cleaned;
  if (!paragraph || candidates[0].score < 0) return null;
  const escapedTitle = escapeRegExp(title);
  const titledWithArticle = new RegExp(`\\b(?:der|die|das)\\s+${escapedTitle}`, 'giu');
  const titlePattern = new RegExp(escapedTitle, 'giu');
  let description = paragraph.replace(titledWithArticle, 'Es').replace(titlePattern, 'Es').replace(/\s+/g, ' ').trim();
  if (description.length > 280) description = `${description.slice(0, 277).replace(/\s+\S*$/, '')} …`;
  return description.length >= 60 ? description : null;
}

function markdownSections(markdown) {
  const sections = [];
  let heading = '';
  let lines = [];
  const flush = () => {
    if (lines.some((line) => line.trim())) sections.push({ heading, content: lines.join('\n') });
    lines = [];
  };
  for (const line of markdown.replace(/```[\s\S]*?```/g, ' ').replace(/<!--([\s\S]*?)-->/g, ' ').split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else lines.push(line);
  }
  flush();
  return sections;
}

function cleanDescriptionParagraph(paragraph) {
  return paragraph
    .replace(/^>.*$/gm, ' ')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/!\[\[[^\]]+\]\]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias || target)
    .replace(/\\(["'])/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/(^|\s)@[\p{L}\p{N}_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function descriptionSectionScore(heading, text) {
  if (/bibliograf|autor|referenz|quelle|werk|offene frage|metadaten/iu.test(heading)) return -100;
  let score = 0;
  if (/was es ist|definition|begriff|argumentationsgang|einordnung|zweck|kernidee|beschreibung|überblick|konzept/iu.test(heading)) score += 20;
  if (/\b(?:ist|bezeichnet|beschreibt|bedeutet|versteht|meint|erklärt|behandelt)\b/iu.test(text)) score += 5;
  if (/\b(?:isbn|verlag|university press|erschienen|ausgabe)\b/iu.test(text)) score -= 15;
  return score;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLinkedContext(markdown, targetText, answerTitle) {
  const target = normalizedText(targetText);
  for (const match of markdown.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const rawTarget = match[1].split('|')[0].split('#')[0].trim();
    if (normalizedText(rawTarget) !== target) continue;
    const start = Math.max(markdown.lastIndexOf('\n\n', match.index) + 2, 0);
    const nextBreak = markdown.indexOf('\n\n', match.index + match[0].length);
    const end = nextBreak === -1 ? markdown.length : nextBreak;
    let context = markdown.slice(start, end)
      .replace(match[0], ' ⟦LÜCKE⟧ ')
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, linkedTarget, alias) => alias || linkedTarget)
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, ' ')
      .replace(/[*_~`>]/g, '')
      .replace(/\\(["'])/g, '$1')
      .replace(/\s+/g, ' ')
      .replace('⟦LÜCKE⟧', '_____')
      .trim();
    if (!context.includes('_____') || context.length < 55) continue;
    if ((context.match(/["„“]/g) ?? []).length > 4) continue;
    if (context.length > 280) {
      const blank = context.indexOf('_____');
      const from = Math.max(0, blank - 120);
      const to = Math.min(context.length, blank + 150);
      let slice = context.slice(from, to).trim();
      if (from) slice = slice.replace(/^\S+\s+/, '');
      if (to < context.length) slice = slice.replace(/\s+\S+$/, '');
      context = `${from ? '… ' : ''}${slice}${to < context.length ? ' …' : ''}`;
    }
    if (revealsTitle(context, answerTitle)) continue;
    return context;
  }
  return null;
}

function contextualAlternatives(nodes, reference, excludedIds, random) {
  const referenceAreas = new Set(normalizedAreas(reference.area));
  const available = nodes.filter((node) => node.vault === reference.vault && !excludedIds.has(node.id));
  const close = [];
  const broad = [];
  for (const node of available) {
    const sameArea = normalizedAreas(node.area).some((area) => referenceAreas.has(area));
    (sameArea ? close : broad).push(node);
  }
  return [...shuffle(close, random), ...shuffle(broad, random)];
}

function contextualRecordAlternatives(records, reference, random) {
  const referenceAreas = new Set(normalizedAreas(reference.node.area));
  const available = records.filter((candidate) => candidate.node.id !== reference.node.id && candidate.node.vault === reference.node.vault);
  const close = [];
  const broad = [];
  for (const candidate of available) {
    const sameArea = normalizedAreas(candidate.node.area).some((area) => referenceAreas.has(area));
    (sameArea ? close : broad).push(candidate);
  }
  return [...shuffle(close, random), ...shuffle(broad, random)];
}

function buildQuoteRecords(nodes) {
  const records = [];
  for (const node of nodes.filter((candidate) => ['quote', 'zitat'].includes(normalizedText(candidate.type)))) {
    if (!node.body?.trim() || /kein\s+[^.\n]{0,40}originalsatz|zuschreibung[^.\n]{0,40}offen|verbatim-quelle\s+prüfen/iu.test(node.body)) continue;
    const quote = extractQuote(node);
    const author = inferQuoteAuthor(node);
    if (!quote || !author) continue;
    records.push({ node, quote, author, personalAuthor: looksLikePersonName(author) });
  }
  return records;
}

function extractQuote(node) {
  const block = node.body.match(/^>\s*(.+(?:\n>\s*.*)*)/m)?.[1]
    .replace(/\n>\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!block) return null;
  const cleaned = block.replace(/\\(["'])/g, '$1').replace(/^["„“'‘’]+|["„“'‘’]+$/g, '').trim();
  return cleaned.length >= 18 ? cleaned : null;
}

function inferQuoteAuthor(node) {
  const explicit = node.body.match(/^Urheber:\s*([^,\n]+)/mi)?.[1]?.trim();
  if (explicit) return explicit;
  const relatedAuthor = (node.related ?? []).map(normalizeWikiTarget).find(looksLikePersonName);
  if (relatedAuthor) return relatedAuthor;
  const citation = node.body.match(/^([\p{Lu}][\p{L}.'-]+(?:\s+(?:[\p{Lu}]\.|[\p{Lu}][\p{L}.'-]+)){1,4}):\s/mu)?.[1];
  if (citation) return citation;
  return node.body.match(/(?:^|\n)([\p{Lu}][\p{L}.'-]+(?:\s+(?:[\p{Lu}]\.|[\p{Lu}][\p{L}.'-]+)){1,4}),\s+(?:Schlusssatz|Autor|Quelle)/u)?.[1] ?? null;
}

function normalizeWikiTarget(value) {
  return String(value ?? '').trim().replace(/^\[\[|\]\]$/g, '').split('|')[0].trim();
}

function looksLikePersonName(value) {
  return /^(?:[\p{Lu}][\p{L}.'-]+|[\p{Lu}]\.)(?:\s+(?:[\p{Lu}][\p{L}.'-]+|[\p{Lu}]\.)){1,4}$/u.test(String(value ?? '').trim());
}

function revealsTitle(text, title) {
  const haystack = normalizedText(text);
  const titleTokens = tokens(title);
  if (!titleTokens.length) return false;
  const haystackTokens = tokens(text);
  const matches = titleTokens.filter((token) => haystackTokens.some((candidate) => wordFormsOverlap(token, candidate))).length;
  return matches === titleTokens.length || (titleTokens.length >= 2 && matches / titleTokens.length >= .6);
}

function titlesTooSimilar(left, right) {
  if (normalizedText(left) === normalizedText(right)) return true;
  const leftTokens = tokens(left);
  const rightTokens = tokens(right);
  if (!leftTokens.length || !rightTokens.length) return false;
  const shared = leftTokens.filter((token) => rightTokens.some((candidate) => wordFormsOverlap(token, candidate))).length;
  return shared === Math.min(leftTokens.length, rightTokens.length);
}

function wordFormsOverlap(left, right) {
  if (left === right) return true;
  const prefixLength = Math.min(7, left.length, right.length);
  return prefixLength >= 5 && left.slice(0, prefixLength) === right.slice(0, prefixLength);
}

function tokens(value) {
  const stopWords = new Set(['aber', 'als', 'auch', 'bei', 'bin', 'das', 'dass', 'dem', 'den', 'der', 'des', 'die', 'ein', 'eine', 'einer', 'eines', 'für', 'gedanke', 'ist', 'mit', 'nicht', 'oder', 'the', 'und', 'von', 'was', 'wie', 'wird', 'zu', 'zum', 'zur']);
  return normalizedText(value).split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 2 && !stopWords.has(token));
}

function normalizedText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('de');
}

function normalizedAreas(area) {
  const values = Array.isArray(area) ? area : [area];
  return [...new Set(values.filter(Boolean).flatMap((value) => String(value).split(','))
    .map((value) => value.replace(/\s+#.*$/, '').trim().toLocaleLowerCase('de')).filter(Boolean))];
}

function formatArea(area) {
  return area.replace(/(^|-)(\p{L})/gu, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase('de')}`);
}

function isQuizNote(node) {
  const path = String(node.path).replace(/\\/g, '/');
  const segments = path.split('/');
  const fileName = segments.at(-1)?.replace(/\.md$/i, '') ?? '';
  return !segments.some((segment, index) => index < segments.length - 1 && segment.startsWith('_'))
    && !/^(?:index(?:_|$)|agents$|claude$|readme$|log$)/i.test(fileName)
    && (path.includes('/') || Boolean(node.type))
    && !/(?:^|[-_])proposal$/i.test(fileName);
}

function sourceFor(node) {
  return { id: node.id, title: node.title, vault: node.vault, path: node.path };
}

function shuffle(values, random) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}
