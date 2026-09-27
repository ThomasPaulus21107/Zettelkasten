import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { aggregateGraphEdges, deterministicPosition, filterGraph, localNeighborhood, normalizedValues, searchableNode } from '../lib/graph-view-model.mjs';

const elements = Object.fromEntries([
  'mode-global', 'mode-local', 'graph-app-search', 'graph-search-popover', 'graph-source', 'selected-read-top', 'settings-toggle', 'graph-settings', 'settings-close',
  'graph-title', 'graph-summary', 'zoom-out', 'fit-view', 'zoom-in', 'layout-toggle', 'sigma-container', 'graph-loading', 'selection-card', 'selection-close',
  'selection-vault', 'selection-title', 'selection-meta', 'selection-links', 'explore-local', 'selection-read', 'filter-sx', 'filter-dx', 'filter-inline',
  'filter-related', 'filter-area', 'filter-tag', 'filter-type', 'filter-status', 'show-orphans', 'filter-reset', 'color-group', 'group-legend', 'local-settings', 'local-depth', 'depth-value', 'local-limit',
  'show-arrows', 'label-threshold', 'label-value', 'node-scale', 'edge-scale', 'force-scaling', 'force-gravity', 'force-slowdown', 'restart-layout',
  'visible-count', 'graph-node-list'
].map((id) => [id.replaceAll('-', '_'), document.getElementById(id)]));

const state = {
  mode: new URLSearchParams(location.search).get('mode') === 'local' ? 'local' : 'global',
  focusId: new URLSearchParams(location.search).get('focus'),
  selectedId: new URLSearchParams(location.search).get('selected'),
  hoveredId: null,
  depth: Number(new URLSearchParams(location.search).get('depth')) || 1,
  limit: Number(new URLSearchParams(location.search).get('limit')) || 60,
  arrows: false,
  labelThreshold: 9,
  nodeScale: 1,
  edgeScale: 1,
  colorGroup: 'vault',
  showOrphans: true,
  vaults: new Set(['SX', 'DX']),
  kinds: new Set(['inline', 'related']),
  area: '', tag: '', type: '', status: ''
};

let sourceGraph;
let nodesById = new Map();
let renderer;
let displayGraph;
let layout;
let layoutTimer;
let renderedModel = { nodes: [], edges: [], total: 0, levels: new Map() };
let highlightNeighbors = new Set();
const positionCache = new Map();

initialize().catch(showFatalError);

async function initialize() {
  sourceGraph = await fetch('/api/graph').then(readJson);
  nodesById = new Map(sourceGraph.nodes.map((node) => [node.id, node]));
  if (!nodesById.has(state.focusId)) state.focusId = null;
  if (!nodesById.has(state.selectedId)) state.selectedId = null;
  if (state.mode === 'local' && !state.focusId) state.mode = 'global';
  populateFacets();
  bindControls();
  setSettingsVisibility(false);
  renderSource();
  renderGraph({ fit: true, runLayout: true });
  elements.graph_loading.hidden = true;
}

async function readJson(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Graph konnte nicht geladen werden.');
  return payload;
}

function currentFilters() {
  return { vaults: state.vaults, kinds: state.kinds, area: state.area, tag: state.tag, type: state.type, status: state.status, showOrphans: state.showOrphans };
}

function makeRenderedModel() {
  const filtered = filterGraph(sourceGraph.nodes, sourceGraph.edges, currentFilters());
  if (state.mode === 'global') return { ...filtered, total: filtered.nodes.length, levels: new Map() };
  if (!filtered.nodes.some((node) => node.id === state.focusId) && nodesById.has(state.focusId)) filtered.nodes.unshift(nodesById.get(state.focusId));
  return localNeighborhood(filtered.nodes, filtered.edges, state.focusId, state.depth, state.limit);
}

