import { MARKERS, insertMarkerAtTarget, markerAlreadyFollows } from './marker-model.js';

const elements = {
  search: document.querySelector('#search'), summary: document.querySelector('#summary'), sourceStatus: document.querySelector('#source-status'), inventoryStats: document.querySelector('#inventory-stats'),
  sourceStats: document.querySelector('#source-stats'), themeStats: document.querySelector('#theme-stats'),
  inventoryListView: document.querySelector('#inventory-list-view'), inventoryListHeading: document.querySelector('#inventory-list-heading'), inventoryListSummary: document.querySelector('#inventory-list-summary'), inventoryListFilters: document.querySelector('#inventory-list-filters'), inventoryList: document.querySelector('#inventory-list'), inventoryLoadMore: document.querySelector('#inventory-load-more'),
  lowLinks: document.querySelector('#low-links'), lowLinksSummary: document.querySelector('#low-links-summary'),
  markedNotes: document.querySelector('#marked-notes'), markedNotesSummary: document.querySelector('#marked-notes-summary'),
  careNotes: document.querySelector('#care-notes'), careNotesSummary: document.querySelector('#care-notes-summary'),
  resultsSummary: document.querySelector('#results-summary'), results: document.querySelector('#results'),
  newsWindow: document.querySelector('#news-window'), newsSummary: document.querySelector('#news-summary'), newNotes: document.querySelector('#new-notes'), changedNotes: document.querySelector('#changed-notes'),
  graphSummary: document.querySelector('#graph-summary'), canvas: document.querySelector('#graph-canvas'),
  graphZoomOut: document.querySelector('#graph-zoom-out'), graphReset: document.querySelector('#graph-reset'), graphZoomIn: document.querySelector('#graph-zoom-in'),
  graphEnvironmentDown: document.querySelector('#graph-environment-down'), graphEnvironmentLabel: document.querySelector('#graph-environment-label'), graphEnvironmentUp: document.querySelector('#graph-environment-up'),
  resultTemplate: document.querySelector('#result-template'), explorationShell: document.querySelector('#exploration-shell'),
  reader: document.querySelector('#note-reader'), closeNote: document.querySelector('#close-note'),
  readerMode: document.querySelector('#reader-mode'), editNote: document.querySelector('#edit-note'),
  noteVault: document.querySelector('#note-vault'), noteTitle: document.querySelector('#note-title'), notePath: document.querySelector('#note-path'),
  noteMetadata: document.querySelector('#note-metadata'), noteContent: document.querySelector('#note-content'),
  editorPanel: document.querySelector('#note-editor-panel'), noteEditor: document.querySelector('#note-editor'),
  insertAddMarker: document.querySelector('#insert-add-marker'), previewNote: document.querySelector('#preview-note'), cancelEdit: document.querySelector('#cancel-edit'),
  editorStatus: document.querySelector('#editor-status'), changePreview: document.querySelector('#change-preview'),
  previewSource: document.querySelector('#preview-source'), changeDiff: document.querySelector('#change-diff'), confirmSave: document.querySelector('#confirm-save'),
  markerContextMenu: document.querySelector('#marker-context-menu'), markerContextTarget: document.querySelector('#marker-context-target'), markerContextButtons: document.querySelector('#marker-context-buttons'), markerContextStatus: document.querySelector('#marker-context-status'),
  markerPreview: document.querySelector('#marker-preview'), markerPreviewSource: document.querySelector('#marker-preview-source'), markerChangeDiff: document.querySelector('#marker-change-diff'), confirmMarker: document.querySelector('#confirm-marker'), cancelMarker: document.querySelector('#cancel-marker')
};

let DISPLAY_LIMIT = 30;
const environments = {
  direct: { depth: 1, limit: 30, label: 'Direktes Umfeld', controlLabel: 'Direkt' },
  near: { depth: 2, limit: 45, label: 'Nahes Umfeld', controlLabel: 'Nah' },
  wide: { depth: 3, limit: 60, label: 'Weites Umfeld', controlLabel: 'Weit' }
};
const environmentKeys = Object.keys(environments);
const readerPage = document.documentElement.dataset.page === 'reader';
const verzettelnPage = document.documentElement.dataset.page === 'verzetteln';
const readerNoteId = new URLSearchParams(location.search).get('id');
const inventoryFilterFromUrl = new URLSearchParams(location.search).get('bestand');
const graphSearch = document.querySelector('#graph-search');
const graphKind = document.querySelector('#graph-kind');
const graphHistory = [];
let graph;
let nodesById;
let adjacency;
let graphCanvas;
let activeSeedId = null;
let activeFilterId = null;
let filters = [];
let environmentIndex = 0;
let currentEnvironment = environments[environmentKeys[environmentIndex]];
let currentDepth = currentEnvironment.depth;
let currentNote = null;
let editDirty = false;
let selectedReaderTarget = null;
let lastReaderSelection = null;
let pendingSaveReason = 'Manuelle Änderung im Zettelkasten-Editor';
let inventoryVisibleLimit = 90;

try {
  await loadGraph();
  if (readerPage) await openReaderFromUrl();
} catch (error) {
  elements.summary.textContent = `Index konnte nicht geladen werden: ${error.message}`;
}

elements.search.addEventListener('input', () => { activeSeedId = null; updateView(); });
graphSearch.addEventListener('input', () => {
  if (!graph) return;
  const query = graphSearch.value.trim().toLocaleLowerCase('de');
  const matches = query ? graph.nodes.filter(node => searchable(node).includes(query)) : [];
  document.querySelector('#graph-search-results').replaceChildren(...matches.slice(0, 12).map(node => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = `${node.title} · ${node.vault}`;
    button.addEventListener('click', () => { focusGraph(node); graphSearch.value = ''; document.querySelector('#graph-search-results').replaceChildren(); });
    return button;
  }));
  if (query && !matches.length) document.querySelector('#graph-search-results').textContent = 'Keine passenden Zettel.';
});
graphKind.addEventListener('change', () => { if (graph) updateView(); });
document.querySelector('#graph-back').addEventListener('click', () => { const previous = nodesById.get(graphHistory.pop()); if (previous) focusGraph(previous, false); });
document.querySelector('#graph-read').addEventListener('click', () => { const node = nodesById?.get(activeSeedId); if (node) openReader(node); });
elements.newsWindow.addEventListener('change', renderNews);
elements.closeNote.addEventListener('click', closeReader);
elements.graphEnvironmentDown.addEventListener('click', () => selectEnvironment(environmentIndex - 1));
elements.graphEnvironmentUp.addEventListener('click', () => selectEnvironment(environmentIndex + 1));
function selectEnvironment(index) {
  environmentIndex = Math.max(0, Math.min(environmentKeys.length - 1, index));
  currentEnvironment = environments[environmentKeys[environmentIndex]];
  currentDepth = currentEnvironment.depth;
  DISPLAY_LIMIT = currentEnvironment.limit;
  elements.graphEnvironmentLabel.value = currentEnvironment.controlLabel;
  elements.graphEnvironmentDown.disabled = environmentIndex === 0;
  elements.graphEnvironmentUp.disabled = environmentIndex === environmentKeys.length - 1;
  updateView();
}
elements.editNote.addEventListener('click', startEditing);
elements.cancelEdit.addEventListener('click', cancelEditing);
elements.insertAddMarker.addEventListener('click', insertAddMarker);
elements.previewNote.addEventListener('click', showChangePreview);
elements.noteEditor.addEventListener('input', () => {
  editDirty = elements.noteEditor.value !== currentNote?.content;
  elements.changePreview.hidden = true;
  elements.editorStatus.textContent = editDirty ? 'Ungespeicherte Änderung.' : '';
});
elements.confirmSave.addEventListener('click', saveCurrentNote);
elements.confirmMarker.addEventListener('click', saveCurrentNote);
elements.cancelMarker.addEventListener('click', cancelMarkerSelection);
elements.noteContent.addEventListener('contextmenu', openMarkerContextMenu);
elements.noteContent.addEventListener('pointerdown', (event) => { if (event.button === 2) rememberReaderSelection(); });
elements.noteContent.addEventListener('mouseup', rememberReaderSelection);
elements.noteContent.addEventListener('keyup', rememberReaderSelection);
document.addEventListener('selectionchange', rememberReaderSelection);
document.addEventListener('pointerdown', (event) => { if (!elements.markerContextMenu.hidden && !elements.markerContextMenu.contains(event.target)) closeMarkerContextMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMarkerContextMenu(); });
window.addEventListener('resize', closeMarkerContextMenu);
elements.inventoryLoadMore.addEventListener('click', () => {
  inventoryVisibleLimit += 90;
  renderInventoryList();
});

