# Graphansicht: Recherche und Umsetzung

Stand: 20. September 2026.

## Quellen und Einordnung

- [Cytoscape.js: Using layouts](https://blog.js.cytoscape.org/2020/05/11/layouts/) empfiehlt aufgabenbezogene Teilgraphen, topologische Nähe und begrenzte, navigierbare Ausschnitte. Ein anderes Layout allein löst die Unlesbarkeit dichter Gesamtgraphen nicht.
- [Cytoscape.js Dokumentation](https://js.cytoscape.org/) bietet umfangreiche Interaktions-, Analyse- und Layoutfunktionen. Das wäre eine passende Bibliothek bei einer größeren Ablösung des bestehenden Renderers.
- [Sigma.js](https://www.sigmajs.org/docs/) und dessen [Rendering-Schichten](https://www.sigmajs.org/docs/advanced/layers/) adressieren große Netze mit WebGL und getrennten Schichten für Beschriftungen und Hervorhebungen. Ein Bibliothekswechsel ist für die derzeit maximal 60 sichtbaren Räume nicht erforderlich; die Gesamtübersicht über Tausende Knoten bleibt ein separater Ausbau.

## Umgesetzt

Die vorhandene Canvas bleibt erhalten. Direkte Graphsuche mit maximal zwölf Treffern, ein Start mit einer Nachbarschaftsebene und Beziehungstypfilter machen die Erkundung gezielter. Eine gemeinsame Umfeldsteuerung koppelt Reichweite und sichtbare Räume: Direkt (eine Ebene, 30 Räume), Nah (zwei Ebenen, 45 Räume) und Weit (drei Ebenen, 60 Räume). Die tatsächliche Zahl erreichbarer Knoten wird zusätzlich angezeigt. Der Zeitraumfilter der News bleibt unabhängig.

Breitensuche ersetzt die bisherige Korridorheuristik. Ringdistanz ist damit die kürzeste ungerichtete Linkdistanz im gewählten Beziehungstyp; Pfeile behalten die originale Kantenrichtung. Bei Platzmangel werden Nachbarn nach Grad, dann Titel priorisiert. Tiefere Räume erhalten Winkelbereiche ihrer Eltern im ausgewählten Suchbaum. Dieser Baum ist eine Navigationshilfe, keine fachliche Hierarchie.

Knotenwahl fokussiert den Graphen, Lesen ist eine eigene Aktion. Ein Zurück-Button führt durch besuchte Mittelpunkte. Unveränderte Graphdaten lösen keinen Kamerareset aus. Hervorhebung betont ausschließlich direkt am überfahrenen oder per Tastatur gewählten Knoten anliegende Kanten. Eine aufklappbare HTML-Liste ermöglicht dieselben Knotenaktionen per Tastatur und zeigt Richtung, Linkherkunft und Anzahl der Vorkommen im sichtbaren Ausschnitt. Auf der Canvas wählen Pfeiltasten einen nahegelegenen Raum, Enter fokussiert ihn, Umschalt plus Pfeiltasten verschiebt die Ansicht.

## Grenzen

Die bekannte Klassifikation und Linkauflösung des Indexers bleiben unverändert. Systemdateien können weiterhin im Graphen auftreten. Die Beziehungsliste erklärt die sichtbaren aggregierten Kanten, bietet aber noch keine Sprungstellen zu einzelnen Markdown-Linkvorkommen. Umfangsbegrenzung und Vollgraph-Rendering bleiben Ausbaupunkte. Die aktuelle Änderung betrifft die Darstellung, nicht die Vault-Struktur.
