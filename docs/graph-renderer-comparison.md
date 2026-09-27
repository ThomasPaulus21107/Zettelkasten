# Renderer-Spike: Sigma.js oder Cytoscape.js

Stand: 22. September 2026 · Entscheidung: Sigma.js mit Graphology und ForceAtlas2-Worker

## Kurzurteil

Für den interaktiven Gesamt- und Lokalgraph wird **Sigma.js 3 mit Graphology** gewählt. ForceAtlas2 läuft in einem Web Worker. Cytoscape.js besitzt die reichere integrierte Graph-, Styling- und Layout-API, verfehlt bei der für den Vault relevanten Größenordnung aber die Interaktionsbudgets deutlich.

Die Entscheidung gilt für den Renderer. Traversierung, Filter, Auswahlzustand, Kantenaggregation und Rabbit-Hole-Verlauf bleiben rendererunabhängige Anwendungsmodule.

## Testaufbau

Der reproduzierbare Spike liegt unter `spikes/graph-renderers/` und erzeugt einen deterministischen synthetischen Graphen:

- 2.500 Knoten;
- 20.000 eindeutige gerichtete Kanten;
- zehn Cluster;
- SX-/DX-Attribute;
- Wiki-Link- und `related`-Kanten;
- gewichtete Kanten und unterschiedlich große Knoten;
- identische Startpositionen für beide Renderer.

Damit werden keine Vault-Inhalte kopiert oder in Testartefakte geschrieben.

Gemessen wurden:

- Erzeugung der identischen Testdaten;
- Aufbau des jeweiligen Graphmodells;
- Initialisierung bis zur gerenderten Karte;
- zwölf Nachbarschaftshervorhebungen;
- zwölf Zoom-/Pan-Aktualisierungen;
- Verhalten eines physikbasierten Layouts;
- grober JavaScript-Heap;
- minifizierte Bundlegröße roh und gzip.

Umgebung des dokumentierten Laufs:

- macOS/Darwin 24.6.0 auf x86_64;
- Codex In-App-Browser;
- Node.js 26.7.0 und npm 11.19.0;
- Sigma.js 3.0.3, Graphology 0.26.0, ForceAtlas2 0.10.1;
- Cytoscape.js 3.34.3;
- esbuild 0.28.2.

## Ergebnisse

Die Tabelle zeigt jeweils den zweiten Lauf nach geladenen Modulen und initialisiertem Browserprozess. Median und P95 beziehen sich auf zwölf Interaktionen.

| Messung | Sigma.js | Cytoscape.js |
| --- | ---: | ---: |
| Graphmodell aufbauen | 61,9 ms | 5,1 ms |
| Renderer initialisieren | **188,2 ms** | 2.300,5 ms |
| Hover/Nachbarschaft, Median | **42,0 ms** | 480,3 ms |
| Hover/Nachbarschaft, P95 | **77,7 ms** | 859,3 ms |
| Zoom/Pan, Median | **16,9 ms** | 250,8 ms |
| Zoom/Pan, P95 | **32,1 ms** | 495,4 ms |
| Layout | FA2-Worker, 1.024 ms Messfenster | COSE, 2.231,8 ms für 250 Knoten/1.934 Kanten/50 Iterationen |
| maximale Frame-Lücke während Layout | 82,7 ms | nicht sinnvoll messbar, da Main Thread blockiert |
| grober Heap | **44,0 MB** | 116,9 MB |
| Bundle minifiziert | **175.619 B** | 448.439 B |
| Bundle gzip | **43.259 B** | 143.688 B |

Ein zusätzlicher COSE-Lauf mit allen 2.500 Knoten und 20.000 Kanten blockierte den Main Thread länger als 30 Sekunden und wurde abgebrochen. Der vergleichbare Sigma-Lauf ließ während der ForceAtlas2-Simulation weiterhin Browserframes und Interaktion zu.

### Kaltstart

Beim ersten Lauf im frischen Browserprozess benötigte Sigma 2.779,1 ms und Cytoscape 3.752,1 ms bis nach der Initialisierung und den ersten Frames. Sigma erfüllt damit im Spike das Ziel „erste bedienbare Darstellung unter 1,5 Sekunden“ nur im Warmlauf. Der produktive Umbau muss deshalb zusätzlich messen und optimieren:

- Graphroute per Code-Splitting laden;
- Graphdaten und vorberechnete Startpositionen cachen;
- die Karte progressiv anzeigen, bevor Labels und Layoutsimulation vollständig bereit sind;
- Kompression und Browsercache in der lokalen Auslieferung nutzen;
- die Kaltstartmessung als Performance-Abnahme beibehalten.

## Qualitative Bewertung

### Sigma.js