async function readJson(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Unbekannter Fehler');
  return payload;
}

async function loadGraph() {
  graph = await fetch('/api/graph').then(readJson);
  nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  adjacency = makeAdjacency(graph.edges);
  filters = makeFilters();
  renderSourceStatus();
  renderStructureStats();
  renderNews();
  renderCareLists();
  renderInventoryList();
}

function renderSourceStatus() {
  if (!graph.source) {
    elements.sourceStatus.textContent = 'Quelle: lokale Vault-Konfiguration';
    return;
  }
  const fetchedAt = new Date(graph.source.fetchedAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  elements.sourceStatus.textContent = `GitHub · ${graph.source.branch} · ${graph.source.revision} · aktualisiert ${fetchedAt}`;
}

function renderNews() {
  if (!graph) return;
  const days = Number(elements.newsWindow.value);
  const added = graph.nodes.filter((node) => wasAddedWithinLastDays(node, days));
  const changed = graph.nodes.filter((node) => wasChangedWithinLastDays(node, days) && !wasAddedWithinLastDays(node, days));
  added.sort((left, right) => right.created.localeCompare(left.created) || left.title.localeCompare(right.title, 'de'));
  changed.sort((left, right) => right.modified.localeCompare(left.modified) || left.title.localeCompare(right.title, 'de'));
  elements.newsSummary.textContent = `${added.length} neue Zettel · ${changed.length} geänderte Zettel im gewählten Zeitraum`;
  renderNewsList(elements.newNotes, added, 'Hinzugefügt', 'created');
  renderNewsList(elements.changedNotes, changed, 'Geändert', 'modified');
}

function renderNewsList(container, nodes, label, dateField) {
  if (!nodes.length) {
    const empty = document.createElement('p');
    empty.className = 'news-empty';
    empty.textContent = 'Keine Einträge im gewählten Zeitraum.';
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(...nodes.map((node) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'news-item';
    const title = document.createElement('span');
    title.className = 'news-item-title';
    title.textContent = node.title;
    const meta = document.createElement('span');
    meta.className = 'news-item-meta';
    meta.textContent = `${label} ${node[dateField]} · ${node.vault}`;
    button.append(title, meta);
    button.addEventListener('click', () => openReader(node));
    return button;
  }));
}

function updateView() {
  if (!graph || !graphCanvas) return;
  adjacency = makeAdjacency(graph.edges.filter(edge => graphKind.value === 'all' || edge.kind === graphKind.value));
  const query = elements.search.value.trim().toLocaleLowerCase('de');
  const activeFilter = filters.find((filter) => filter.id === activeFilterId) ?? null;
  const directFocus = !query && !activeFilter && activeSeedId ? nodesById.get(activeSeedId) : null;
  const hasSelection = Boolean(query || activeFilter || directFocus);
  const matchingNodes = directFocus ? [directFocus] : hasSelection
    ? graph.nodes.filter((node) => (!activeFilter || activeFilter.matches(node)) && (!query || searchable(node).includes(query)))
    : [];
  const matches = activeFilter?.id === 'recent'
    ? [...matchingNodes].sort((left, right) => right.created.localeCompare(left.created) || left.title.localeCompare(right.title, 'de'))
    : matchingNodes;
  elements.summary.textContent = hasSelection
    ? `${matches.length} passende Zettel${activeFilter ? ` · ${activeFilter.label}` : ''}`
    : `${graph.stats.nodes} Zettel · ${graph.stats.edges} explizite Verbindungen`;
  elements.resultsSummary.textContent = hasSelection && matches.length
    ? `${matches.length} Treffer. Wähle einen Zettel als Einstieg ins Rabbit Hole.`
    : '';
  const activeSeed = matches.find((node) => node.id === activeSeedId) ?? matches[0] ?? null;
  activeSeedId = activeSeed?.id ?? null;
  renderResults(matches, activeSeedId);
  const seedIds = activeSeed ? [activeSeed.id] : [];
  const expansion = seedIds.length ? expand(seedIds, currentDepth) : [];
  const visibleIds = expansion.map(({ id }) => id);
  const nodes = visibleIds.map((id) => nodesById.get(id)).filter(Boolean);
  const visible = new Set(visibleIds);
  const parents = new Map(expansion.map(({ id, parent }) => [id, parent]));
  const edges = visibleGraphEdges(visible, parents);
  graphCanvas.render(
    nodes,
    edges,
    seedIds,
    new Map(expansion.map(({ id, level }) => [id, level])),
    parents
  );
  const depthLabel = `${currentDepth} ${currentDepth === 1 ? 'Ebene' : 'Ebenen'}`;
  const prefix = activeSeed ? `Einstieg: ${activeSeed.title} · ${currentEnvironment.label}` : 'Suche oder wähle eine Struktur, um in die Rabbit Hole Navigation einzusteigen';
  const truncation = expansion.total > nodes.length ? ` · ${expansion.total - nodes.length} weitere Räume ausgeblendet – Umfeld erweitern oder einen Nachbarn fokussieren` : '';
  elements.graphSummary.textContent = activeSeed ? `${currentEnvironment.label} · ${depthLabel} · ${nodes.length} von ${expansion.total} erreichbaren Räumen · ${edges.length} gerichtete Beziehungen${truncation}.` : prefix;
  document.querySelector('#graph-focus').textContent = activeSeed ? `${activeSeed.title} · ${activeSeed.vault}` : 'Wähle einen Gedanken als Einstieg';
  document.querySelector('#graph-back').disabled = !graphHistory.length;
  document.querySelector('#graph-read').disabled = !activeSeed;
  renderGraphList(nodes, edges, expansion);
  updateFilterCounts(query);
  for (const button of document.querySelectorAll('.stat-filter')) button.setAttribute('aria-pressed', String(button.dataset.filterId === activeFilterId));
}

function visibleGraphEdges(visibleIds, parents) {
  const combined = new Map();
  for (const edge of graph.edges) {
    if (graphKind.value !== 'all' && edge.kind !== graphKind.value) continue;
    if (!edge.target || !visibleIds.has(edge.source) || !visibleIds.has(edge.target)) continue;
    const key = `${edge.source}\u0000${edge.target}`;
    const isTreePassage = parents.get(edge.target) === edge.source || parents.get(edge.source) === edge.target;
    const existing = combined.get(key) ?? { source: edge.source, target: edge.target, kinds: new Set(), weight: 0, tree: false };
    existing.kinds.add(edge.kind);
    existing.weight += 1;
    existing.tree ||= isTreePassage;
    combined.set(key, existing);
  }
  return [...combined.values()].map((edge) => ({ ...edge, kinds: [...edge.kinds] }));
}

function searchable(node) { return [node.title, node.path, ...node.aliases].join(' ').toLocaleLowerCase('de'); }

function makeFilters() {
  const unresolvedCounts = new Map();
  for (const edge of graph.edges.filter((edge) => edge.unresolved)) unresolvedCounts.set(edge.source, (unresolvedCounts.get(edge.source) ?? 0) + 1);
  const unresolvedSources = new Set(unresolvedCounts.keys());
  const isolatedNodes = new Set(graph.nodes.filter((node) => !(adjacency.get(node.id)?.size)).map((node) => node.id));
  const typeIs = (...types) => (node) => types.includes(normalize(node.type));
  const statusIs = (...statuses) => (node) => statuses.includes(normalize(node.status));
  const sourceFilters = [...new Set(graph.nodes.map((node) => node.vault))]
    .sort((left, right) => left.localeCompare(right, 'de'))
    .map((vault) => ({ id: `vault:${vault}`, group: 'source', label: vault, matches: (node) => node.vault === vault }));
  const areaCounts = new Map();
  for (const node of graph.nodes) {
    for (const area of nodeAreas(node)) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
  }
  const areaFilters = [...areaCounts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'de'))
    .map(([area]) => ({
      id: `area:${area}`,
      group: 'theme',
      label: formatArea(area),
      matches: (node) => nodeAreas(node).includes(area)
    }));
  return [
    { id: 'all', group: 'inventory', label: 'Alle Zettel', matches: () => true },
    { id: 'note', group: 'inventory', label: 'Zettel (Typ)', matches: typeIs('zettel') },
    { id: 'quote', group: 'inventory', label: 'Quotes', matches: typeIs('quote', 'zitat') },
    { id: 'person', group: 'inventory', label: 'Personen', matches: typeIs('person') },
    { id: 'source', group: 'inventory', label: 'Quellzettel', matches: typeIs('quelle') },
    { id: 'book', group: 'inventory', label: 'Bücher', matches: typeIs('buch', 'sachbuch') },
    { id: 'meta', group: 'inventory', label: 'Meta', matches: typeIs('meta') },
    { id: 'principle', group: 'inventory', label: 'Prinzipien', matches: typeIs('prinzip') },
    { id: 'organisation', group: 'inventory', label: 'Organisationen', matches: typeIs('organisation') },
    { id: 'milestone', group: 'inventory', label: 'Milestones', matches: typeIs('milestone') },
    { id: 'recent', group: 'inventory', label: 'Neu · letzte 10 Tage', matches: (node) => wasAddedWithinLastDays(node, 10) },
    ...sourceFilters,
    ...areaFilters
  ];
}

