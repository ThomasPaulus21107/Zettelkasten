import Graph from 'graphology';
import Sigma from 'sigma';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { makeDataset, measureFrameGaps, nextFrame, renderResults, showError, stats } from './shared.js';

const colors = { SX: '#5e9b70', DX: '#658fc7' };

async function run() {
  const dataset = makeDataset();
  const graphStarted = performance.now();
  const graph = new Graph({ type: 'directed', multi: false, allowSelfLoops: false });
  for (const node of dataset.nodes) {
    graph.addNode(node.id, {
      ...node,
      color: colors[node.vault],
      label: node.label
    });
  }
  for (const edge of dataset.edges) {
    graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
      size: 0.35 + Math.log2(edge.weight + 1) * 0.25,
      color: edge.kind === 'related' ? '#b77b55' : '#8da397'
    });
  }
  const graphBuildMs = performance.now() - graphStarted;

  let activeNode = null;
  let activeNeighbors = new Set();
  const container = document.querySelector('#graph');
  const initStarted = performance.now();
  const renderer = new Sigma(graph, container, {
    allowInvalidContainer: false,
    hideEdgesOnMove: true,
    hideLabelsOnMove: true,
    labelDensity: 0.08,
    labelRenderedSizeThreshold: 9,
    minEdgeThickness: 0.25,
    nodeReducer: (node, data) => {
      if (!activeNode) return data;
      const active = node === activeNode || activeNeighbors.has(node);
      return active ? { ...data, zIndex: 1, forceLabel: node === activeNode }
        : { ...data, color: '#d7dcd8', label: '', size: Math.max(1, data.size * 0.65), zIndex: 0 };
    },
    edgeReducer: (edge, data) => {
      if (!activeNode) return data;
      const [source, target] = graph.extremities(edge);
      const active = source === activeNode || target === activeNode;
      return active ? { ...data, color: '#4b5e52', size: Math.max(1.2, data.size), zIndex: 1 }
        : { ...data, color: '#edf0ed', size: 0.2, zIndex: 0 };
    },
    zIndex: true
  });
  await nextFrame();
  const rendererInitMs = performance.now() - initStarted;

  const highlightTimes = [];
  for (let index = 0; index < 12; index += 1) {
    activeNode = `n${index * 173 % dataset.nodes.length}`;
    activeNeighbors = new Set(graph.neighbors(activeNode));
    const started = performance.now();
    const rendered = new Promise((resolve) => renderer.once('afterRender', resolve));
    renderer.refresh();
    await rendered;
    highlightTimes.push(performance.now() - started);
  }

  activeNode = null;
  activeNeighbors = new Set();
  renderer.refresh();
  await nextFrame();

  const viewportTimes = [];
  const camera = renderer.getCamera();
  for (let index = 0; index < 12; index += 1) {
    const started = performance.now();
    const rendered = new Promise((resolve) => renderer.once('afterRender', resolve));
    camera.setState({
      x: 0.48 + index % 3 * 0.01,
      y: 0.48 + index % 4 * 0.008,
      ratio: 0.9 + index % 5 * 0.04
    });
    await rendered;
    viewportTimes.push(performance.now() - started);
  }

  const layout = new FA2Layout(graph, {
    settings: {
      barnesHutOptimize: true,
      gravity: 1,
      scalingRatio: 10,
      slowDown: 4
    }
  });
  const layoutStarted = performance.now();
  layout.start();
  const responsiveness = await measureFrameGaps(1000);
  layout.stop();
  renderer.refresh();
  await nextFrame();
  const layoutWindowMs = performance.now() - layoutStarted;
  layout.kill();

  const metrics = {
    nodes: graph.order,
    edges: graph.size,
    dataGenerationMs: Number(dataset.dataMs.toFixed(1)),
    graphBuildMs: Number(graphBuildMs.toFixed(1)),
    rendererInitMs: Number(rendererInitMs.toFixed(1)),
    highlightMs: stats(highlightTimes),
    viewportMs: stats(viewportTimes),
    layoutWindowMs: Number(layoutWindowMs.toFixed(1)),
    layoutResponsiveness: responsiveness,
    heapMB: performance.memory ? Number((performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)) : 'nicht verfügbar'
  };
  renderResults('Sigma.js 3.0.3', metrics, 'WebGL-Renderer; ForceAtlas2 läuft während des Tests in einem Worker. Labels werden zoom- und relevanzabhängig reduziert.');
}

run().catch(showError);