function renderGraph({ fit = false, runLayout = false, historyMode = 'replace' } = {}) {
  savePositions();
  stopLayout(true);
  renderedModel = makeRenderedModel();
  displayGraph = createDisplayGraph(renderedModel);
  updateHighlightNeighbors();
  if (!renderer) {
    renderer = new Sigma(displayGraph, elements.sigma_container, sigmaSettings());
    bindRendererEvents();
  } else {
    renderer.setGraph(displayGraph);
    applySigmaSettings();
  }
  updateModeUi();
  renderSelection();
  renderAccessibleList();
  updateSummary();
  syncUrl(historyMode);
  if (fit) requestAnimationFrame(() => renderer.getCamera().animatedReset({ duration: 280 }));
  if (runLayout) startLayout();
}

function createDisplayGraph(model) {
  const graph = new Graph({ type: 'directed', multi: false, allowSelfLoops: true });
  const degree = new Map(model.nodes.map((node) => [node.id, 0]));
  for (const edge of model.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  for (const node of model.nodes) {
    const cached = positionCache.get(node.id);
    const level = state.mode === 'local' ? model.levels.get(node.id) ?? 0 : null;
    const position = cached ?? deterministicPosition(node.id, node.vault === 'DX' ? 1 : 0, level);
    graph.addNode(node.id, {
      ...position,
      label: node.title,
      color: colorForNode(node),
      size: 2.4 + Math.min(6, Math.log2((degree.get(node.id) ?? 0) + 1) * 1.2),
      vault: node.vault,
      zIndex: node.id === state.focusId ? 3 : 0
    });
  }
  for (const edge of model.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    const relatedOnly = edge.kinds.length === 1 && edge.kinds[0] === 'related';
    graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
      color: relatedOnly ? '#b77b55' : '#8da397',
      kind: edge.kinds.join('+'),
      weight: edge.weight,
      size: (state.mode === 'local' ? .8 : .4) + Math.min(2, Math.log2(edge.weight + 1) * .42),
      type: state.arrows ? 'arrow' : 'line'
    });
  }
  return graph;
}

function sigmaSettings() {
  return {
    hideEdgesOnMove: state.mode === 'global',
    hideLabelsOnMove: state.mode === 'global',
    renderLabels: true,
    labelDensity: state.mode === 'local' ? 2 : 0.22,
    labelGridCellSize: 120,
    labelRenderedSizeThreshold: state.mode === 'local' ? 0 : state.labelThreshold,
    minEdgeThickness: state.mode === 'local' ? 1 : .25,
    zIndex: true,
    nodeReducer,
    edgeReducer
  };
}

function applySigmaSettings() {
  renderer.setSettings({
    hideEdgesOnMove: state.mode === 'global',
    hideLabelsOnMove: state.mode === 'global',
    labelDensity: state.mode === 'local' ? 2 : .22,
    labelRenderedSizeThreshold: state.mode === 'local' ? 0 : state.labelThreshold,
    minEdgeThickness: state.mode === 'local' ? 1 : .25,
    nodeReducer,
    edgeReducer
  });
  renderer.refresh();
}

function activeId() { return state.hoveredId ?? state.selectedId; }

function nodeReducer(node, data) {
  const id = activeId();
  const scale = state.nodeScale;
  if (!id) return { ...data, size: data.size * scale, forceLabel: state.mode === 'local' || node === state.focusId };
  const active = node === id || highlightNeighbors.has(node);
  if (active) return { ...data, size: data.size * scale * (node === id ? 1.35 : 1), forceLabel: state.mode === 'local' || node === id, zIndex: node === id ? 5 : 4 };
  return { ...data, size: data.size * scale * .72, color: '#d9dfda', label: '', zIndex: 0 };
}

function edgeReducer(edge, data) {
  const id = activeId();
  const scaled = data.size * state.edgeScale;
  if (!id) return { ...data, size: scaled * (state.mode === 'local' ? 1.25 : 1), type: state.arrows ? 'arrow' : 'line' };
  const [source, target] = displayGraph.extremities(edge);
  const active = source === id || target === id;
  return active
    ? { ...data, size: Math.max(state.mode === 'local' ? 2 : 1.15, scaled), color: data.kind === 'related' ? '#985d37' : '#345640', type: state.arrows ? 'arrow' : 'line', zIndex: 3 }
    : { ...data, size: .18, color: '#e6ebe6', type: 'line', zIndex: 0 };
}