function normalize(value) { return (value?.trim() || '').toLocaleLowerCase('de'); }

function wasAddedWithinLastDays(node, days) {
  return isDateWithinLastDays(node.created, days);
}

function wasChangedWithinLastDays(node, days) {
  return isDateWithinLastDays(node.modified, days);
}

function isDateWithinLastDays(value, days) {
  if (!value) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - (days - 1));
  return date >= firstDay && date <= today;
}

function nodeAreas(node) {
  const values = Array.isArray(node.area) ? node.area : [node.area];
  return [...new Set(values.filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => normalize(value))
    .filter(Boolean))];
}

function formatArea(area) {
  return area.replace(/(^|-)(\p{L})/gu, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase('de')}`);
}

function renderStructureStats() {
  for (const [group, container] of [
    ['inventory', elements.inventoryStats], ['source', elements.sourceStats], ['theme', elements.themeStats]
  ]) {
    container.replaceChildren(...filters.filter((filter) => filter.group === group).map((filter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stat-filter';
      button.dataset.filterId = filter.id;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (filter.group === 'inventory') {
          location.assign(`/verzetteln?bestand=${encodeURIComponent(filter.id)}`);
          return;
        }
        activeFilterId = activeFilterId === filter.id ? null : filter.id;
        activeSeedId = null;
        updateView();
      });
      return button;
    }));
  }
}

function renderInventoryList() {
  if (!verzettelnPage || !graph) return;
  const inventoryFilters = filters.filter((filter) => filter.group === 'inventory');
  const selected = inventoryFilters.find((filter) => filter.id === inventoryFilterFromUrl) ?? inventoryFilters.find((filter) => filter.id === 'all');
  if (!selected) return;
  const connectionCounts = connectionCountsForGraph();
  const matches = graph.nodes.filter(selected.matches)
    .sort((left, right) => left.title.localeCompare(right.title, 'de'));
  const visible = matches.slice(0, inventoryVisibleLimit);
  elements.inventoryListHeading.textContent = selected.label;
  elements.inventoryListSummary.textContent = `${matches.length.toLocaleString('de-DE')} Zettel · Titel, Herkunft, Pfad und Pflege-Signale auf einen Blick`;
  elements.inventoryListFilters.replaceChildren(...inventoryFilters.map((filter) => {
    const link = document.createElement('a');
    link.className = 'inventory-filter';
    link.href = `/verzetteln?bestand=${encodeURIComponent(filter.id)}`;
    link.textContent = filter.label;
    link.setAttribute('aria-current', String(filter.id === selected.id ? 'page' : false));
    return link;
  }));
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'news-empty';
    empty.textContent = 'Keine Zettel in dieser Bestandsgruppe.';
    elements.inventoryList.replaceChildren(empty);
  } else {
    elements.inventoryList.replaceChildren(...visible.map((node) => createInventoryItem(node, connectionCounts.get(node.id) ?? 0)));
  }
  const remaining = matches.length - visible.length;
  elements.inventoryLoadMore.hidden = remaining <= 0;
  elements.inventoryLoadMore.textContent = remaining > 0 ? `${Math.min(remaining, 90)} weitere von ${remaining.toLocaleString('de-DE')} Zetteln laden` : '';
}

function connectionCountsForGraph() {
  const counts = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) {
    if (!edge.target) continue;
    counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
    counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
  }
  return counts;
}

function createInventoryItem(node, connections) {
  const item = document.createElement('article');
  item.className = 'inventory-item';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'inventory-item-open';
  const title = document.createElement('strong');
  title.textContent = node.title;
  const path = document.createElement('span');
  path.className = 'inventory-item-path';
  path.textContent = `${node.vault} · ${node.path}`;
  const facts = document.createElement('span');
  facts.className = 'inventory-item-facts';
  const labels = [node.type, node.status, ...nodeAreas(node).map(formatArea), ...node.tags.slice(0, 3)].filter(Boolean);
  facts.textContent = labels.length ? labels.join(' · ') : 'ohne Klassifikation';
  button.append(title, path, facts);
  button.addEventListener('click', () => openReader(node));
  const signals = document.createElement('div');
  signals.className = 'inventory-item-signals';
  for (const label of [
    `${connections} ${connections === 1 ? 'Verbindung' : 'Verbindungen'}`,
    node.markerCount ? `${node.markerCount} ${node.markerCount === 1 ? 'Marker' : 'Marker'}` : null,
    node.created ? `neu ${node.created}` : null,
    node.modified ? `geändert ${node.modified}` : null,
    node.emptyBody ? 'leerer Textkörper' : null
  ].filter(Boolean)) {
    const signal = document.createElement('span');
    signal.textContent = label;
    signals.append(signal);
  }
  item.append(button, signals);
  return item;
}

function renderCareLists() {
  const connectionCounts = connectionCountsForGraph();
  const unresolvedCounts = new Map();
  for (const edge of graph.edges) {
    if (!edge.target) {
      unresolvedCounts.set(edge.source, (unresolvedCounts.get(edge.source) ?? 0) + 1);
    }
  }
  const lowLinks = graph.nodes.filter((node) => (connectionCounts.get(node.id) ?? 0) < 3)
    .sort((left, right) => (connectionCounts.get(left.id) ?? 0) - (connectionCounts.get(right.id) ?? 0) || left.title.localeCompare(right.title, 'de'));
  const marked = graph.nodes.filter((node) => node.markerCount > 0)
    .sort((left, right) => right.markerCount - left.markerCount || left.title.localeCompare(right.title, 'de'));
  const needsCare = graph.nodes.filter((node) =>
    ['rohling', 'hypothese'].includes(normalize(node.status)) || node.emptyBody || !normalize(node.type) || !normalize(node.status)
    || nodeAreas(node).length === 0 || unresolvedCounts.has(node.id)
  ).sort((left, right) => left.title.localeCompare(right.title, 'de'));
  renderCareList(elements.lowLinks, elements.lowLinksSummary, lowLinks, 'weniger als 3 explizite Verbindungen', (node) => `${connectionCounts.get(node.id) ?? 0} Verbindungen`);
  renderCareList(elements.markedNotes, elements.markedNotesSummary, marked, 'mit @-Markern', (node) => `${node.markerCount} ${node.markerCount === 1 ? 'Marker' : 'Marker'}`);
  renderCareList(elements.careNotes, elements.careNotesSummary, needsCare, 'mit Pflegehinweisen', (node) => careReasons(node, unresolvedCounts));
}

function careReasons(node, unresolvedCounts) {
  const reasons = [];
  if (['rohling', 'hypothese'].includes(normalize(node.status))) reasons.push(node.status);
  if (node.emptyBody) reasons.push('leerer Textkörper');
  if (!normalize(node.type)) reasons.push('ohne Typ');
  if (!normalize(node.status)) reasons.push('ohne Status');
  if (!nodeAreas(node).length) reasons.push('ohne Thema');
  if (unresolvedCounts.has(node.id)) reasons.push(`${unresolvedCounts.get(node.id)} unaufgelöste Links`);
  return reasons.join(' · ');
}

function renderCareList(container, summary, nodes, description, detail) {
  summary.textContent = `${nodes.length} Zettel ${description}`;
  if (!nodes.length) {
    const empty = document.createElement('p');
    empty.className = 'news-empty';
    empty.textContent = 'Keine Einträge.';
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(...nodes.map((node) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'care-item';
    const title = document.createElement('span');
    title.className = 'care-item-title';
    title.textContent = node.title;
    const meta = document.createElement('span');
    meta.className = 'care-item-meta';
    meta.textContent = `${detail(node)} · ${node.vault}`;
    button.append(title, meta);
    button.addEventListener('click', () => openReader(node));
    return button;
  }));
}

function updateFilterCounts(query) {
  const candidates = query ? graph.nodes.filter((node) => searchable(node).includes(query)) : graph.nodes;
  for (const filter of filters) {
    const matches = candidates.filter(filter.matches);
    const detail = typeof filter.detail === 'function' ? filter.detail(matches) : filter.detail;
    const button = document.querySelector(`.stat-filter[data-filter-id="${CSS.escape(filter.id)}"]`);
    if (button) button.textContent = `${matches.length} ${filter.label}${detail ? ` · ${detail}` : ''}`;
  }
}

function renderResults(matches, activeId) {
  elements.results.replaceChildren(...matches.map((node) => {
    const result = elements.resultTemplate.content.firstElementChild.cloneNode(true);
    result.querySelector('.result-title').textContent = node.title;
    result.querySelector('.result-meta').textContent = `${node.vault} · ${node.path}`;
    result.setAttribute('aria-pressed', String(node.id === activeId));
    result.addEventListener('click', () => openReader(node));
    return result;
  }));
}

function makeAdjacency(edges) {
  const map = new Map();
  for (const edge of edges) {
    if (!edge.target) continue;
    for (const [from, to] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      const neighbors = map.get(from) ?? new Set();
      neighbors.add(to);
      map.set(from, neighbors);
    }
  }
  return map;
}

function expand(seedIds, depth) {
  const seen = new Map(seedIds.map((id) => [id, { level: 0, parent: null }]));
  const rankedNeighbors = (id) => [...(adjacency.get(id) ?? [])].sort((left, right) => {
    const degree = (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0);
    return degree || nodesById.get(left).title.localeCompare(nodesById.get(right).title, 'de');
  });
  const queue = [...seen].map(([id, value]) => ({ id, level: value.level }));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { id, level } = queue[cursor];
    if (level === depth) continue;
    const neighbors = rankedNeighbors(id);
    for (const neighbor of neighbors) {
      if (seen.has(neighbor)) continue;
      seen.set(neighbor, { level: level + 1, parent: id });
      queue.push({ id: neighbor, level: level + 1 });
    }
  }
  const result = [...seen].slice(0, DISPLAY_LIMIT).map(([id, value]) => ({ id, ...value }));
  result.total = seen.size;
  return result;
}

function focusGraph(node, remember = true) {
  if (remember && activeSeedId && activeSeedId !== node.id) graphHistory.push(activeSeedId);
  elements.search.value = '';
  activeFilterId = null;
  activeSeedId = node.id;
  selectEnvironment(environmentIndex);
}

function renderGraphList(nodes, edges, expansion) {
  const levels = new Map(expansion.map(entry => [entry.id, entry.level]));
  document.querySelector('#graph-node-list').replaceChildren(...nodes.map(node => {
    const row = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `${node.title} · ${node.vault} · Distanz ${levels.get(node.id)}`;
    const focus = document.createElement('button'); focus.type = 'button'; focus.textContent = 'Hier weiter erkunden';
    focus.addEventListener('click', () => focusGraph(node));
    const read = document.createElement('button'); read.type = 'button'; read.textContent = 'Zettel lesen'; read.addEventListener('click', () => openReader(node));
    const list = document.createElement('ul');
    for (const edge of edges.filter(edge => edge.source === node.id || edge.target === node.id)) {
      const item = document.createElement('li');
      item.textContent = `${nodesById.get(edge.source).title} → ${nodesById.get(edge.target).title} · ${edge.kinds.join(' + ')} · ${edge.weight} Linkvorkommen`;
      list.append(item);
    }
    row.append(summary, focus, read, list); return row;
  }));
}

function openMarkerContextMenu(event) {
  if (!currentNote || event.target.closest('pre, code')) return;
  const selection = window.getSelection();
  let target = null;
  if (selection && !selection.isCollapsed && elements.noteContent.contains(selection.anchorNode) && elements.noteContent.contains(selection.focusNode)) {
    const candidate = markerTargetFromRange(selection.getRangeAt(0), selection.toString());
    if (candidate && pointTouchesTarget(candidate, event.clientX, event.clientY)) target = candidate;
  }
  if (!target && lastReaderSelection && pointTouchesTarget(lastReaderSelection, event.clientX, event.clientY)) target = lastReaderSelection;
  if (!target) target = markerTargetFromPoint(event.clientX, event.clientY);
  if (!target) return;

  event.preventDefault();
  selectedReaderTarget = target;
  elements.markerContextTarget.textContent = target.text ? `„${truncate(target.text, 72)}“` : 'An dieser Textstelle';
  elements.markerContextStatus.textContent = '';
  elements.markerContextMenu.hidden = false;
  const rectangle = elements.markerContextMenu.getBoundingClientRect();
  const anchor = event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : target.rectangle;
  elements.markerContextMenu.style.left = `${Math.max(8, Math.min(anchor.x, window.innerWidth - rectangle.width - 8))}px`;
  elements.markerContextMenu.style.top = `${Math.max(8, Math.min(anchor.y, window.innerHeight - rectangle.height - 8))}px`;
  elements.markerContextButtons.querySelector('button')?.focus();
}

function markerTargetFromRange(range, selectedText) {
  const fragments = [...elements.noteContent.querySelectorAll('.source-fragment')].filter((fragment) => {
    try { return range.intersectsNode(fragment); } catch { return false; }
  });
  if (!fragments.length) return null;
  const first = fragments[0];
  const last = fragments.at(-1);
  const start = sourceBoundary(first, range.startContainer, range.startOffset, false);
  const end = sourceBoundary(last, range.endContainer, range.endOffset, true);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return null;
  const rectangle = range.getBoundingClientRect();
  const rectangles = [...range.getClientRects()].map((item) => ({ left: item.left, right: item.right, top: item.top, bottom: item.bottom }));
  return {
    start,
    end,
    text: selectedText.replace(/\s+/g, ' ').trim(),
    rectangle: { x: rectangle.left, y: rectangle.bottom, left: rectangle.left, right: rectangle.right, top: rectangle.top, bottom: rectangle.bottom },
    rectangles
  };
}

function rememberReaderSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !elements.noteContent.contains(selection.anchorNode) || !elements.noteContent.contains(selection.focusNode)) return;
  lastReaderSelection = markerTargetFromRange(selection.getRangeAt(0), selection.toString());
}

function pointTouchesTarget(target, x, y) {
  const rectangles = target?.rectangles?.length ? target.rectangles : target?.rectangle ? [target.rectangle] : [];
  return rectangles.some((rectangle) => x >= rectangle.left - 2 && x <= rectangle.right + 2 && y >= rectangle.top - 2 && y <= rectangle.bottom + 2);
}

function sourceBoundary(fragment, container, offset, endBoundary) {
  const start = Number(fragment.dataset.sourceStart);
  const end = Number(fragment.dataset.sourceEnd);
  if (fragment.dataset.sourceAtomic === 'true') return endBoundary ? end : start;
  if (container.nodeType === Node.TEXT_NODE && fragment.contains(container)) return Math.min(end, start + offset);
  return endBoundary ? end : start;
}

function markerTargetFromPoint(x, y) {
  const caret = document.caretPositionFromPoint?.(x, y);
  const fallback = !caret ? document.caretRangeFromPoint?.(x, y) : null;
  const node = caret?.offsetNode ?? fallback?.startContainer;
  const offset = caret?.offset ?? fallback?.startOffset;
  if (!node || !Number.isInteger(offset)) return null;
  const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  const fragment = parent?.closest?.('.source-fragment');
  if (!fragment || !elements.noteContent.contains(fragment)) return null;

  const sourceStart = Number(fragment.dataset.sourceStart);
  const sourceEnd = Number(fragment.dataset.sourceEnd);
  if (fragment.dataset.sourceAtomic === 'true' || node.nodeType !== Node.TEXT_NODE) {
    selectDomContents(fragment);
    const rectangle = fragment.getBoundingClientRect();
    return { start: sourceStart, end: sourceEnd, text: fragment.textContent.trim(), rectangle: { x: rectangle.left, y: rectangle.bottom }, rectangles: [{ left: rectangle.left, right: rectangle.right, top: rectangle.top, bottom: rectangle.bottom }] };
  }

  const text = node.textContent;
  let start = Math.min(offset, text.length);
  let end = start;
  const isWordCharacter = (character) => /[\p{L}\p{N}_-]/u.test(character ?? '');
  if (isWordCharacter(text[start]) || isWordCharacter(text[start - 1])) {
    if (!isWordCharacter(text[start]) && isWordCharacter(text[start - 1])) start -= 1;
    end = start + 1;
    while (start > 0 && isWordCharacter(text[start - 1])) start -= 1;
    while (end < text.length && isWordCharacter(text[end])) end += 1;
  }
  selectDomText(node, start, end);
  const range = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
  const rectangle = range?.getBoundingClientRect() ?? fragment.getBoundingClientRect();
  return { start: sourceStart + start, end: sourceStart + end, text: text.slice(start, end), rectangle: { x: rectangle.left, y: rectangle.bottom }, rectangles: [{ left: rectangle.left, right: rectangle.right, top: rectangle.top, bottom: rectangle.bottom }] };
}

function selectDomContents(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectDomText(node, start, end) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function closeMarkerContextMenu() {
  elements.markerContextMenu.hidden = true;
  elements.markerContextStatus.textContent = '';
}

function hideMarkerSelection() {
  selectedReaderTarget = null;
  lastReaderSelection = null;
  closeMarkerContextMenu();
}

function renderMarkerButtons() {
  elements.markerContextButtons.replaceChildren(...MARKERS.map((marker) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker-context-button';
    button.setAttribute('role', 'menuitem');
    const code = document.createElement('code');
    code.textContent = marker.value;
    const label = document.createElement('span');
    label.textContent = marker.label;
    button.title = marker.description;
    button.append(code, label);
    button.addEventListener('click', () => prepareMarkerForSelection(marker.value));
    return button;
  }));
}

function prepareMarkerForSelection(marker) {
  if (!currentNote || !selectedReaderTarget) return;
  if (markerAlreadyFollows(currentNote.content, selectedReaderTarget, marker)) {
    elements.markerContextStatus.textContent = `${marker} steht bereits direkt hinter dieser Stelle.`;
    return;
  }
  elements.noteEditor.value = insertMarkerAtTarget(currentNote.content, selectedReaderTarget, marker);
  editDirty = true;
  pendingSaveReason = `Marker ${marker} im Lesemodus gesetzt`;
  const targetLabel = selectedReaderTarget.text ? `„${selectedReaderTarget.text}“` : 'Textstelle';
  elements.markerPreviewSource.textContent = `${marker} · ${targetLabel}`;
  elements.markerChangeDiff.textContent = makeChangeDiff(currentNote.content, elements.noteEditor.value);
  elements.markerPreview.hidden = false;
  closeMarkerContextMenu();
  elements.markerPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function truncate(text, maximum) {
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

function cancelMarkerSelection() {
  elements.markerPreview.hidden = true;
  elements.noteEditor.value = currentNote?.content ?? '';
  editDirty = false;
  selectedReaderTarget = null;
  closeMarkerContextMenu();
  pendingSaveReason = 'Manuelle Änderung im Zettelkasten-Editor';
}

async function openNote(node) {
  if (editDirty && !window.confirm('Ungespeicherte Änderungen verwerfen und einen Zettel öffnen?')) return;
  elements.noteVault.textContent = `Quelle ${node.vault}`;
  elements.noteTitle.textContent = node.title;
  elements.notePath.textContent = node.path;
  elements.noteContent.textContent = 'Zettel wird geladen …';
  elements.noteMetadata.replaceChildren();
  elements.reader.hidden = false;
  elements.explorationShell.classList.add('has-reader');
  elements.reader.setAttribute('aria-busy', 'true');
  setReaderMode('read');
  hideMarkerSelection();
  elements.markerPreview.hidden = true;
  elements.reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const note = await fetch(`/api/note?id=${encodeURIComponent(node.id)}`).then(readJson);
    currentNote = note;
    renderMetadata(note);
    renderNoteContent(note.content, note.vault);
  } catch (error) {
    elements.noteContent.textContent = `Zettel konnte nicht geladen werden: ${error.message}`;
  } finally {
    elements.reader.removeAttribute('aria-busy');
  }
}

async function openReaderFromUrl() {
  const node = readerNoteId ? nodesById.get(readerNoteId) : null;
  if (node) { activeSeedId = node.id; return openNote(node); }
  elements.reader.hidden = false;
  elements.explorationShell.classList.add('has-reader');
  elements.noteTitle.textContent = 'Zettel nicht gefunden';
  elements.noteContent.textContent = 'Der angeforderte Zettel ist im aktuellen Index nicht vorhanden.';
}

function openReader(node) {
  if (editDirty && !window.confirm('Ungespeicherte Änderungen verwerfen und einen anderen Zettel öffnen?')) return;
  window.location.assign(`/lesen?id=${encodeURIComponent(node.id)}`);
}

function closeReader() {
  if (editDirty && !window.confirm('Ungespeicherte Änderungen verwerfen und den Leseraum schließen?')) return;
  if (readerPage) { window.location.assign('/#rabbit-hole'); return; }
  setReaderMode('read');
  currentNote = null;
  elements.reader.hidden = true;
  elements.explorationShell.classList.remove('has-reader');
}

function setReaderMode(mode) {
  const editing = mode === 'edit';
  elements.readerMode.textContent = editing ? 'Bearbeitungsmodus' : 'Lesemodus';
  elements.editNote.hidden = editing;
  elements.noteContent.hidden = editing;
  elements.editorPanel.hidden = !editing;
  if (!editing) {
    editDirty = false;
    elements.changePreview.hidden = true;
    elements.editorStatus.textContent = '';
  }
}

function startEditing() {
  if (!currentNote) return;
  elements.noteEditor.value = currentNote.content;
  elements.noteEditor.selectionStart = elements.noteEditor.selectionEnd = elements.noteEditor.value.length;
  elements.previewSource.textContent = `${currentNote.vault} · ${currentNote.path}`;
  setReaderMode('edit');
  elements.noteEditor.focus();
}

function cancelEditing() {
  if (editDirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return;
  setReaderMode('read');
}

function insertAddMarker() {
  if (!currentNote) return;
  if (/(^|[^\p{L}\p{N}_])@add(?![\p{L}\p{N}_-])/u.test(elements.noteEditor.value)) {
    elements.editorStatus.textContent = '@add ist in diesem Zettel bereits gesetzt.';
    return;
  }
  const position = elements.noteEditor.selectionStart;
  const before = elements.noteEditor.value.slice(0, position);
  const after = elements.noteEditor.value.slice(position);
  const insertion = `${before && !/\s$/.test(before) ? ' ' : ''}@add${after && !/^\s/.test(after) ? ' ' : ''}`;
  elements.noteEditor.setRangeText(insertion, position, position, 'end');
  elements.noteEditor.dispatchEvent(new Event('input', { bubbles: true }));
  elements.editorStatus.textContent = '@add wurde an der Cursorposition eingefügt. Bitte Änderung prüfen.';
  elements.noteEditor.focus();
}

function showChangePreview() {
  if (!currentNote || elements.noteEditor.value === currentNote.content) {
    elements.editorStatus.textContent = 'Es gibt noch keine Änderung zum Prüfen.';
    elements.changePreview.hidden = true;
    return;
  }
  elements.previewSource.textContent = `${currentNote.vault} · ${currentNote.path}`;
  elements.changeDiff.textContent = makeChangeDiff(currentNote.content, elements.noteEditor.value);
  elements.changePreview.hidden = false;
  elements.editorStatus.textContent = 'Vorschau erstellt. Erst die Bestätigung schreibt in den Vault.';
  elements.changePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function makeChangeDiff(previous, next) {
  const before = previous.replace(/\r\n/g, '\n').split('\n');
  const after = next.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1;
  let beforeEnd = before.length - 1;
  let afterEnd = after.length - 1;
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) { beforeEnd -= 1; afterEnd -= 1; }
  const contextStart = Math.max(0, start - 2);
  const contextEndBefore = Math.min(before.length, beforeEnd + 3);
  const contextEndAfter = Math.min(after.length, afterEnd + 3);
  const lines = [];
  if (contextStart > 0) lines.push('  …');
  for (let index = contextStart; index < start; index += 1) lines.push(`  ${before[index]}`);
  for (let index = start; index <= beforeEnd; index += 1) lines.push(`− ${before[index]}`);
  for (let index = start; index <= afterEnd; index += 1) lines.push(`+ ${after[index]}`);
  const sharedTail = after.slice(afterEnd + 1, contextEndAfter);
  lines.push(...sharedTail.map((line) => `  ${line}`));
  if (contextEndBefore < before.length || contextEndAfter < after.length) lines.push('  …');
  return lines.join('\n');
}

async function saveCurrentNote() {
  if (!currentNote || (elements.changePreview.hidden && elements.markerPreview.hidden)) return;
  elements.confirmSave.disabled = true;
  elements.confirmMarker.disabled = true;
  elements.editorStatus.textContent = 'Bestätigte Änderung wird geschrieben …';
  try {
    const saved = await fetch('/api/note', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        noteId: currentNote.id,
        content: elements.noteEditor.value,
        expectedRevision: currentNote.revision,
        reason: pendingSaveReason,
        confirmed: true
      })
    }).then(readJson);
    currentNote = saved;
    renderMetadata(saved);
    renderNoteContent(saved.content, saved.vault);
    setReaderMode('read');
    elements.markerPreview.hidden = true;
    pendingSaveReason = 'Manuelle Änderung im Zettelkasten-Editor';
    await loadGraph();
    activeSeedId = saved.id;
    updateView();
  } catch (error) {
    elements.editorStatus.textContent = `Änderung nicht gespeichert: ${error.message}`;
  } finally {
    elements.confirmSave.disabled = false;
    elements.confirmMarker.disabled = false;
  }
}

function renderMetadata(note) {
  const markerSummary = note.markers.length ? `${note.markers.join(', ')} (${note.markerCount} Vorkommen)` : null;
  const fields = [['Hinzugefügt', note.created], ['Area', note.area], ['Typ', note.type], ['Status', note.status], ['Tags', note.tags.join(', ') || null], ['@-Marker', markerSummary]];
  elements.noteMetadata.replaceChildren(...fields.filter(([, value]) => value).flatMap(([label, value]) => {
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value;
    return [term, description];
  }));
}

function renderNoteContent(content, vault) {
  elements.noteContent.replaceChildren();
  renderMarkerButtons();
  if (!content?.trim()) {
    const empty = document.createElement('p');
    empty.className = 'empty-note';
    empty.textContent = 'Dieser Raum ist noch leer.';
    elements.noteContent.append(empty);
    return;
  }

  const normalizedContent = content.replace(/\r\n/g, '\n');
  let nextLineStart = 0;
  const lines = normalizedContent.split('\n').map((text) => {
    const line = { text, start: nextLineStart };
    nextLineStart += text.length + 1;
    return line;
  });
  let paragraph = [];
  let list = null;
  let code = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const element = document.createElement('p');
    paragraph.forEach((part, index) => {
      if (index) element.append(document.createTextNode(' '));
      appendInlineContent(element, part.text, vault, part.start);
    });
    elements.noteContent.append(element);
    paragraph = [];
  };
  const flushList = () => { list = null; };
  const flushCode = () => {
    if (!code) return;
    const pre = document.createElement('pre');
    const element = document.createElement('code');
    element.textContent = code.lines.map((line) => line.text).join('\n');
    pre.append(element);
    elements.noteContent.append(pre);
    code = null;
  };

  for (const { text: line, start: lineStart } of lines) {
    if (line.startsWith('```')) {
      flushParagraph(); flushList();
      if (code) flushCode(); else code = { lines: [] };
      continue;
    }
    if (code) { code.lines.push({ text: line, start: lineStart }); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(); flushList();
      const element = document.createElement(`h${Math.min(heading[1].length + 2, 6)}`);
      appendInlineContent(element, heading[2], vault, lineStart + heading[1].length + 1);
      elements.noteContent.append(element);
      continue;
    }
    const item = line.match(/^\s*(?:([-*])|(\d+)\.)\s+(.+)$/);
    if (item) {
      flushParagraph();
      const tag = item[2] ? 'ol' : 'ul';
      if (!list || list.tagName.toLocaleLowerCase('de') !== tag) {
        list = document.createElement(tag);
        elements.noteContent.append(list);
      }
      const element = document.createElement('li');
      appendInlineContent(element, item[3], vault, lineStart + line.indexOf(item[3]));
      list.append(element);
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(); flushList();
      const element = document.createElement('blockquote');
      appendInlineContent(element, quote[1], vault, lineStart + line.indexOf(quote[1]));
      elements.noteContent.append(element);
      continue;
    }
    if (list?.lastElementChild) {
      list.lastElementChild.append(document.createTextNode(' '));
      appendInlineContent(list.lastElementChild, line.trim(), vault, lineStart + line.indexOf(line.trim()));
      continue;
    }
    paragraph.push({ text: line.trim(), start: lineStart + line.indexOf(line.trim()) });
  }
  flushParagraph();
  flushCode();
}

