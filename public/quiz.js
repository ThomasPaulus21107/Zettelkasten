const elements = {
  intro: document.querySelector('#intro'), game: document.querySelector('#game'), result: document.querySelector('#result'),
  start: document.querySelector('#start-game'), playAgain: document.querySelector('#play-again'), loadStatus: document.querySelector('#load-status'),
  progress: document.querySelector('#progress'), progressBar: document.querySelector('#progress-bar'), score: document.querySelector('#score'), streak: document.querySelector('#streak'), timer: document.querySelector('#timer'),
  kicker: document.querySelector('#kicker'), question: document.querySelector('#question'), clue: document.querySelector('#clue'), answers: document.querySelector('#answers'),
  feedback: document.querySelector('#feedback'), feedbackTitle: document.querySelector('#feedback-title'), explanation: document.querySelector('#explanation'), readSource: document.querySelector('#read-source'), next: document.querySelector('#next-question'),
  reportQuestion: document.querySelector('#report-question'), reportPanel: document.querySelector('#report-panel'), reportReasons: document.querySelector('#report-reasons'), reportStatus: document.querySelector('#report-status'),
  reworkNoteForm: document.querySelector('#rework-note-form'), reworkNote: document.querySelector('#rework-note'), submitReworkNote: document.querySelector('#submit-rework-note'),
  resultTitle: document.querySelector('#result-title'), resultScore: document.querySelector('#result-score'), resultCopy: document.querySelector('#result-copy')
};

let questions = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let correctAnswers = 0;
let elapsedSeconds = 0;
let questionStartedAt = 0;
let responseTimes = [];
let timerId;
let answered = false;

elements.start.addEventListener('click', startGame);
elements.playAgain.addEventListener('click', startGame);
elements.next.addEventListener('click', nextQuestion);
elements.reportQuestion.addEventListener('click', () => {
  elements.reportPanel.hidden = !elements.reportPanel.hidden;
  elements.reportQuestion.setAttribute('aria-expanded', String(!elements.reportPanel.hidden));
  if (!elements.reportPanel.hidden) elements.reportReasons.querySelector('button')?.focus();
});
elements.reportReasons.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-reason]');
  if (button) reportQuestion(button.dataset.reason);
});
elements.reworkNoteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const details = elements.reworkNote.value.trim();
  if (!details) {
    elements.reportStatus.textContent = 'Bitte zuerst eine Rework Note eingeben.';
    elements.reworkNote.focus();
    return;
  }
  reportQuestion('other', details);
});

async function startGame() {
  clearInterval(timerId);
  setLoading(true);
  try {
    const response = await fetch('/api/quiz');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Das Wissensspiel konnte nicht geladen werden.');
    if (!payload.questions?.length) throw new Error('Im aktuellen Vault konnten noch keine geeigneten Fragen erzeugt werden.');
    questions = payload.questions;
    currentIndex = 0;
    score = 0;
    streak = 0;
    correctAnswers = 0;
    responseTimes = [];
    elements.intro.hidden = true;
    elements.result.hidden = true;
    elements.game.hidden = false;
    renderQuestion();
  } catch (error) {
    elements.loadStatus.textContent = error.message;
  } finally {
    setLoading(false);
  }
}

function renderQuestion() {
  const current = questions[currentIndex];
  answered = false;
  elapsedSeconds = 0;
  elements.feedback.hidden = true;
  elements.reportPanel.hidden = true;
  elements.reportQuestion.setAttribute('aria-expanded', 'false');
  elements.reportStatus.textContent = '';
  elements.reworkNote.value = '';
  elements.reworkNote.disabled = false;
  elements.reportQuestion.disabled = false;
  elements.submitReworkNote.disabled = false;
  elements.reportQuestion.textContent = 'rework';
  elements.kicker.textContent = current.kicker;
  elements.question.textContent = current.prompt;
  elements.clue.textContent = current.clue;
  elements.progress.textContent = `${currentIndex + 1} / ${questions.length}`;
  elements.progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  updateScoreboard();
  elements.answers.replaceChildren(...current.choices.map((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer';
    button.innerHTML = `<span>${String.fromCharCode(65 + index)}</span><strong></strong>`;
    button.querySelector('strong').textContent = choice;
    button.addEventListener('click', () => answerQuestion(index));
    return button;
  }));
  startTimer();
}

