# Umbauplan: Graph View im vertrauten Obsidian-Arbeitsmodell

Stand: 22. September 2026 · Status: Kernumbau umgesetzt, weitere Vertiefung offen

## Umsetzungsstand

Der eigenständige Arbeitsraum unter `/graph` ist mit Sigma.js, Graphology und ForceAtlas2 im Worker umgesetzt. Gesamt- und Lokalmodus, Suche, Hover, Auswahl, lokales Erkunden, Reader-Übergang, URL-Zustand, Facettenfilter, visuelle Gruppen, Waisensteuerung, getrennte Tiefe und Knotengrenze, Darstellungs- und Kraftregler sowie eine zugängliche Knotenliste sind funktionsfähig. Auf dem aktuellen Vault wurden 2.249 Zettel und 10.420 aggregierte gerichtete Beziehungen geprüft.

Noch offen sind vor allem der sichtbare Rabbit-Hole-Verlauf, ein Kanteninspektor mit vollständiger Herkunft und Sprungstelle, unaufgelöste Ziele als eigene Knoten, persistierte Einstellungen, mobile Bottom Sheets und automatisierte End-to-End- sowie Performance-Abnahmen. Der alte eingebettete Canvas bleibt bis zur vollständigen Funktionsparität als Referenz bestehen.

## Zielbild

Die Graph View wird zu einem eigenständigen, bildschirmfüllenden Arbeitsraum. Sie soll sich für Obsidian-Nutzer unmittelbar vertraut anfühlen, ohne dessen globale „Hairball“-Ansicht unkritisch zu kopieren. Der Wechsel zwischen Gesamtkarte und lokalem Umfeld, das Erkunden per Hover und Auswahl, Filter, visuelle Gruppen sowie eine ruhige physikbasierte Anordnung bilden den vertrauten Kern. Die Anwendung ergänzt ihn um erklärbare Kanten, eine sichtbare SX-/DX-Herkunft und den Rabbit-Hole-Verlauf.

Der Graph bleibt eine Lese- und Navigationsoberfläche. Er verändert keine Vault-Dateien.

## Ausgangslage und wichtigste Abweichungen

Der aktuelle Stand besitzt bereits Suche, Beziehungstypfilter, ein bis drei gekoppelte Umfeldstufen, Zoom, Pan, Zurück-Navigation, Tastatursteuerung und eine alternative Beziehungsliste. Die radiale BFS-Anordnung zeigt bis zu 30, 45 oder 60 Räume.

Im Vergleich zum vertrauten Obsidian-Arbeitsmodell fehlen vor allem:

- ein eigener, bildschirmfüllender Graph-Arbeitsraum statt eines Abschnitts am Ende der Startseite;
- ein klarer Wechsel zwischen **Gesamtgraph** und **lokalem Graph**;
- eine physikbasierte, clusterbildende Anordnung mit stabilen Positionen;
- ein ein- und ausblendbares Einstellungsdock für Filter, Gruppen, Darstellung und Kräfte;
- Zoom per Mausrad beziehungsweise Trackpad und direkte Graph-Tastenkürzel;
- die Trennung von Hover, Auswahl, Öffnen und „als neuen Mittelpunkt setzen“;
- Labels, die abhängig vom Zoom und Fokus ein- oder ausblenden, statt dauerhaft die Karte zu dominieren;
- Filter nach Vault, Area, Tag, Typ und Status sowie der sichtbare Umgang mit Waisen und unaufgelösten Zielen;
- eine kompakte, direkt am gewählten Knoten verfügbare Kontextanzeige.

## Zielinteraktion

### Gesamtgraph

- zeigt den vollständigen gefilterten Bestand als orientierende Karte;
- startet mit allen vorhandenen Zetteln, aber ohne Systemdateien, Archive und Backups;
- färbt SX und DX als erste, jederzeit sichtbare Gruppierung;
- lässt weitere Gruppen über bestehende Metadaten aktivieren;
- hebt beim Hover nur den Knoten, seine direkten Nachbarn und die betroffenen Kanten hervor;
- öffnet beim Klick eine Auswahlkarte, aber noch nicht den Reader;
- öffnet per Doppelklick oder expliziter Aktion den Zettel;
- wechselt über „Lokal erkunden“ in den lokalen Graphen.

