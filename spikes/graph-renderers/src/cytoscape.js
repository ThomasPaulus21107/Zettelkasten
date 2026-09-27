import cytoscape from 'cytoscape';
import { makeDataset, nextFrame, renderResults, showError, stats } from './shared.js';

async function run() {
  const dataset = makeDataset();
  const graphStarted = performance.now();
  const elements = [
    ...dataset.nodes.map((node) => ({
      data: { id: node.id, label: node.label, vault: node.vault },
      position: { x: node.x * 4, y: node.y * 4 },
      classes: node.vault.toLowerCase()
    })),
    ...dataset.edges.map((edge) => ({
      data: { id: edge.id, source: edge.source, target: edge.target, weight: edge.weight },
      classes: edge.kind
    }))
  ];
  const graphBuildMs = performance.now() - graphStarted;
  const container = document.querySelector('#graph');
  const initStarted = performance.now();
  const cy = cytoscape({
    container,
    elements,
    layout: { name: 'preset', fit: true, padding: 25 },
    pixelRatio: 1,
    hideEdgesOnViewport: true,
    minZoom: 0.08,
    maxZoom: 4,
    style: [
      { selector: 'node', style: { width: 8, height: 8, 'background-color': '#5e9b70', label: '', 'overlay-opacity': 0 } },
      { selector: 'node.dx', style: { 'background-color': '#658fc7' } },
      { selector: 'edge', style: { width: 0.65, 'line-color': '#8da397', opacity: 0.22, 'curve-style': 'straight', 'overlay-opacity': 0 } },
      { selector: 'edge.related', style: { 'line-color': '#b77b55' } },
      { selector: '.dimmed', style: { opacity: 0.07 } },
      { selector: 'node.active', style: { opacity: 1, width: 13, height: 13, label: 'data(label)', 'font-size': 13, 'text-background-opacity': 0.92, 'text-background-color': '#ffffff', 'text-background-padding': 3, 'z-index': 10 } },
      { selector: 'edge.active', style: { opacity: 0.92, width: 1.8, 'line-color': '#4b5e52', 'z-index': 9 } }
    ]
  });
  await nextFrame();
  const rendererInitMs = performance.now() - initStarted;

  const highlightTimes = [];
  for (let index = 0; index < 12; index += 1) {
    const node = cy.getElementById(`n${index * 173 % dataset.nodes.length}`);
    const neighborhood = node.closedNeighborhood();
    const started = performance.now();
    cy.batch(() => {
      cy.elements().removeClass('active').addClass('dimmed');
      neighborhood.removeClass('dimmed').addClass('active');
    });
    await nextFrame();
    highlightTimes.push(performance.now() - started);
  }

  cy.elements().removeClass('active dimmed');
  await nextFrame();
  const viewportTimes = [];
  for (let index = 0; index < 12; index += 1) {
    const started = performance.now();
    cy.viewport({
      zoom: 0.75 + index % 5 * 0.04,
      pan: { x: 360 + index % 3 * 5, y: 300 + index % 4 * 4 }
    });
    await nextFrame();
    viewportTimes.push(performance.now() - started);
  }

  const localNodes = cy.nodes().slice(0, 250);
  const localElements = localNodes.union(localNodes.connectedEdges().filter((edge) => localNodes.contains(edge.source()) && localNodes.contains(edge.target())));
  const layoutStarted = performance.now();
  const layout = localElements.layout({
    name: 'cose',
    animate: false,
    randomize: false,
    fit: false,
    numIter: 50,
    nodeRepulsion: 4000,
    idealEdgeLength: 50,
    gravity: 0.3
  });
  layout.run();
  const layoutMs = performance.now() - layoutStarted;
  await nextFrame();

  const metrics = {
    nodes: cy.nodes().length,
    edges: cy.edges().length,
    dataGenerationMs: Number(dataset.dataMs.toFixed(1)),
    graphBuildMs: Number(graphBuildMs.toFixed(1)),
    rendererInitMs: Number(rendererInitMs.toFixed(1)),
    highlightMs: stats(highlightTimes),
    viewportMs: stats(viewportTimes),
    coseLocalNodes: localNodes.length,
    coseLocalEdges: localElements.edges().length,
    coseLocal50IterationsMs: Number(layoutMs.toFixed(1)),
    coseFullGraphProbe: 'Main Thread länger als 30 s blockiert; Test abgebrochen',
    layoutExecution: 'Main Thread',
    heapMB: performance.memory ? Number((performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)) : 'nicht verfügbar'
  };
  renderResults('Cytoscape.js 3.34.3', metrics, 'Canvas-Renderer; eingebaute COSE-Simulation mit 50 Iterationen läuft synchron auf dem Main Thread. Für große Graphen werden bewusst einfache Styles verwendet.');
}

run().catch(showError);
