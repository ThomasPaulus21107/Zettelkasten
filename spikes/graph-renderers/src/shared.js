export const NODE_COUNT = 2500;
export const EDGE_COUNT = 20000;
export const CLUSTER_COUNT = 10;

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function makeDataset() {
  const started = performance.now();
  const random = mulberry32(21107);
  const nodes = [];
  const edges = [];
  const edgeKeys = new Set();
  const nodesPerCluster = NODE_COUNT / CLUSTER_COUNT;

  for (let index = 0; index < NODE_COUNT; index += 1) {
    const cluster = Math.floor(index / nodesPerCluster);
    const clusterAngle = cluster / CLUSTER_COUNT * Math.PI * 2;
    const radius = 22 + random() * 18;
    const angle = random() * Math.PI * 2;
    nodes.push({
      id: `n${index}`,
      label: `Zettel ${index + 1}`,
      vault: index % 4 === 0 ? 'DX' : 'SX',
      cluster,
      x: Math.cos(clusterAngle) * 90 + Math.cos(angle) * radius,
      y: Math.sin(clusterAngle) * 90 + Math.sin(angle) * radius,
      size: 2 + (index % 7) * 0.35
    });
  }

  const addEdge = (source, target) => {
    if (source === target) return false;
    const key = `${source}|${target}`;
    if (edgeKeys.has(key)) return false;
    edgeKeys.add(key);
    edges.push({
      id: `e${edges.length}`,
      source: `n${source}`,
      target: `n${target}`,
      kind: edges.length % 5 === 0 ? 'related' : 'inline',
      weight: 1 + edges.length % 4
    });
    return true;
  };

  for (let source = 0; source < NODE_COUNT; source += 1) {
    const clusterStart = Math.floor(source / nodesPerCluster) * nodesPerCluster;
    for (let offset = 1; offset <= 6; offset += 1) {
      addEdge(source, clusterStart + (source - clusterStart + offset * 17) % nodesPerCluster);
    }
  }

  while (edges.length < EDGE_COUNT) {
    const source = Math.floor(random() * NODE_COUNT);
    const local = random() < 0.82;
    const clusterStart = Math.floor(source / nodesPerCluster) * nodesPerCluster;
    const target = local
      ? clusterStart + Math.floor(random() * nodesPerCluster)
      : Math.floor(random() * NODE_COUNT);
    addEdge(source, target);
  }

  return { nodes, edges, dataMs: performance.now() - started };
}

export function stats(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const quantile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
  return {
    median: Number(quantile(0.5).toFixed(1)),
    p95: Number(quantile(0.95).toFixed(1)),
    max: Number(sorted.at(-1).toFixed(1))
  };
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export function afterEvent(target, event) {
  return new Promise((resolve) => target.once(event, resolve));
}

export async function measureFrameGaps(durationMs) {
  const gaps = [];
  const started = performance.now();
  let previous = started;
  return new Promise((resolve) => {
    const tick = (now) => {
      gaps.push(now - previous);
      previous = now;
      if (now - started >= durationMs) {
        resolve({
          durationMs: Number((now - started).toFixed(1)),
          frames: gaps.length,
          maxFrameGapMs: Number(Math.max(...gaps).toFixed(1))
        });
      } else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export function renderResults(name, metrics, notes) {
  const output = document.querySelector('#results');
  document.querySelector('#status').textContent = 'Benchmark abgeschlossen';
  output.replaceChildren();
  for (const [label, value] of Object.entries(metrics)) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
    row.append(term, detail);
    output.append(row);
  }
  document.querySelector('#notes').textContent = notes;
  window.__graphSpike = { renderer: name, metrics, notes, finished: true };
}

export function showError(error) {
  document.querySelector('#status').textContent = 'Benchmark fehlgeschlagen';
  document.querySelector('#notes').textContent = error?.stack ?? String(error);
  window.__graphSpike = { finished: true, error: error?.stack ?? String(error) };
}