### Lokaler Graph

- setzt den gewählten Zettel ins Zentrum und zeigt eine einstellbare Tiefe von eins bis fünf;
- bietet getrennte Grenzen für Tiefe und maximale Knotenzahl;
- unterscheidet eingehende, ausgehende und beidseitige Beziehungen;
- behält beim Wechsel des Mittelpunkts Kamera, Filter und Verlauf nachvollziehbar bei;
- zeigt den Rabbit-Hole-Pfad als Breadcrumb beziehungsweise Verlauf, ohne die Graphfläche zu überladen.

### Auswahl und Öffnen

Die vier Zustände müssen eindeutig bleiben:

1. **Hover:** Nachbarschaft hervorheben und Kurzinfo anzeigen.
2. **Auswahl:** Knoten fixieren und Kontextkarte öffnen.
3. **Lokal erkunden:** Knoten als Mittelpunkt des lokalen Graphen setzen.
4. **Lesen:** den Reader für den Zettel öffnen.

Ein einfacher Klick darf deshalb nicht mehr automatisch den Graphen neu aufbauen.

## Informationsarchitektur

Vorgeschlagene Route: `/graph`.

- **Kopfzeile:** Gesamt/Lokal-Umschalter, Suche, Zurück/Vorwärts, Reader-Aktion und Datenstand.
- **Graphfläche:** nimmt die verbleibende Viewportfläche ein; Zoom- und Zentriersteuerung liegen über der Karte.
- **Einstellungsdock:** rechts oder links einblendbar, mit den Bereichen Filter, Gruppen, Darstellung und Kräfte.
- **Kontextkarte:** kompakte Auswahlkarte mit Titel, Vault, Typ, Status, Linkzahlen, Kantenherkunft sowie Aktionen „Lokal erkunden“ und „Lesen“.
- **Mobile/schmal:** Einstellungsdock und Kontextkarte werden zu Bottom Sheets; zunächst ist nur der lokale Graph vorgesehen.

Die bestehende Startseite verlinkt auf den Graph-Arbeitsraum. Der bisherige eingebettete Graph kann nach erfolgreicher Migration entfallen.

## Einstellungsdock

### Filter

- Suchausdruck für Titel, Alias und Pfad;
- Vault: SX, DX oder beide;
- Beziehungstyp: Wiki-Link, `related` oder beide;
- Area, Tag, Typ und Status als Mehrfachauswahl;
- Schalter für Waisen, unaufgelöste Ziele und System-/Entwurfsdateien;
- im lokalen Graph: Tiefe und maximales Knotenbudget als getrennte Regler.

Die Oberfläche zeigt stets `sichtbar / passend / gesamt`, damit ein Limit nicht wie ein Filter wirkt.

### Gruppen

- Standardgruppen SX und DX;
- danach vordefinierte Gruppierung nach Area, Typ oder Status;
- keine frei formulierte Abfragesprache im ersten Increment;
- Prioritätsregel für Mehrfachzuordnung: manuell gewählte Gruppierung vor Vault, mit Vault als zusätzlichem Badge beziehungsweise Kontur.

### Darstellung

- Pfeile an/aus;
- Beschriftungsschwelle;
- Knotengröße;
- Kantenstärke;
- Gewichtung nach Zahl der Linkvorkommen an/aus;
- Kantenherkunft als Farbe beziehungsweise Strichart;
- reduzierte Bewegung und kontrastreiche Darstellung.

### Kräfte

- Zentrierkraft;
- Abstoßung;
- Linkkraft;
- Linkdistanz;
- Simulation pausieren beziehungsweise Positionen einfrieren;
- „Standard wiederherstellen“.

## Visuelle Sprache

- Nodes sind primär Punkte, nicht permanent beschriftete Karten.
- Titel erscheinen abhängig von Zoom, Grad, Auswahl und Hover.
- Knotengröße folgt standardmäßig dem eingehenden Grad, mit einer begrenzten logarithmischen Skala.
- SX und DX erhalten unterscheidbare Füllfarben; der gewählte Metadatengruppierer kann die Füllfarbe übernehmen, während die Vault-Herkunft als Kontur erhalten bleibt.
- Wiki-Links und `related` bleiben visuell unterscheidbar. Richtung wird optional per Pfeil sichtbar.
- Hover dimmt den Rest des Graphen; Auswahl bleibt sichtbar, bis sie aufgehoben wird.
- Unaufgelöste Ziele sind eigene, klar als fehlend markierte Knoten und keine normalen Zettel.
- Bei reduziertem Bewegungswunsch startet die Simulation ohne sichtbare Animation beziehungsweise friert früh ein.

