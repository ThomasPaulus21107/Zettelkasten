const elements = {
  summary: document.querySelector('#summary'),
  search: document.querySelector('#search'),
  results: document.querySelector('#results'),
  empty: document.querySelector('#empty-state'),
  focus: document.querySelector('#focus'),
  vault: document.querySelector('#vault'),
  title: document.querySelector('#title'),
  path: document.querySelector('#path'),
  metadata: document.querySelector('#metadata'),
  relationshipCount: document.querySelector('#relationship-count'),
  relationships: document.querySelector('#relationships'),
  canvas: document.querySelector('#graph-canvas'),
  graphSummary: document.querySelector('#graph-summary'),
  resetGraph: document.querySelector('#reset-graph'),
  resultTemplate: document.querySelector('#result-template')
};

let graph;
let nodesById;
let selectedNode;
let canvasGraph;

try {
  graph = await fetch('/api/graph').then(async (response) => {
    if (!response.ok) throw new Error((await response.json()).error);
    return response.json();
  });
  nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  elements.summary.textContent = `${graph.stats.nodes} Zettel · ${graph.stats.edges} explizite Verbindungen · ${graph.stats.unresolvedLinks} ungelöste Ziele`;
  renderResults(graph.nodes.slice(0, 24));
} catch (error) {
  elements.summary.textContent = `Index konnte nicht geladen werden: ${error.message}`;
}

elements.search.addEventListener('input', () => {
  if (!graph) return;
  const query = elements.search.value.trim().toLocaleLowerCase('de');
  const matches = !query ? graph.nodes.slice(0, 24) : graph.nodes.filter((node) => searchable(node).includes(query)).slice(0, 60);
  renderResults(matches);
});

function searchable(node) {
  return [node.title, node.path, ...node.aliases].join(' ').toLocaleLowerCase('de');
}

function renderResults(nodes) {
  elements.results.replaceChildren();
  for (const node of nodes) {
    const result = elements.resultTemplate.content.firstElementChild.cloneNode(true);
    result.querySelector('.result-title').textContent = node.title;
    result.querySelector('.result-meta').textContent = `${node.vault} · ${node.path}`;
    result.addEventListener('click', () => selectNode(node));
    elements.results.append(result);
  }
}

function selectNode(node) {
  selectedNode = node;
  elements.empty.hidden = true;
  elements.focus.hidden = false;
  elements.vault.textContent = `Vault ${node.vault}`;
  elements.title.textContent = node.title;
  elements.path.textContent = node.path;
  renderMetadata(node);
  const edges = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  elements.relationshipCount.textContent = `${edges.length} Beziehung${edges.length === 1 ? '' : 'en'}`;
  elements.relationships.replaceChildren(...edges.map((edge) => relationshipCard(node, edge)));
  canvasGraph.render(node, edges);
}

function renderMetadata(node) {
  const values = [['Area', node.area], ['Typ', node.type], ['Status', node.status], ['Tags', node.tags.join(', ') || null]];
  elements.metadata.replaceChildren(...values.filter(([, value]) => value).flatMap(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    return [term, description];
  }));
}

function relationshipCard(selected, edge) {
  const card = document.createElement('button');
  card.className = `relationship ${edge.unresolved ? 'unresolved' : ''}`;
  const isOutgoing = edge.source === selected.id;
  const other = nodesById.get(isOutgoing ? edge.target : edge.source);
  const direction = isOutgoing ? 'verweist auf' : 'wird verlinkt von';
  card.innerHTML = `<span class="kind">${edge.kind === 'related' ? 'related' : 'Inline-Link'}</span><strong>${other?.title ?? edge.targetText}</strong><span>${direction}${edge.unresolved ? ' · Ziel nicht aufgelöst' : ` · ${other.vault}`}</span>`;
  if (other) card.addEventListener('click', () => selectNode(other));
  else card.disabled = true;
  return card;
}

