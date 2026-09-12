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
  resultTemplate: document.querySelector('#result-template')
};

let graph;
let nodesById;

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
  elements.empty.hidden = true;
  elements.focus.hidden = false;
  elements.vault.textContent = `Vault ${node.vault}`;
  elements.title.textContent = node.title;
  elements.path.textContent = node.path;
  renderMetadata(node);
  const edges = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  elements.relationshipCount.textContent = `${edges.length} Beziehung${edges.length === 1 ? '' : 'en'}`;
  elements.relationships.replaceChildren(...edges.map((edge) => relationshipCard(node, edge)));
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
