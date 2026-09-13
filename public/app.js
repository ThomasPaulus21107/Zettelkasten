const elements = {
  search: document.querySelector('#search'), summary: document.querySelector('#summary'), typeStats: document.querySelector('#type-stats'),
  results: document.querySelector('#results'), graphSummary: document.querySelector('#graph-summary'), canvas: document.querySelector('#graph-canvas'),
  resultTemplate: document.querySelector('#result-template'), dialog: document.querySelector('#note-dialog'), closeNote: document.querySelector('#close-note'),
  noteVault: document.querySelector('#note-vault'), noteTitle: document.querySelector('#note-title'), notePath: document.querySelector('#note-path'),
  noteMetadata: document.querySelector('#note-metadata'), noteContent: document.querySelector('#note-content')
};

const DISPLAY_LIMIT = 96;
const DEFAULT_DEPTH = 5;
let graph;
let nodesById;
let adjacency;
let graphCanvas;
let activeSeedId = null;

try {
  graph = await fetch('/api/graph').then(readJson);
  nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  adjacency = makeAdjacency(graph.edges);
  renderTypeStats();
} catch (error) {
  elements.summary.textContent = `Index konnte nicht geladen werden: ${error.message}`;
}

elements.search.addEventListener('input', () => { activeSeedId = null; updateView(); });
elements.closeNote.addEventListener('click', () => elements.dialog.close());
elements.dialog.addEventListener('click', (event) => { if (event.target === elements.dialog) elements.dialog.close(); });

async function readJson(response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Unbekannter Fehler');
  return payload;
}

function updateView() {
  const query = elements.search.value.trim().toLocaleLowerCase('de');
  const matches = query ? graph.nodes.filter((node) => searchable(node).includes(query)) : [];
  elements.summary.textContent = query ? `${matches.length} passende Zettel` : `${graph.stats.nodes} Zettel · ${graph.stats.edges} explizite Verbindungen`;
  const activeSeed = matches.find((node) => node.id === activeSeedId) ?? matches[0] ?? null;
  activeSeedId = activeSeed?.id ?? null;
  renderResults(matches, activeSeedId);
  const seedIds = activeSeed ? [activeSeed.id] : [];
  const expansion = seedIds.length ? expand(seedIds, DEFAULT_DEPTH) : [];
  const visibleIds = expansion.map(({ id }) => id);
  const nodes = visibleIds.map((id) => nodesById.get(id)).filter(Boolean);
  const edges = expansion.filter(({ parent }) => parent).map(({ id, parent }) => ({ source: parent, target: id }));
  graphCanvas.render(nodes, edges, seedIds, new Map(expansion.map(({ id, level }) => [id, level])));
  const prefix = query ? `Netz: ${activeSeed.title} · bis zu ${DEFAULT_DEPTH} Ebenen` : 'Suche nach einem Gedanken, um sein Netzwerk zu öffnen';
  const truncation = visibleIds.length === DISPLAY_LIMIT ? ` · Darstellung auf ${DISPLAY_LIMIT} Knoten begrenzt` : '';
  elements.graphSummary.textContent = query ? `${prefix} · ${nodes.length} sichtbare Zettel${truncation}. Klicke einen Punkt, um den Zettel zu öffnen.` : prefix;
}

function searchable(node) { return [node.title, node.path, ...node.aliases].join(' ').toLocaleLowerCase('de'); }

function renderTypeStats() {
  const types = new Map();
  for (const node of graph.nodes) {
    const label = (node.type?.trim() || '').toLocaleLowerCase('de');
    types.set(label, (types.get(label) ?? 0) + 1);
  }
  const categories = [
    ['Zettel', graph.stats.nodes],
    ['Bücher', sumTypes(types, ['buch', 'sachbuch'])],
    ['Quellen', sumTypes(types, ['quelle'])],
    ['Zitate', sumTypes(types, ['quote', 'zitat'])]
  ];
  elements.typeStats.replaceChildren(...categories.filter(([, count]) => count).map(([label, count]) => {
    const chip = document.createElement('span');
    chip.textContent = `${count} ${label}`;
    return chip;
  }));
}

function sumTypes(types, names) { return names.reduce((sum, name) => sum + (types.get(name) ?? 0), 0); }