function bindRendererEvents() {
  renderer.on('enterNode', ({ node }) => { state.hoveredId = node; updateHighlightNeighbors(); renderer.refresh(); });
  renderer.on('leaveNode', () => { state.hoveredId = null; updateHighlightNeighbors(); renderer.refresh(); });
  renderer.on('clickNode', ({ node }) => selectNode(node, true));
  renderer.on('doubleClickNode', ({ node, event }) => { event.preventSigmaDefault(); openReader(node); });
  renderer.on('clickStage', () => selectNode(null));
}

function bindControls() {
  elements.mode_global.addEventListener('click', () => setMode('global'));
  elements.mode_local.addEventListener('click', () => { const id = state.selectedId ?? state.focusId; if (id) focusLocal(id); });
  elements.graph_app_search.addEventListener('input', renderSearchResults);
  elements.graph_app_search.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSearch(); });
  document.addEventListener('click', (event) => { if (!event.target.closest('.graph-search-wrap')) closeSearch(); });
  elements.settings_toggle.addEventListener('click', toggleSettings);
  elements.settings_close.addEventListener('click', toggleSettings);
  elements.zoom_in.addEventListener('click', () => renderer.getCamera().animatedZoom());
  elements.zoom_out.addEventListener('click', () => renderer.getCamera().animatedUnzoom());
  elements.fit_view.addEventListener('click', () => renderer.getCamera().animatedReset({ duration: 250 }));
  elements.layout_toggle.addEventListener('click', () => layout?.isRunning() ? stopLayout() : startLayout());
  elements.restart_layout.addEventListener('click', startLayout);
  elements.selection_close.addEventListener('click', () => selectNode(null));
  elements.explore_local.addEventListener('click', () => { if (state.selectedId) focusLocal(state.selectedId); });
  elements.sigma_container.addEventListener('keydown', handleGraphKeyboard);
  addEventListener('popstate', restoreUrlState);

  for (const element of [elements.filter_sx, elements.filter_dx, elements.filter_inline, elements.filter_related, elements.filter_area, elements.filter_tag, elements.filter_type, elements.filter_status, elements.show_orphans]) {
    element.addEventListener('change', applyFiltersFromControls);
  }
  elements.filter_reset.addEventListener('click', resetFilters);
  elements.color_group.addEventListener('change', () => { state.colorGroup = elements.color_group.value; renderGroupLegend(); renderGraph(); });
  elements.local_depth.addEventListener('input', () => { state.depth = Number(elements.local_depth.value); elements.depth_value.value = state.depth; renderGraph({ runLayout: true }); });
  elements.local_limit.addEventListener('change', () => { state.limit = Number(elements.local_limit.value); renderGraph({ runLayout: true }); });
  elements.show_arrows.addEventListener('change', () => { state.arrows = elements.show_arrows.checked; applySigmaSettings(); });
  elements.label_threshold.addEventListener('input', () => { state.labelThreshold = Number(elements.label_threshold.value); elements.label_value.value = state.labelThreshold < 7 ? 'viele' : state.labelThreshold > 11 ? 'wenige' : 'mittel'; applySigmaSettings(); });
  elements.node_scale.addEventListener('input', () => { state.nodeScale = Number(elements.node_scale.value) / 100; applySigmaSettings(); });
  elements.edge_scale.addEventListener('input', () => { state.edgeScale = Number(elements.edge_scale.value) / 100; applySigmaSettings(); });
}

function handleGraphKeyboard(event) {
  const camera = renderer.getCamera();
  const moves = { ArrowLeft: [-.04, 0], ArrowRight: [.04, 0], ArrowUp: [0, -.04], ArrowDown: [0, .04] };
  if (moves[event.key]) {
    event.preventDefault();
    const [x, y] = moves[event.key];
    camera.animate({ x: camera.x + x, y: camera.y + y }, { duration: 120 });
  } else if (event.key === '+' || event.key === '=') { event.preventDefault(); camera.animatedZoom(); }
  else if (event.key === '-') { event.preventDefault(); camera.animatedUnzoom(); }
  else if (event.key === 'Escape') { event.preventDefault(); selectNode(null); }
}

