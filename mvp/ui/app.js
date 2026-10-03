const query = document.querySelector('#query');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
const reader = document.querySelector('#reader');
const searchView = document.querySelector('#search-view');
let activeNote = null;
let timer;
let controller;

function setStatus(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function sourceLabel(source) { document.querySelector('#source').textContent = source ? `VAULTS · ${source.branch} · ${source.revision.slice(0, 8)} · Index: ${new Date(source.indexedAt).toLocaleString('de-DE')}` : 'Quelle derzeit nicht verfügbar'; }
async function api(path, signal) {
  const response = await fetch(path, { signal, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Anfrage fehlgeschlagen.');
  return data;
}
function showSearch() { reader.hidden = true; searchView.hidden = false; activeNote = null; history.replaceState(null, '', '/'); query.focus(); }
function resultButton(note) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'result';
  for (const [className, value] of [['result-vault', note.vault], ['result-title', note.title], ['result-excerpt', note.excerpt || note.path]]) {
    const item = document.createElement(className === 'result-title' ? 'h2' : 'p'); item.className = className; item.textContent = value; button.append(item);
  }
  button.addEventListener('click', () => showNote(note.id)); return button;
}
async function search() {
  controller?.abort(); const value = query.value.trim(); results.replaceChildren();
  if (value.length < 2) { setStatus('Mindestens zwei Zeichen eingeben.'); return; }
  controller = new AbortController(); setStatus('Suche läuft …');
  try {
    const data = await api(`/api/search?q=${encodeURIComponent(value)}`, controller.signal);
    sourceLabel(data.source); results.replaceChildren(...data.results.map(resultButton));
    setStatus(data.results.length ? `${data.results.length} Treffer` : 'Keine Treffer. Versuche einen anderen Begriff.');
  } catch (error) { if (error.name !== 'AbortError') { sourceLabel(null); setStatus(error.message, true); } }
}
function addParagraph(parent, text, kind) { const item = document.createElement(kind || 'p'); item.textContent = text; parent.append(item); }
function renderMarkdown(markdown) {
  const root = document.createDocumentFragment(); let list = null; let code = false; let codeLines = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (/^```/.test(line)) { if (code) { addParagraph(root, codeLines.join('\n'), 'pre'); codeLines = []; } code = !code; continue; }
    if (code) { codeLines.push(line); continue; }
    if (!line.trim()) { list = null; continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    if (heading) { addParagraph(root, heading[2], `h${heading[1].length + 1}`); list = null; continue; }
    const bullet = line.match(/^\s*[-*+]\s+(.+)/);
    if (bullet) { if (!list) { list = document.createElement('ul'); root.append(list); } addParagraph(list, bullet[1], 'li'); continue; }
    list = null;
    if (line.startsWith('> ')) addParagraph(root, line.slice(2), 'blockquote');
    else addParagraph(root, line);
  }
  return root;
}
async function showNote(id) {
  try {
    const data = await api(`/api/note?id=${encodeURIComponent(id)}`);
    activeNote = data; searchView.hidden = true; reader.hidden = false;
    document.querySelector('#note-meta').textContent = data.vault;
    document.querySelector('#note-title').textContent = data.title;
    document.querySelector('#note-body').replaceChildren(renderMarkdown(data.body));
    document.querySelector('#note-path').textContent = data.path;
    sourceLabel(data.source); history.replaceState(null, '', `/?id=${encodeURIComponent(id)}`); window.scrollTo(0, 0);
  } catch (error) { showSearch(); setStatus(error.message, true); }
}
function safeFilename(title, extension) { return `${title.replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').slice(0, 80) || 'Zettel'}.${extension}`; }
async function shareMarkdown() {
  if (!activeNote) return;
  const file = new File([activeNote.markdown], safeFilename(activeNote.title, 'md'), { type: 'text/markdown' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: activeNote.title });
    else { const link = document.createElement('a'); link.href = URL.createObjectURL(file); link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  } catch (error) { if (error.name !== 'AbortError') alert('Teilen nicht möglich: ' + error.message); }
}
query.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 250); });
document.querySelector('#back').addEventListener('click', showSearch);
document.querySelector('#share-md').addEventListener('click', shareMarkdown);
document.querySelector('#share-pdf').addEventListener('click', () => window.print());
api('/api/source').then(({ source }) => sourceLabel(source)).catch(error => { sourceLabel(null); setStatus(error.message, true); });
const initialId = new URL(location.href).searchParams.get('id'); if (initialId) showNote(initialId);