## Technische Leitentscheidung

Der Renderer-Spike ist abgeschlossen; Ergebnisse und Messaufbau stehen in [`graph-renderer-comparison.md`](graph-renderer-comparison.md).

Beschlossen ist **Sigma.js mit Graphology und ForceAtlas2 im Worker** als gemeinsamer Renderer für Gesamt- und Lokalgraph. Cytoscape.js verfehlte bei 2.500 Knoten und 20.000 Kanten die Interaktionsbudgets deutlich und bleibt höchstens eine Option für spätere kleine Analyseansichten. Die bestehende Canvas dient als Referenz und wird nach erreichter Funktionsparität abgelöst.

Graphzustand, Filterung und Traversierung bleiben unabhängig vom Renderer als testbare Module implementiert. Die Kaltstartzeit lag im Spike noch über dem Zielwert und bleibt eine explizite Performance-Abnahme für Increment 1.

## Umsetzungsplan

### Increment 0 – Voraussetzungen und Messlatte

Abhängigkeit: Der verlässliche Graphindex liefert eindeutige Knoten und Kanten, belastbare Pfadauflösung, Klassifikation und sichere API-Werte.

- reale Größenordnung erneut messen und anonymisierte/synthetische Lastfixture ergänzen;
- Interaktionsbudget festlegen: erste bedienbare Darstellung unter 1,5 Sekunden lokal, Hover-Reaktion unter 100 Millisekunden, flüssiges Pan/Zoom;
- Renderer-Spike durchführen und Entscheidung dokumentieren;
- Zustandsmodell für Modus, Filter, Gruppen, Darstellung, Kräfte, Kamera und Auswahl festlegen;
- bestehende Graph-Tests um Filter-, Auswahl- und Verlaufszustände erweitern.

**Abnahme:** Rendererentscheidung ist nachvollziehbar, die Lastfixture reproduzierbar und die Graphlogik nicht mehr an DOM oder Canvas gekoppelt.

### Increment 1 – Neuer Graph-Arbeitsraum und vertraute Grundinteraktion

- Route `/graph` und bildschirmfüllendes Layout anlegen;
- lokalen Graphen zunächst mit Tiefe eins und dem neuen Renderer umsetzen;
- Scroll-/Trackpad-Zoom, Drag-Pan, Zentrieren und Fit-to-view;
- Hover, Auswahl, Doppelklick/Lesen und „Lokal erkunden“ trennen;
- Einstellungsdock mit Filter- und Darstellungsgrundlagen;
- Auswahlkarte und bestehende alternative Beziehungsliste anbinden;
- URL-Zustand für Modus und fokussierten Zettel, damit Ansichten teilbar und per Zurück-Taste navigierbar sind.

**Abnahme:** Ein Obsidian-Nutzer kann ohne Anleitung suchen, einen Knoten untersuchen, lokal fokussieren und lesen; ein einfacher Klick zerstört den aktuellen Kontext nicht.

### Increment 2 – Lokaler Graph als belastbares Rabbit Hole

- Tiefe eins bis fünf und Knotenbudget entkoppeln;
- eingehende, ausgehende und beidseitige Beziehungen darstellen;
- Filter nach Vault, Area, Tag, Typ, Status und Beziehungstyp vervollständigen;
- Rabbit-Hole-Verlauf mit Zurück/Vorwärts und Breadcrumb integrieren;
- Kanteninspektor mit Herkunft, Richtung, Gewicht und späterer Sprungstelle ergänzen;
- Tastaturnavigation und Screenreader-Liste auf denselben Auswahlzustand bringen.

**Abnahme:** Kürzeste Linkdistanzen bleiben korrekt; Limits, Filter und ausgeblendete Räume sind erkennbar; jede sichtbare Kante ist erklärbar.