function applyFiltersFromControls() {
  state.vaults = new Set([elements.filter_sx.checked ? 'SX' : null, elements.filter_dx.checked ? 'DX' : null].filter(Boolean));
  state.kinds = new Set([elements.filter_inline.checked ? 'inline' : null, elements.filter_related.checked ? 'related' : null].filter(Boolean));
  state.area = elements.filter_area.value;
  state.tag = elements.filter_tag.value;
  state.type = elements.filter_type.value;
  state.status = elements.filter_status.value;
  state.showOrphans = elements.show_orphans.checked;
  renderGraph({ fit: true, runLayout: true });
}

function resetFilters() {
  elements.filter_sx.checked = true; elements.filter_dx.checked = true;
  elements.filter_inline.checked = true; elements.filter_related.checked = true;
  elements.filter_area.value = ''; elements.filter_tag.value = ''; elements.filter_type.value = ''; elements.filter_status.value = ''; elements.show_orphans.checked = true;
  applyFiltersFromControls();
}

function populateFacets() {
  fillSelect(elements.filter_area, sourceGraph.nodes.flatMap((node) => normalizedValues(node.area)));
  fillFrequentSelect(elements.filter_tag, sourceGraph.nodes.flatMap((node) => normalizedValues(node.tags)), 150);
  fillSelect(elements.filter_type, sourceGraph.nodes.map((node) => node.type).filter(Boolean));
  fillSelect(elements.filter_status, sourceGraph.nodes.map((node) => node.status).filter(Boolean));
  renderGroupLegend();
}

function fillSelect(select, values) {
  const options = [...new Set(values)].sort((left, right) => left.localeCompare(right, 'de')).map((value) => new Option(value, value));
  select.append(...options);
}

function fillFrequentSelect(select, values, limit) {
  const counts = values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map());
  const options = [...counts]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'de'))
    .slice(0, limit)
    .map(([value, count]) => new Option(`${value} (${count})`, value));
  select.append(...options);
}

function renderSearchResults() {
  const query = elements.graph_app_search.value.trim().toLocaleLowerCase('de');
  if (!query) return closeSearch();
  const matches = sourceGraph.nodes.filter((node) => searchableNode(node).includes(query)).slice(0, 12);
  elements.graph_search_popover.replaceChildren(...matches.map((node) => {
    const button = document.createElement('button'); button.type = 'button';
    const title = document.createElement('span'); title.textContent = node.title;
    const meta = document.createElement('small'); meta.textContent = `${node.vault} · ${node.path}`;
    button.append(title, meta);
    button.addEventListener('click', () => { ensureNodeVisibleAndSelect(node.id); closeSearch(); elements.graph_app_search.value = ''; });
    return button;
  }));
  if (!matches.length) elements.graph_search_popover.textContent = 'Keine passenden Zettel.';
  elements.graph_search_popover.hidden = false;
}

function closeSearch() { elements.graph_search_popover.hidden = true; elements.graph_search_popover.replaceChildren(); }

function ensureNodeVisibleAndSelect(id) {
  if (!displayGraph.hasNode(id)) {
    state.mode = 'local'; state.focusId = id; state.selectedId = id;
    renderGraph({ fit: true, runLayout: true, historyMode: 'push' });
  } else {
    selectNode(id, true);
  }
}

function selectNode(id, center = false) {
  state.selectedId = id && displayGraph?.hasNode(id) ? id : null;
  updateHighlightNeighbors();
  renderSelection();
  renderAccessibleList();
  syncUrl();
  renderer?.refresh();
  if (center && state.selectedId) centerNode(state.selectedId);
}

function centerNode(id) {
  const data = renderer.getNodeDisplayData(id);
  if (data) renderer.getCamera().animate({ x: data.x, y: data.y, ratio: Math.min(renderer.getCamera().ratio, .45) }, { duration: 360 });
}

function focusLocal(id) {
  state.mode = 'local'; state.focusId = id; state.selectedId = id;
  renderGraph({ fit: true, runLayout: true, historyMode: 'push' });
}

function setMode(mode) {
  if (mode === 'local' && !state.focusId) return;
  state.mode = mode;
  renderGraph({ fit: true, runLayout: true, historyMode: 'push' });
}

