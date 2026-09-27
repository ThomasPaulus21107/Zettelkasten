import { randomUUID } from 'node:crypto';

export const QUIZ_REPORT_REASONS = new Set(['unclear', 'multiple_correct', 'too_easy', 'wrong_attribution', 'broken_excerpt', 'missing_context', 'other']);

export function createQuizReportStore({ limit = 500 } = {}) {
  const reports = [];
  return {
    add(payload) {
      const report = normalizeReport(payload);
      reports.push(report);
      if (reports.length > limit) reports.splice(0, reports.length - limit);
      return report;
    },
    list() {
      return reports.map((report) => structuredClone(report));
    }
  };
}

function normalizeReport(payload) {
  if (!payload || typeof payload !== 'object') throw reportError('Die Meldung fehlt.');
  const reason = cleanString(payload.reason, 40);
  if (!QUIZ_REPORT_REASONS.has(reason)) throw reportError('Der Meldegrund ist ungültig.');
  const questionId = cleanString(payload.questionId, 300);
  const questionType = cleanString(payload.questionType, 60);
  const sourceId = cleanString(payload.sourceId, 500);
  const details = cleanString(payload.details, 300);
  if (!questionId || !questionType || !sourceId) throw reportError('Die Frage konnte nicht eindeutig zugeordnet werden.');
  if (reason === 'other' && !details) throw reportError('Die Rework Note darf nicht leer sein.');
  const question = payload.question && typeof payload.question === 'object' ? payload.question : {};
  return {
    id: randomUUID(),
    reportedAt: new Date().toISOString(),
    reason,
    details,
    questionId,
    questionType,
    sourceId,
    question: {
      prompt: cleanString(question.prompt, 500),
      clue: cleanString(question.clue, 1_000),
      choices: Array.isArray(question.choices) ? question.choices.slice(0, 4).map((choice) => cleanString(choice, 20_000)) : []
    }
  };
}

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function reportError(message) {
  return Object.assign(new Error(message), { status: 400 });
}