### Increment 3 – Gesamtgraph und Gruppen

- vollständigen gefilterten Graphen progressiv rendern;
- SX/DX sowie Area/Typ/Status als umschaltbare Gruppen;
- Waisen und unaufgelöste Ziele steuerbar machen;
- Simulation im Worker, pausierbare Kräfte und stabile Positionen;
- „Gesamt → Lokal“ und „Lokal → Gesamt mit Auswahl“ ohne Kontextverlust;
- sinnvolle Voreinstellung für 2.000+ Knoten: reduzierte Labels, keine Pfeile, moderate Kantentransparenz.

**Abnahme:** Der gesamte Bestand bleibt auf Referenzhardware interaktiv und die Karte zeigt erkennbare Cluster, ohne dass Labels oder Pfeile den Startzustand überladen.

### Increment 4 – Feinschliff, Persistenz und mobile Reduktion

- persönliche Graph-Einstellungen lokal im Browser speichern und zurücksetzbar machen;
- optional benannte Ansichten erst nach Nutzungserfahrung evaluieren;
- mobile lokale Ansicht mit Bottom Sheets;
- reduzierte Bewegung, Kontrast, Fokusindikatoren und Touch-Ziele prüfen;
- visuelle Regressionen und Performance-Budgets in die Teststrecke aufnehmen;
- alten eingebetteten Canvas entfernen, wenn Funktionsparität erreicht ist.

**Abnahme:** Einstellungen überstehen einen Reload, die Kernaufgaben funktionieren mit Maus, Tastatur und Touch, und es existiert nur noch eine produktive Graph-Implementierung.

## Teststrategie

- **Unit:** Filterkombinationen, BFS-Tiefe, Richtung, Aggregation, Limits, Verlauf und URL-Serialisierung.
- **Komponenten:** Hover/Auswahl/Öffnen, Dock-Steuerung, Kontextkarte und Tastaturbefehle.
- **End-to-End:** Suche → Auswahl → lokaler Graph → Kante prüfen → Reader → zurück zum Graphzustand.
- **Barrierefreiheit:** sichtbarer Fokus, vollständige Tastaturbedienung, reduzierte Bewegung, alternative Liste und verständliche Statusmeldungen.
- **Performance:** 2.500 Knoten/20.000 Kanten sowie lokale Ausschnitte mit 30, 60, 120 und 250 Knoten.
- **Visuell:** Gesamtgraph, lokaler Graph, dichte Nachbarschaft, lange deutsche Titel, SX/DX-Mischung, fehlende Ziele und schmale Viewports.

## Bewusste Abweichungen von Obsidian

- Kantenherkunft, Richtung und Gewicht bleiben fachlich sichtbar und sind nicht nur Dekoration.
- Tiefe und Knotenbudget werden getrennt, damit eine tiefe Exploration nicht unkontrolliert den gesamten Bestand lädt.
- Der lokale Graph ist das primäre Arbeitswerkzeug; der Gesamtgraph dient Orientierung und Mustererkennung.
- Metadatenbasierte Gruppen verwenden zunächst feste, verständliche Facetten statt einer eigenen Suchsyntax.
- Vault-Herkunft bleibt auch dann erkennbar, wenn eine andere Gruppierung die Knotenfarbe übernimmt.
- Keine Timeline-Animation im ersten Ausbau; sie trägt nicht zum Kernfluss „finden, verstehen, folgen, lesen“ bei.

## Empfohlener Zuschnitt für den ersten Pull Request

Der erste Pull Request umfasst nur Increment 0 und das Gerüst von Increment 1: Renderer-Spike, entkoppeltes Graphzustandsmodell, `/graph`-Route, bildschirmfüllende leere Arbeitsfläche sowie dokumentierte Performance- und Interaktionsmessung. Dadurch bleibt die technische Richtungsentscheidung klein und überprüfbar, bevor die bestehende Canvas ersetzt wird.

## Referenz

Die offizielle Obsidian-Hilfe beschreibt Gesamt- und Lokalgraph, Hover-Hervorhebung, Klick zum Öffnen, Mausrad-/Tastatur-Navigation sowie die Einstellungsgruppen Filter, Groups, Display und Forces: <https://obsidian.md/help/plugins/graph>.