class FocusCanvasGraph {
  constructor(canvas, summary, onSelect) {
    this.canvas = canvas;
    this.summary = summary;
    this.context = canvas.getContext('2d');
    this.onSelect = onSelect;
    this.transform = { x: 0, y: 0, scale: 1 };
    this.drag = null;
    this.nodes = [];
    this.selected = null;
    this.bindEvents();
    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  render(selected, edges) {
    this.selected = selected;
    const neighbors = new Map();
    for (const edge of edges) {
      const otherId = edge.source === selected.id ? edge.target : edge.source;
      const other = nodesById.get(otherId);
      if (!other) continue;
      const entry = neighbors.get(other.id) ?? { node: other, kinds: new Set(), count: 0 };
      entry.kinds.add(edge.kind);
      entry.count += 1;
      neighbors.set(other.id, entry);
    }
    const allNeighbors = [...neighbors.values()].sort((a, b) => a.node.title.localeCompare(b.node.title, 'de'));
    this.nodes = allNeighbors.slice(0, 36);
    this.summary.textContent = allNeighbors.length > 36 ? `Zeigt 36 von ${allNeighbors.length} direkten Nachbarn. Die vollständige Liste folgt darunter.` : `${allNeighbors.length} direkte Nachbarn · Klicken öffnet den nächsten Fokus.`;
    this.reset();
  }

  reset() {
    this.transform = { x: 0, y: 0, scale: 1 };
    this.draw();
  }

  bindEvents() {
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const point = this.point(event);
      const previous = this.transform.scale;
      this.transform.scale = Math.max(.55, Math.min(2.4, previous * (event.deltaY < 0 ? 1.12 : .89)));
      this.transform.x = point.x - ((point.x - this.transform.x) * this.transform.scale / previous);
      this.transform.y = point.y - ((point.y - this.transform.y) * this.transform.scale / previous);
      this.draw();
    }, { passive: false });
    this.canvas.addEventListener('pointerdown', (event) => {
      const hit = this.hitTest(this.point(event));
      if (hit) {
        this.onSelect(hit.node);
        return;
      }
      this.drag = { startX: event.clientX, startY: event.clientY, x: this.transform.x, y: this.transform.y };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.drag) return;
      this.transform.x = this.drag.x + event.clientX - this.drag.startX;
      this.transform.y = this.drag.y + event.clientY - this.drag.startY;
      this.draw();
    });
    this.canvas.addEventListener('pointerup', () => { this.drag = null; });
    elements.resetGraph.addEventListener('click', () => this.reset());
  }

  point(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  hitTest(point) {
    return this.positionedNodes().find((entry) => Math.hypot(point.x - entry.x, point.y - entry.y) < entry.radius + 8);
  }

  positionedNodes() {
    const bounds = this.canvas.getBoundingClientRect();
    const center = { x: bounds.width / 2 + this.transform.x, y: bounds.height / 2 + this.transform.y };
    const radius = Math.min(bounds.width, bounds.height) * .34 * this.transform.scale;
    return this.nodes.map((entry, index) => {
      const angle = (Math.PI * 2 * index / Math.max(this.nodes.length, 1)) - Math.PI / 2;
      return { ...entry, x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius, radius: 25 };
    });
  }

  draw() {
    const bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !this.selected) return;
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = bounds.width * pixelRatio;
    this.canvas.height = bounds.height * pixelRatio;
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.context.clearRect(0, 0, bounds.width, bounds.height);
    const styles = getComputedStyle(document.documentElement);
    const colors = { line: styles.getPropertyValue('--graph-line').trim(), text: styles.getPropertyValue('--graph-text').trim(), sx: styles.getPropertyValue('--graph-sx').trim(), dx: styles.getPropertyValue('--graph-dx').trim(), center: styles.getPropertyValue('--graph-center').trim() };
    const center = { x: bounds.width / 2 + this.transform.x, y: bounds.height / 2 + this.transform.y, radius: 34 };
    for (const entry of this.positionedNodes()) {
      this.context.beginPath();
      this.context.strokeStyle = colors.line;
      this.context.lineWidth = entry.kinds.has('related') ? 2 : 1.25;
      this.context.setLineDash(entry.kinds.has('related') && !entry.kinds.has('inline') ? [6, 5] : []);
      this.context.moveTo(center.x, center.y);
      this.context.lineTo(entry.x, entry.y);
      this.context.stroke();
      this.context.setLineDash([]);
      this.context.beginPath();
      this.context.fillStyle = entry.node.vault === 'SX' ? colors.sx : colors.dx;
      this.context.arc(entry.x, entry.y, entry.radius, 0, Math.PI * 2);
      this.context.fill();
      this.label(entry.node.title, entry.x, entry.y + 43, colors.text);
    }
    this.context.beginPath();
    this.context.fillStyle = colors.center;
    this.context.arc(center.x, center.y, center.radius, 0, Math.PI * 2);
    this.context.fill();
    this.label(this.selected.title, center.x, center.y + 57, colors.text);
  }

  label(text, x, y, color) {
    this.context.fillStyle = color;
    this.context.font = '600 12px Inter, system-ui, sans-serif';
    this.context.textAlign = 'center';
    const shortened = text.length > 24 ? `${text.slice(0, 22)}…` : text;
    this.context.fillText(shortened, x, y);
  }
}

canvasGraph = new FocusCanvasGraph(elements.canvas, elements.graphSummary, selectNode);