Stärken:

- WebGL ist auf tausende Knoten und Kanten ausgelegt;
- Zoom und Pan bleiben bei 20.000 Kanten flüssig;
- Node- und Edge-Reducer bilden Hover-Dimming und Auswahl ohne Änderung des Graphmodells ab;
- Graphology passt zu gerichteten, gewichteten und später aggregierten Beziehungen;
- ForceAtlas2 läuft bereits über einen bereitgestellten Worker;
- automatische Labelreduktion entspricht dem gewünschten Obsidian-Arbeitsmodell;
- deutlich kleineres Rendering-Bundle und geringerer Heap im Spike.

Nachteile und Arbeitspunkte:

- Knotenaufbau in Graphology ist teurer als Cytoscapes Array-Übergabe;
- Accessibility benötigt weiterhin eine gekoppelte HTML-Liste und Statusmeldungen;
- gestrichelte beziehungsweise semantisch reichere Kanten brauchen angepasste WebGL-Programme oder eine reduzierte visuelle Kodierung;
- das Hervorheben rechnet im Spike noch über alle Elemente; partielle Updates können die Reserve erhöhen;
- stabile Positionen, Layoutstopp und Wiederaufnahme müssen als Anwendungskonzept gebaut werden.

### Cytoscape.js

Stärken:

- sehr ausdrucksstarke Selektoren, Styles, Events und Graphalgorithmen;
- integrierte Layout- und Subgraph-APIs;
- schneller Aufbau des internen Graphmodells;
- gute Wahl für kleinere, analytisch reiche Diagramme.

Nachteile für diesen Anwendungsfall:

- Canvas-Rendering reagiert bei 20.000 Kanten deutlich langsamer;
- Hover-Klassen und Viewportänderungen überschreiten das 100-ms-Ziel mehrfach;
- die eingebaute COSE-Simulation läuft auf dem Main Thread und blockiert schon bei einem lokalen Ausschnitt sichtbar;
- deutlich größeres Bundle und höherer Heap im gemessenen Lauf;
- die offizielle Dokumentation empfiehlt für große Graphen unter anderem einfachere Styles, reduzierte Pixeldichte und das Ausblenden von Kanten während der Interaktion – diese Maßnahmen waren im Spike bereits weitgehend aktiv.

## Entscheidung und Architekturfolgen

1. **Renderer:** Sigma.js 3.
2. **Graphmodell:** Graphology als clientseitige Darstellungsstruktur; das fachliche API-Modell bleibt davon getrennt.
3. **Layout:** ForceAtlas2 im Worker, mit vorberechneten Startpositionen und sichtbarer Möglichkeit zum Pausieren beziehungsweise Einfrieren.
4. **Kanten:** gerichtete Kanten; wiederholte Linkvorkommen werden nach der fachlichen Indexentscheidung entweder eindeutig oder aggregiert übernommen.
5. **Accessibility:** Canvas/WebGL wird immer durch eine synchronisierte HTML-Knoten- und Beziehungsliste ergänzt.
6. **Fallback:** Bei fehlendem WebGL wird nicht auf Cytoscape umgeschaltet, sondern die zugängliche Listenansicht mit klarer Meldung angeboten. Zwei produktive Renderer würden Verhalten und Tests unnötig verdoppeln.
7. **Cytoscape:** bleibt eine mögliche Bibliothek für spätere, kleine Analyseansichten, ist aber keine Abhängigkeit der produktiven Graphroute.

## Reproduktion

```sh
npm install
npm run spike:graph:build
PORT=4321 npm run spike:graph:start
```

Danach sind `http://localhost:4321/sigma.html` und `http://localhost:4321/cytoscape.html` erreichbar. Die Messwerte erscheinen rechts neben der Karte. Der vollständige Cytoscape-COSE-Stresstest ist bewusst nicht Teil des automatischen Laufs, da er den Browser im dokumentierten Versuch länger als 30 Sekunden blockierte.

Die generierten Dateien unter `spikes/graph-renderers/dist/` sind Build-Ausgaben und werden nicht versioniert.

## Quellen

- [Sigma.js Renderer](https://www.sigmajs.org/docs/advanced/renderers/): WebGL-basierte Rendering-Architektur.
- [Graphology ForceAtlas2](https://www.npmjs.com/package/graphology-layout-forceatlas2): Worker-API und Barnes-Hut-Optimierung.
- [Cytoscape.js](https://js.cytoscape.org/): Performancehinweise, Layouts und Eventmodell.
- [Cytoscape.js: Using layouts](https://blog.js.cytoscape.org/2020/05/11/layouts/): Bedeutung relevanter Teilgraphen und Grenzen großer Gesamtgraphen.