function appendInlineContent(parent, text, vault, sourceStart) {
  const pattern = /(!?\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    appendSourceFragment(parent, text.slice(cursor, match.index), sourceStart + cursor);
    const token = match[0];
    if (token.includes('[[')) {
      const raw = token.replace(/^!?\[\[/, '').replace(/\]\]$/, '');
      const [targetText, label] = raw.split('|');
      const target = findLinkedNode(targetText, vault);
      const element = document.createElement(target ? 'button' : 'span');
      element.className = target ? 'wiki-link' : 'unresolved-link';
      element.textContent = label ?? targetText.split('#')[0];
      markSourceFragment(element, sourceStart + match.index, sourceStart + match.index + token.length, true);
      if (target) {
        element.type = 'button';
        element.addEventListener('click', () => openReader(target));
      }
      parent.append(element);
    } else if (token.startsWith('**')) {
      const element = document.createElement('strong');
      appendInlineContent(element, token.slice(2, -2), vault, sourceStart + match.index + 2);
      parent.append(element);
    } else if (token.startsWith('*')) {
      const element = document.createElement('em');
      appendInlineContent(element, token.slice(1, -1), vault, sourceStart + match.index + 1);
      parent.append(element);
    } else {
      const element = document.createElement('code');
      element.textContent = token.slice(1, -1);
      markSourceFragment(element, sourceStart + match.index, sourceStart + match.index + token.length, true);
      parent.append(element);
    }
    cursor = match.index + token.length;
  }
  appendSourceFragment(parent, text.slice(cursor), sourceStart + cursor);
}