function renderSelection() {
  const node = nodesById.get(state.selectedId);
  elements.selection_card.hidden = !node;
  elements.selected_read_top.classList.toggle('is-disabled', !node);
  elements.selected_read_top.setAttribute('aria-disabled', String(!node));
  if (!node) { elements.selected_read_top.removeAttribute('href'); return; }
  const url = `/lesen?id=${encodeURIComponent(node.id)}`;
  elements.selection_vault.textContent = `${node.vault} · ${node.type || 'ohne Typ'}`;
  elements.selection_title.textContent = node.title;
  elements.selection_meta.textContent = [node.status, ...normalizedValues(node.area), node.path].filter(Boolean).join(' · ');
  const incoming = renderedModel.edges.filter((edge) => edge.target === node.id).length;
  const outgoing = renderedModel.edges.filter((edge) => edge.source === node.id).length;
  elements.selection_links.textContent = `${outgoing} ausgehende · ${incoming} eingehende sichtbare Beziehungen`;
  elements.selection_read.href = url; elements.selected_read_top.href = url;
  elements.explore_local.textContent = node.id === state.focusId && state.mode === 'local' ? 'Lokaler Mittelpunkt' : 'Lokal erkunden';
  elements.explore_local.disabled = node.id === state.focusId && state.mode === 'local';
}

function renderAccessibleList() {
  elements.visible_count.textContent = `(${renderedModel.nodes.length})`;
  const nodes = state.mode === 'global'
    ? [...renderedModel.nodes].sort((left, right) => left.title.localeCompare(right.title, 'de')).slice(0, 250)
    : renderedModel.nodes;
  elements.graph_node_list.replaceChildren(...nodes.map((node) => {
    const button = document.createElement('button'); button.type = 'button';
    button.setAttribute('aria-pressed', String(node.id === state.selectedId));
    const title = document.createElement('span'); title.textContent = node.title;
    const meta = document.createElement('small');
    const distance = renderedModel.levels.get(node.id);
    meta.textContent = `${node.vault}${distance === undefined ? '' : ` · Distanz ${distance}`}`;
    button.append(title, meta); button.addEventListener('click', () => selectNode(node.id, true));
    return button;
  }));
}

function updateModeUi() {
  elements.mode_global.setAttribute('aria-pressed', String(state.mode === 'global'));
  elements.mode_local.setAttribute('aria-pressed', String(state.mode === 'local'));
  elements.mode_local.disabled = !(state.focusId || state.selectedId);
  elements.local_settings.hidden = state.mode !== 'local';
  elements.graph_title.textContent = state.mode === 'global' ? 'Gesamtgraph' : `Lokaler Graph · ${nodesById.get(state.focusId)?.title ?? ''}`;
  elements.local_depth.value = state.depth; elements.depth_value.value = state.depth; elements.local_limit.value = String(state.limit);
}

function updateSummary() {
  const rawCount = sourceGraph.nodes.length;
  if (state.mode === 'local') {
    elements.graph_summary.textContent = `${renderedModel.nodes.length} von ${renderedModel.total} erreichbaren Zetteln · Tiefe ${state.depth} · ${renderedModel.edges.length} gerichtete Beziehungen`;
  } else {
    elements.graph_summary.textContent = `${renderedModel.nodes.length} von ${rawCount} Zetteln · ${renderedModel.edges.length} gerichtete Beziehungen`;
  }
}