async function reportQuestion(reason, details = '') {
  const current = questions[currentIndex];
  if (!current || elements.reportQuestion.disabled) return;
  const buttons = [...elements.reportReasons.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  elements.submitReworkNote.disabled = true;
  elements.reportStatus.textContent = 'Meldung wird erfasst …';
  try {
    const response = await fetch('/api/quiz/report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        reason,
        details,
        questionId: current.id,
        questionType: current.type,
        sourceId: current.source.id,
        question: { prompt: current.prompt, clue: current.clue, choices: current.choices }
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Die Meldung konnte nicht erfasst werden.');
    elements.reportStatus.textContent = 'Danke — die Frage ist für diese Sitzung markiert.';
    elements.reportQuestion.textContent = 'rework ✓';
    elements.reworkNote.disabled = true;
  } catch (error) {
    elements.reportStatus.textContent = error.message;
    buttons.forEach((button) => { button.disabled = false; });
    elements.submitReworkNote.disabled = false;
  }
}

function startTimer() {
  clearInterval(timerId);
  questionStartedAt = performance.now();
  elements.timer.textContent = formatElapsed(0);
  timerId = setInterval(() => {
    elapsedSeconds = Math.floor((performance.now() - questionStartedAt) / 1000);
    elements.timer.textContent = formatElapsed(elapsedSeconds);
  }, 250);
}

function answerQuestion(selectedIndex) {
  if (answered) return;
  answered = true;
  clearInterval(timerId);
  const responseTimeMs = Math.round(performance.now() - questionStartedAt);
  elapsedSeconds = Math.floor(responseTimeMs / 1000);
  responseTimes.push({ questionId: questions[currentIndex].id, responseTimeMs });
  const current = questions[currentIndex];
  const correct = selectedIndex === current.correctIndex;
  const buttons = [...elements.answers.querySelectorAll('.answer')];
  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === current.correctIndex) button.classList.add('is-correct');
    if (index === selectedIndex && !correct) button.classList.add('is-wrong');
  });

  if (correct) {
    streak += 1;
    correctAnswers += 1;
    const earned = 100 + Math.min(streak - 1, 5) * 20;
    score += earned;
    elements.feedbackTitle.textContent = `Richtig · +${earned} Punkte`;
    elements.feedback.dataset.state = 'correct';
  } else {
    streak = 0;
    elements.feedbackTitle.textContent = 'Nicht ganz';
    elements.feedback.dataset.state = 'wrong';
  }
  const selectedQuoteAuthor = !correct && current.type === 'author-quote' && selectedIndex >= 0
    ? current.choiceAuthors?.[selectedIndex]
    : '';
  elements.explanation.textContent = selectedQuoteAuthor
    ? `Das ausgewählte Zitat ist im Vault ${selectedQuoteAuthor} zugeordnet. ${current.explanation}`
    : current.explanation;
  elements.readSource.href = `/lesen?id=${encodeURIComponent(current.source.id)}`;
  elements.next.textContent = currentIndex === questions.length - 1 ? 'Ergebnis ansehen' : 'Nächste Frage';
  elements.feedback.hidden = false;
  updateScoreboard();
  elements.next.focus();
}

function nextQuestion() {
  currentIndex += 1;
  if (currentIndex >= questions.length) return showResult();
  renderQuestion();
}

function showResult() {
  elements.game.hidden = true;
  elements.result.hidden = false;
  const ratio = correctAnswers / questions.length;
  elements.resultTitle.textContent = ratio >= .8 ? 'Vault-Kenner:in' : ratio >= .5 ? 'Auf gutem Weg ins Rabbit Hole' : 'Da warten noch Türen auf dich';
  elements.resultScore.textContent = `${score.toLocaleString('de-DE')} Punkte · ${correctAnswers} von ${questions.length} richtig`;
  elements.resultCopy.textContent = ratio >= .8
    ? 'Du erkennst nicht nur einzelne Gedanken, sondern auch ihre Struktur.'
    : ratio >= .5
      ? 'Die Basis sitzt. Eine weitere Runde mischt neue Ausschnitte und Verbindungen.'
      : 'Öffne die Quellen nach den Antworten – die nächste Runde wird leichter.';
}

function updateScoreboard() {
  elements.score.textContent = score.toLocaleString('de-DE');
  elements.streak.textContent = `${streak} ×`;
  elements.timer.textContent = formatElapsed(elapsedSeconds);
}

function formatElapsed(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function setLoading(loading) {
  elements.start.disabled = loading;
  elements.playAgain.disabled = loading;
  elements.start.textContent = loading ? 'Fragen werden gemischt …' : 'Runde starten';
  if (loading) elements.loadStatus.textContent = 'Der aktuelle Vault-Stand wird geladen.';
  else if (!elements.loadStatus.textContent.includes('konnte') && !elements.loadStatus.textContent.includes('keine')) elements.loadStatus.textContent = '';
}