function appendSourceFragment(parent, text, sourceStart) {
  if (!text) return;
  const fragment = document.createElement('span');
  fragment.className = 'source-fragment';
  fragment.textContent = text;
  markSourceFragment(fragment, sourceStart, sourceStart + text.length, false);
  parent.append(fragment);
}

function markSourceFragment(element, sourceStart, sourceEnd, atomic) {
  element.classList.add('source-fragment');
  element.dataset.sourceStart = String(sourceStart);
  element.dataset.sourceEnd = String(sourceEnd);
  element.dataset.sourceAtomic = String(atomic);
}

function findLinkedNode(rawTarget, vault) {
  const reference = normalizeReference(rawTarget);
  const matches = graph.nodes.filter((node) => [node.title, node.path.replace(/\.md$/i, ''), ...node.aliases]
    .some((value) => normalizeReference(value) === reference));
  return matches.find((node) => node.vault === vault) ?? matches[0] ?? null;
}

function normalizeReference(value) {
  return String(value).split('#')[0].trim().replace(/\\/g, '/').split('/').at(-1).toLocaleLowerCase('de');
}

function enterNode(node) {
  openReader(node);
}

class GraphCanvas {
  constructor(canvas, onSelect) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.onSelect = onSelect;
    this.nodes = [];
    this.edges = [];
    this.seeds = new Set();
    this.levels = new Map();
    this.parents = new Map();
    this.layout = new Map();
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.hoveredId = null;
    this.keyboardId = null;
    this.drag = null;
    this.neighbors = new Map();
    new ResizeObserver(() => this.draw()).observe(canvas);
    canvas.addEventListener('pointerdown', (event) => this.startDrag(event));
    canvas.addEventListener('pointermove', (event) => this.movePointer(event));
    canvas.addEventListener('pointerup', (event) => this.endDrag(event));
    canvas.addEventListener('pointercancel', () => this.cancelDrag());
    canvas.addEventListener('pointerleave', () => { if (!this.drag) { this.hoveredId = null; this.draw(); } });
    canvas.addEventListener('keydown', (event) => {
      const moves = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] };
      if (moves[event.key]) {
        event.preventDefault();
        if (event.shiftKey) { this.pan.x += moves[event.key][0]; this.pan.y += moves[event.key][1]; this.draw(); }
        else this.moveKeyboardFocus(event.key);
      }
      if (event.key === 'Enter' && this.keyboardId) {
        event.preventDefault();
        const selected = this.nodes.find((node) => node.id === this.keyboardId);
        if (selected) this.onSelect(selected);
      }
      if (event.key === 'Escape') { event.preventDefault(); this.keyboardId = null; this.updateKeyboardDescription(); this.draw(); }
    });
  }

  render(nodes, edges, seeds, levels, parents) {
    const signature = JSON.stringify([nodes.map(node => node.id), edges, seeds]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.hoveredId = null;
    this.nodes = nodes;
    this.edges = edges;
    this.seeds = new Set(seeds);
    this.levels = levels;
    this.parents = parents;
    this.neighbors = makeAdjacency(edges);
    this.makeLayout();
    this.keyboardId = this.nodes.some((node) => node.id === this.keyboardId) ? this.keyboardId : [...this.seeds][0] ?? null;
    this.updateKeyboardDescription();
    this.resetView();
  }

  updateKeyboardDescription() {
    const selected = this.nodes.find((node) => node.id === this.keyboardId);
    const selectedText = selected ? ` Ausgewählt: ${selected.title}.` : '';
    this.canvas.setAttribute('aria-label', `Wissensgraph.${selectedText} Pfeiltasten wählen einen nahegelegenen Raum, Enter setzt ihn als Mittelpunkt, Umschalt plus Pfeiltasten verschiebt die Ansicht.`);
  }

  moveKeyboardFocus(key) {
    const vectors = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const entries = this.renderedEntries ?? this.screenEntries();
    if (!entries.length) return;
    const current = entries.find((entry) => entry.node.id === this.keyboardId) ?? entries.find((entry) => this.seeds.has(entry.node.id)) ?? entries[0];
    const [vectorX, vectorY] = vectors[key];
    const candidate = entries
      .filter((entry) => entry.node.id !== current.node.id)
      .map((entry) => {
        const deltaX = entry.x - current.x;
        const deltaY = entry.y - current.y;
        const forward = deltaX * vectorX + deltaY * vectorY;
        const sideways = Math.abs(deltaX * vectorY - deltaY * vectorX);
        return { entry, forward, score: sideways * 2 + forward };
      })
      .filter(({ forward }) => forward > 4)
      .sort((left, right) => left.score - right.score || left.forward - right.forward)[0]?.entry;
    if (!candidate) return;
    this.keyboardId = candidate.node.id;
    this.updateKeyboardDescription();
    this.draw();
  }

  makeLayout() {
    const children = new Map();
    for (const node of this.nodes) {
      const parent = this.parents.get(node.id);
      if (!parent) continue;
      const entries = children.get(parent) ?? [];
      entries.push(node.id); children.set(parent, entries);
    }
    this.layout = new Map();
    const weight = id => Math.max(1, (children.get(id) ?? []).reduce((sum, child) => sum + weight(child), 0));
    const place = (id, start, end) => {
      const level = this.levels.get(id) ?? 0;
      const angle = (start + end) / 2;
      const ring = level === 0 ? 0 : 145 + (level - 1) * 142;
      this.layout.set(id, { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring });
      const descendants = children.get(id) ?? [];
      const total = descendants.reduce((sum, child) => sum + weight(child), 0);
      let cursor = start;
      for (const child of descendants) {
        const next = cursor + (end - start) * weight(child) / total;
        place(child, cursor, next); cursor = next;
      }
    };
    for (const seed of this.seeds) place(seed, -Math.PI / 2, Math.PI * 1.5);
  }

  screenEntries() {
    const bounds = this.canvas.getBoundingClientRect();
    return this.nodes.map((node) => {
      const point = this.layout.get(node.id) ?? { x: 0, y: 0 };
      const level = this.levels.get(node.id) ?? 0;
      const degree = this.neighbors.get(node.id)?.size ?? 0;
      return {
        node,
        level,
        x: bounds.width / 2 + this.pan.x + point.x * this.zoom,
        y: bounds.height / 2 + this.pan.y + point.y * this.zoom,
        radius: (this.seeds.has(node.id) ? 10 : 5.5 + Math.min(4, Math.log2(degree + 1)))
      };
    });
  }

  resetView() {
    const bounds = this.canvas.getBoundingClientRect();
    const furthest = Math.max(145, ...[...this.layout.values()].map(({ x, y }) => Math.hypot(x, y)));
    this.zoom = Math.max(.1, Math.min(2.8, Math.min(bounds.width / 2 - 175, bounds.height / 2 - 90) / furthest));
    this.pan = { x: 0, y: 0 };
    this.draw();
  }

  zoomBy(factor, anchor = null) {
    const bounds = this.canvas.getBoundingClientRect();
    const focus = anchor ?? { x: bounds.width / 2, y: bounds.height / 2 };
    const previous = this.zoom;
    this.zoom = Math.max(.1, Math.min(2.8, this.zoom * factor));
    const ratio = this.zoom / previous;
    this.pan.x = focus.x - bounds.width / 2 - (focus.x - bounds.width / 2 - this.pan.x) * ratio;
    this.pan.y = focus.y - bounds.height / 2 - (focus.y - bounds.height / 2 - this.pan.y) * ratio;
    this.draw();
  }

  hitTest(event) {
    const bounds = this.canvas.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const entries = this.renderedEntries ?? this.screenEntries();
    const labels = this.renderedLabels ?? this.placeLabels(entries, bounds);
    return [...entries].reverse().find((entry) => {
      const label = labels.get(entry.node.id);
      return Math.hypot(x - entry.x, y - entry.y) <= entry.radius + 7
        || (x >= label.x && x <= label.x + label.width && y >= label.y && y <= label.y + label.height);
    }) ?? null;
  }

  startDrag(event) {
    this.canvas.setPointerCapture(event.pointerId);
    this.drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    this.canvas.classList.add('is-dragging');
  }

  movePointer(event) {
    if (this.drag) {
      const deltaX = event.clientX - this.drag.x;
      const deltaY = event.clientY - this.drag.y;
      this.drag.x = event.clientX; this.drag.y = event.clientY;
      if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) > 4) this.drag.moved = true;
      this.pan.x += deltaX; this.pan.y += deltaY;
      this.draw();
      return;
    }
    const hit = this.hitTest(event);
    const nextId = hit?.node.id ?? null;
    if (nextId !== this.hoveredId) { this.hoveredId = nextId; this.draw(); }
    this.canvas.style.cursor = hit ? 'pointer' : 'grab';
    this.canvas.title = hit?.node.title ?? '';
  }

  endDrag(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const wasMoved = this.drag.moved;
    this.cancelDrag();
    if (!wasMoved) {
      const hit = this.hitTest(event);
      if (hit) { this.keyboardId = hit.node.id; this.onSelect(hit.node); }
    }
  }

  cancelDrag() {
    this.drag = null;
    this.canvas.classList.remove('is-dragging');
  }

  labelLines(title) {
    const words = title.trim().split(/\s+/).flatMap((word) => {
      if (this.context.measureText(word).width <= 148) return [word];
      const chunks = [];
      let chunk = '';
      for (const character of word) {
        if (chunk && this.context.measureText(chunk + character).width > 148) { chunks.push(chunk); chunk = character; }
        else chunk += character;
      }
      if (chunk) chunks.push(chunk);
      return chunks;
    });
    const lines = [];
    let line = '';
    for (const word of words) {
      if (!line) { line = word; continue; }
      if (this.context.measureText(`${line} ${word}`).width <= 148) line += ` ${word}`;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines.length ? lines : ['Unbenannter Raum'];
  }

  labelGeometry(entry) {
    this.context.font = `${this.seeds.has(entry.node.id) ? 650 : 560} 11px Inter, system-ui, sans-serif`;
    const lines = this.labelLines(entry.node.title);
    const width = Math.min(164, Math.max(62, ...lines.map((line) => this.context.measureText(line).width + 16)));
    const height = lines.length * 14 + 10;
    const worldPoint = this.layout.get(entry.node.id) ?? { x: 0 };
    const opensLeft = worldPoint.x < -20;
    const x = opensLeft ? entry.x - entry.radius - width - 7 : entry.x + entry.radius + 7;
    return { x, y: entry.y - height / 2, width, height, lines };
  }

  placeLabels(entries, bounds) {
    const placed = new Map();
    const occupied = entries.map((entry) => ({
      x: entry.x - entry.radius - 4,
      y: entry.y - entry.radius - 4,
      width: entry.radius * 2 + 8,
      height: entry.radius * 2 + 8,
      nodeId: entry.node.id
    }));
    const collides = (candidate, nodeId) => occupied.some((rect) => rect.nodeId !== nodeId
      && candidate.x < rect.x + rect.width + 3 && candidate.x + candidate.width + 3 > rect.x
      && candidate.y < rect.y + rect.height + 3 && candidate.y + candidate.height + 3 > rect.y);
    const order = [...entries].sort((left, right) => {
      const seedOrder = Number(this.seeds.has(right.node.id)) - Number(this.seeds.has(left.node.id));
      return seedOrder || left.y - right.y;
    });
    for (const entry of order) {
      const base = this.labelGeometry(entry);
      if (this.seeds.has(entry.node.id)) {
        const chosen = { ...base, x: Math.max(6, Math.min(bounds.width - base.width - 6, base.x)), y: Math.max(6, Math.min(bounds.height - base.height - 6, base.y)) };
        placed.set(entry.node.id, chosen);
        occupied.push({ ...chosen, nodeId: entry.node.id });
        continue;
      }
      const oppositeX = base.x > entry.x
        ? entry.x - entry.radius - base.width - 7
        : entry.x + entry.radius + 7;
      const offsets = [0];
      for (let distance = 18; distance <= 216; distance += 18) offsets.push(-distance, distance);
      let chosen = null;
      for (const x of [base.x, oppositeX]) {
        for (const offset of offsets) {
          const candidate = {
            ...base,
            x: Math.max(6, Math.min(bounds.width - base.width - 6, x)),
            y: Math.max(6, Math.min(bounds.height - base.height - 6, base.y + offset))
          };
          if (!collides(candidate, entry.node.id)) { chosen = candidate; break; }
        }
        if (chosen) break;
      }
      chosen ??= { ...base, x: Math.max(6, Math.min(bounds.width - base.width - 6, base.x)), y: Math.max(6, Math.min(bounds.height - base.height - 6, base.y)) };
      placed.set(entry.node.id, chosen);
      occupied.push({ ...chosen, nodeId: entry.node.id });
    }
    return placed;
  }

  roundedRect(x, y, width, height, radius = 7) {
    this.context.beginPath();
    this.context.roundRect(x, y, width, height, radius);
  }

  draw() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width) return;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = bounds.width * ratio; this.canvas.height = bounds.height * ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0); this.context.clearRect(0, 0, bounds.width, bounds.height);
    if (!this.nodes.length) {
      this.renderedEntries = []; this.renderedLabels = new Map();
      this.context.fillStyle = '#5f6b62'; this.context.font = '500 16px Inter, system-ui, sans-serif'; this.context.textAlign = 'center';
      this.context.fillText('Dein Rabbit Hole beginnt mit einem Gedanken.', bounds.width / 2, bounds.height / 2 - 5);
      this.context.fillStyle = '#89938a'; this.context.font = '14px Inter, system-ui, sans-serif';
      this.context.fillText('Jeder Raum führt zu neuen Abzweigungen.', bounds.width / 2, bounds.height / 2 + 24);
      return;
    }
    const positions = this.screenEntries();
    const labels = this.placeLabels(positions, bounds);
    this.renderedEntries = positions;
    this.renderedLabels = labels;
    const maxLevel = Math.max(...positions.map((entry) => entry.level));
    const centerX = bounds.width / 2 + this.pan.x;
    const centerY = bounds.height / 2 + this.pan.y;
    this.context.save();
    this.context.setLineDash([2, 7]);
    this.context.strokeStyle = '#cfdacf'; this.context.lineWidth = 1;
    for (let level = 1; level <= maxLevel; level += 1) {
      const ring = (145 + (level - 1) * 142) * this.zoom;
      this.context.beginPath(); this.context.arc(centerX, centerY, ring, 0, Math.PI * 2); this.context.stroke();
    }
    this.context.restore();
    const byId = new Map(positions.map((entry) => [entry.node.id, entry]));
    const focusId = this.hoveredId ?? this.keyboardId;
    const focusIds = focusId ? new Set([focusId, ...(this.neighbors.get(focusId) ?? [])]) : null;
    for (const edge of this.edges) {
      const source = byId.get(edge.source); const target = byId.get(edge.target);
      if (!source || !target) continue;
      const emphasized = focusId && (source.node.id === focusId || target.node.id === focusId);
      this.context.save();
      this.context.globalAlpha = emphasized ? .9 : edge.tree ? .68 : .11;
      this.context.strokeStyle = edge.kinds.includes('related') ? '#b77b55' : '#8da397';
      this.context.lineWidth = 1 + Math.min(2.2, Math.log2(edge.weight + 1));
      if (edge.kinds.includes('related')) this.context.setLineDash([5, 5]);
      this.context.beginPath(); this.context.moveTo(source.x, source.y); this.context.lineTo(target.x, target.y); this.context.stroke();
      this.context.setLineDash([]);
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const arrowX = target.x - Math.cos(angle) * (target.radius + 4);
      const arrowY = target.y - Math.sin(angle) * (target.radius + 4);
      this.context.fillStyle = this.context.strokeStyle;
      this.context.beginPath();
      this.context.moveTo(arrowX, arrowY);
      this.context.lineTo(arrowX - Math.cos(angle - .52) * 7, arrowY - Math.sin(angle - .52) * 7);
      this.context.lineTo(arrowX - Math.cos(angle + .52) * 7, arrowY - Math.sin(angle + .52) * 7);
      this.context.closePath(); this.context.fill();
      this.context.restore();
    }
    for (const entry of positions) {
      const emphasized = !focusIds || focusIds.has(entry.node.id);
      const label = labels.get(entry.node.id);
      this.context.save();
      this.context.globalAlpha = emphasized ? 1 : .24;
      const labelCenterX = label.x + label.width / 2;
      const labelCenterY = label.y + label.height / 2;
      if (Math.hypot(labelCenterX - entry.x, labelCenterY - entry.y) > label.width / 2 + 22) {
        this.context.strokeStyle = '#aebdaf'; this.context.lineWidth = .8;
        this.context.beginPath(); this.context.moveTo(entry.x, entry.y); this.context.lineTo(labelCenterX, labelCenterY); this.context.stroke();
      }
      this.roundedRect(label.x, label.y, label.width, label.height, 7);
      this.context.fillStyle = this.seeds.has(entry.node.id) ? '#fffef8' : '#ffffffeb';
      this.context.fill();
      this.context.strokeStyle = focusId === entry.node.id ? '#386b45' : '#d5dfd3';
      this.context.lineWidth = focusId === entry.node.id ? 1.5 : 1;
      this.context.stroke();
      this.context.beginPath();
      this.context.fillStyle = entry.node.vault === 'SX' ? '#5e9b70' : '#658fc7';
      this.context.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2); this.context.fill();
      if (this.seeds.has(entry.node.id)) {
        this.context.strokeStyle = '#fff'; this.context.lineWidth = 3; this.context.stroke();
        this.context.beginPath(); this.context.strokeStyle = '#315c3c'; this.context.lineWidth = 1.5;
        this.context.arc(entry.x, entry.y, entry.radius + 4, 0, Math.PI * 2); this.context.stroke();
      }
      this.context.fillStyle = '#263129';
      this.context.font = `${this.seeds.has(entry.node.id) ? 650 : 560} 11px Inter, system-ui, sans-serif`;
      this.context.textAlign = 'left'; this.context.textBaseline = 'middle';
      label.lines.forEach((line, index) => this.context.fillText(line, label.x + 8, label.y + 8 + index * 14 + 7));
      this.context.restore();
    }
  }
}

if (graph) {
  graphCanvas = new GraphCanvas(elements.canvas, focusGraph);
  elements.graphZoomOut.addEventListener('click', () => graphCanvas.zoomBy(1 / 1.2));
  elements.graphZoomIn.addEventListener('click', () => graphCanvas.zoomBy(1.2));
  elements.graphReset.addEventListener('click', () => graphCanvas.resetView());
  selectEnvironment(environmentIndex);
}