function renderSource() {
  if (!sourceGraph.source) { elements.graph_source.textContent = 'Lokale Vault-Konfiguration'; return; }
  const time = new Date(sourceGraph.source.fetchedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  elements.graph_source.textContent = `GitHub · ${sourceGraph.source.branch} · ${sourceGraph.source.revision} · ${time}`;
}

function startLayout() {
  stopLayout(true);
  if (!displayGraph || displayGraph.order < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.layout_toggle.textContent = 'Layout starten'; return;
  }
  layout = new FA2Layout(displayGraph, {
    settings: {
      barnesHutOptimize: displayGraph.order > 300,
      gravity: Number(elements.force_gravity.value),
      scalingRatio: Number(elements.force_scaling.value),
      slowDown: Number(elements.force_slowdown.value),
      edgeWeightInfluence: .5
    }
  });
  layout.start(); elements.layout_toggle.textContent = 'Layout pausieren';
  layoutTimer = setTimeout(() => stopLayout(false, true), state.mode === 'global' ? 2400 : 1200);
}

function stopLayout(kill = false, fit = false) {
  clearTimeout(layoutTimer);
  if (!layout) return;
  layout.stop();
  if (kill) { layout.kill(); layout = null; }
  elements.layout_toggle.textContent = 'Layout starten';
  savePositions();
  if (fit) renderer.getCamera().animatedReset({ duration: 320 });
}

function updateHighlightNeighbors() {
  const id = activeId();
  highlightNeighbors = id && displayGraph?.hasNode(id) ? new Set(displayGraph.neighbors(id)) : new Set();
}

const groupPalette = ['#5e9b70', '#658fc7', '#b77b55', '#8b6db1', '#c19b3e', '#4f9995', '#a8667a', '#738555', '#8a785f', '#5e79a8'];

function groupValue(node) {
  if (state.colorGroup === 'area') return normalizedValues(node.area)[0] || 'ohne Area';
  return node[state.colorGroup] || `ohne ${state.colorGroup}`;
}

function colorForNode(node) {
  if (state.colorGroup === 'vault') return node.vault === 'DX' ? '#658fc7' : '#5e9b70';
  const value = groupValue(node);
  let hash = 0;
  for (const character of value) hash = (Math.imul(hash, 31) + character.codePointAt(0)) | 0;
  return groupPalette[Math.abs(hash) % groupPalette.length];
}

function renderGroupLegend() {
  elements.group_legend.textContent = state.colorGroup === 'vault'
    ? 'Grün: SX · Blau: DX'
    : `Farben unterscheiden ${state.colorGroup === 'area' ? 'Areas' : state.colorGroup === 'type' ? 'Typen' : 'Statuswerte'}; Vault bleibt in Auswahl und Liste sichtbar.`;
}

function savePositions() {
  if (!displayGraph) return;
  displayGraph.forEachNode((id, attributes) => positionCache.set(id, { x: attributes.x, y: attributes.y }));
}

function toggleSettings() {
  const hidden = document.querySelector('.graph-layout').classList.toggle('settings-hidden');
  setSettingsVisibility(!hidden);
  requestAnimationFrame(() => renderer?.resize().refresh());
}

function setSettingsVisibility(visible) {
  elements.settings_toggle.setAttribute('aria-expanded', String(visible));
  elements.graph_settings.toggleAttribute('inert', !visible);
  elements.graph_settings.setAttribute('aria-hidden', String(!visible));
}

function syncUrl(mode = 'replace') {
  if (!mode) return;
  const url = new URL(location.href);
  url.searchParams.set('mode', state.mode);
  state.focusId ? url.searchParams.set('focus', state.focusId) : url.searchParams.delete('focus');
  state.selectedId ? url.searchParams.set('selected', state.selectedId) : url.searchParams.delete('selected');
  if (state.mode === 'local') { url.searchParams.set('depth', state.depth); url.searchParams.set('limit', state.limit); }
  else { url.searchParams.delete('depth'); url.searchParams.delete('limit'); }
  history[`${mode}State`](null, '', url);
}

function restoreUrlState() {
  const params = new URLSearchParams(location.search);
  state.mode = params.get('mode') === 'local' && nodesById.has(params.get('focus')) ? 'local' : 'global';
  state.focusId = nodesById.has(params.get('focus')) ? params.get('focus') : null;
  state.selectedId = nodesById.has(params.get('selected')) ? params.get('selected') : null;
  state.depth = Math.max(1, Math.min(5, Number(params.get('depth')) || 1));
  state.limit = [30, 60, 120, 250].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 60;
  renderGraph({ fit: true, runLayout: true, historyMode: null });
}

function openReader(id) { location.assign(`/lesen?id=${encodeURIComponent(id)}`); }

function showFatalError(error) {
  elements.graph_loading.hidden = false;
  elements.graph_loading.textContent = `Graph konnte nicht geladen werden: ${error.message}`;
  console.error(error);
}