function renderResults(matches, activeId) {
  elements.results.replaceChildren(...matches.slice(0, 8).map((node) => {
    const result = elements.resultTemplate.content.firstElementChild.cloneNode(true);
    result.querySelector('.result-title').textContent = node.title;
    result.querySelector('.result-meta').textContent = `${node.vault} · ${node.path}`;
    result.setAttribute('aria-pressed', String(node.id === activeId));
    result.addEventListener('click', () => { activeSeedId = node.id; updateView(); });
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
  const queue = seedIds.map((id) => ({ id, level: 0 }));
  while (queue.length && seen.size < DISPLAY_LIMIT) {
    const { id, level } = queue.shift();
    if (level === depth) continue;
    const neighbors = [...(adjacency.get(id) ?? [])].sort((left, right) => {
      const degree = (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0);
      return degree || nodesById.get(left).title.localeCompare(nodesById.get(right).title, 'de');
    });
    let followed = 0;
    for (const neighbor of neighbors) {
      if (seen.has(neighbor)) continue;
      seen.set(neighbor, { level: level + 1, parent: id });
      queue.push({ id: neighbor, level: level + 1 });
      followed += 1;
      if (seen.size === DISPLAY_LIMIT || followed === 2) break;
    }
  }
  return [...seen].map(([id, value]) => ({ id, ...value }));
}

async function openNote(node) {
  elements.noteVault.textContent = `Vault ${node.vault}`;
  elements.noteTitle.textContent = node.title;
  elements.notePath.textContent = node.path;
  elements.noteContent.textContent = 'Zettel wird geladen …';
  elements.noteMetadata.replaceChildren();
  if (!elements.dialog.open) elements.dialog.showModal();
  try {
    const note = await fetch(`/api/note?id=${encodeURIComponent(node.id)}`).then(readJson);
    renderMetadata(note);
    elements.noteContent.textContent = note.content || 'Dieser Zettel enthält keinen Textkörper.';
  } catch (error) {
    elements.noteContent.textContent = `Zettel konnte nicht geladen werden: ${error.message}`;
  }
}

function renderMetadata(note) {
  const fields = [['Area', note.area], ['Typ', note.type], ['Status', note.status], ['Tags', note.tags.join(', ') || null]];
  elements.noteMetadata.replaceChildren(...fields.filter(([, value]) => value).flatMap(([label, value]) => {
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value;
    return [term, description];
  }));
}

class GraphCanvas {
  constructor(canvas, onSelect) {
    this.canvas = canvas; this.context = canvas.getContext('2d'); this.onSelect = onSelect; this.nodes = []; this.edges = []; this.seeds = new Set(); this.levels = new Map();
    new ResizeObserver(() => this.draw()).observe(canvas);
    canvas.addEventListener('click', (event) => {
      const bounds = canvas.getBoundingClientRect();
      const point = this.positions().find((entry) => Math.hypot(event.clientX - bounds.left - entry.x, event.clientY - bounds.top - entry.y) <= entry.radius + 5);
      if (point) this.onSelect(point.node);
    });
    canvas.addEventListener('mousemove', (event) => {
      const bounds = canvas.getBoundingClientRect();
      const point = this.positions().find((entry) => Math.hypot(event.clientX - bounds.left - entry.x, event.clientY - bounds.top - entry.y) <= entry.radius + 5);
      canvas.style.cursor = point ? 'pointer' : 'default';
      canvas.title = point?.node.title ?? '';
    });
  }

  render(nodes, edges, seeds, levels) { this.nodes = nodes; this.edges = edges; this.seeds = new Set(seeds); this.levels = levels; this.draw(); }

  positions() {
    const bounds = this.canvas.getBoundingClientRect();
    const centerX = bounds.width / 2; const centerY = bounds.height / 2;
    const byLevel = new Map();
    for (const node of this.nodes) {
      const level = this.levels.get(node.id) ?? 0;
      const entries = byLevel.get(level) ?? [];
      entries.push(node); byLevel.set(level, entries);
    }
    return [...byLevel].flatMap(([level, nodes]) => nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index / nodes.length) - Math.PI / 2 + level * .21;
      const ring = level === 0 ? Math.min(bounds.width, bounds.height) * .13 : Math.min(bounds.width, bounds.height) * (.13 + level * .075);
      return { node, x: centerX + Math.cos(angle) * ring, y: centerY + Math.sin(angle) * ring, radius: level === 0 ? 8 : level === 1 ? 5.5 : 3.6, level };
    }));
  }

  draw() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width) return;
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = bounds.width * ratio; this.canvas.height = bounds.height * ratio;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0); this.context.clearRect(0, 0, bounds.width, bounds.height);
    if (!this.nodes.length) {
      this.context.fillStyle = '#5f6b62'; this.context.font = '500 16px Inter, system-ui, sans-serif'; this.context.textAlign = 'center';
      this.context.fillText('Dein Beziehungsnetz beginnt mit einer Suche.', bounds.width / 2, bounds.height / 2 - 5);
      this.context.fillStyle = '#89938a'; this.context.font = '14px Inter, system-ui, sans-serif';
      this.context.fillText('Wähle anschließend einen Punkt, um den Zettel zu lesen.', bounds.width / 2, bounds.height / 2 + 24);
      return;
    }
    const positions = this.positions();
    const maxLevel = Math.max(...positions.map((entry) => entry.level));
    this.context.strokeStyle = '#e2e8e0'; this.context.lineWidth = 1;
    for (let level = 0; level <= maxLevel; level += 1) {
      const ring = level === 0 ? Math.min(bounds.width, bounds.height) * .13 : Math.min(bounds.width, bounds.height) * (.13 + level * .075);
      this.context.beginPath(); this.context.arc(bounds.width / 2, bounds.height / 2, ring, 0, Math.PI * 2); this.context.stroke();
    }
    const byId = new Map(positions.map((entry) => [entry.node.id, entry]));
    this.context.strokeStyle = '#c5d4c7'; this.context.lineWidth = 1;
    for (const edge of this.edges) {
      const source = byId.get(edge.source); const target = byId.get(edge.target);
      if (!source || !target) continue;
      this.context.beginPath(); this.context.moveTo(source.x, source.y); this.context.lineTo(target.x, target.y); this.context.stroke();
    }
    for (const entry of positions) {
      this.context.beginPath(); this.context.fillStyle = entry.node.vault === 'SX' ? '#5e9b70' : '#658fc7';
      this.context.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2); this.context.fill();
      if (entry.level === 0) {
        this.context.fillStyle = '#27312a'; this.context.font = '600 12px Inter, system-ui, sans-serif'; this.context.textAlign = 'center';
        this.context.fillText(entry.node.title.length > 28 ? `${entry.node.title.slice(0, 26)}…` : entry.node.title, entry.x, entry.y - 14);
      }
    }
  }
}

if (graph) {
  graphCanvas = new GraphCanvas(elements.canvas, openNote);
  updateView();
}
