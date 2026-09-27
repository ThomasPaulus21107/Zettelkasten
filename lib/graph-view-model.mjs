export function normalizedValues(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.filter(Boolean).map((entry) => String(entry).trim()).filter(Boolean))];
}

export function aggregateGraphEdges(edges, allowedKinds = new Set(['inline', 'related'])) {
  const aggregated = new Map();
  for (const edge of edges) {
    if (!edge.target || !allowedKinds.has(edge.kind)) continue;
    const key = `${edge.source}\u0000${edge.target}`;
    const current = aggregated.get(key) ?? {
      id: `edge:${aggregated.size}`,
      source: edge.source,
      target: edge.target,
      kinds: new Set(),
      weight: 0
    };
    current.kinds.add(edge.kind);
    current.weight += Number(edge.weight) || 1;
    aggregated.set(key, current);
  }
  return [...aggregated.values()].map((edge) => ({ ...edge, kinds: [...edge.kinds].sort() }));
}

export function nodeMatchesFilters(node, filters) {
  if (filters.vaults?.size && !filters.vaults.has(node.vault)) return false;
  if (filters.area && !normalizedValues(node.area).includes(filters.area)) return false;
  if (filters.tag && !normalizedValues(node.tags).includes(filters.tag)) return false;
  if (filters.type && node.type !== filters.type) return false;
  if (filters.status && node.status !== filters.status) return false;
  return true;
}

export function filterGraph(nodes, edges, filters) {
  const matchingNodes = nodes.filter((node) => nodeMatchesFilters(node, filters));
  const ids = new Set(matchingNodes.map((node) => node.id));
  const matchingEdges = aggregateGraphEdges(edges, filters.kinds).filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  if (filters.showOrphans !== false) return { nodes: matchingNodes, edges: matchingEdges };
  const connected = new Set(matchingEdges.flatMap((edge) => [edge.source, edge.target]));
  return { nodes: matchingNodes.filter((node) => connected.has(node.id)), edges: matchingEdges };
}

export function localNeighborhood(nodes, edges, focusId, depth, limit) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  if (!nodesById.has(focusId)) return { nodes: [], edges: [], levels: new Map(), total: 0 };
  const adjacency = new Map();
  const degree = new Map();
  for (const edge of edges) {
    for (const [from, to] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      if (!nodesById.has(from) || !nodesById.has(to)) continue;
      const neighbors = adjacency.get(from) ?? new Set();
      neighbors.add(to);
      adjacency.set(from, neighbors);
      degree.set(from, (degree.get(from) ?? 0) + 1);
    }
  }
  const levels = new Map([[focusId, 0]]);
  const queue = [focusId];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const level = levels.get(current);
    if (level >= depth) continue;
    const neighbors = [...(adjacency.get(current) ?? [])].sort((left, right) =>
      (degree.get(right) ?? 0) - (degree.get(left) ?? 0)
      || nodesById.get(left).title.localeCompare(nodesById.get(right).title, 'de'));
    for (const neighbor of neighbors) {
      if (levels.has(neighbor)) continue;
      levels.set(neighbor, level + 1);
      queue.push(neighbor);
    }
  }
  const visibleIds = new Set(queue.slice(0, limit));
  return {
    nodes: queue.slice(0, limit).map((id) => nodesById.get(id)),
    edges: edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    levels,
    total: queue.length
  };
}

export function searchableNode(node) {
  return [node.title, node.path, ...normalizedValues(node.aliases)].join(' ').toLocaleLowerCase('de');
}

export function deterministicPosition(id, group = 0, level = null) {
  let hash = 2166136261;
  for (const character of id) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const unit = (hash >>> 0) / 4294967295;
  const angle = level === null
    ? group * Math.PI + unit * Math.PI * 0.86 - Math.PI * 0.43
    : unit * Math.PI * 2;
  const radius = level === null ? 22 + ((hash >>> 8) % 100) / 100 * 38 : level * 24;
  const centerX = level === null ? (group === 0 ? -44 : 44) : 0;
  return { x: centerX + Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
