# Feature Request: Interaktive Graph-Visualisierung

**Status:** Graph-Arbeitsraum umgesetzt, Version 1 teilweise offen · **Priorität:** nach verlässlichem Graphindex

## Ziel

Eine lokale, interaktive Landkarte der Zettel schaffen. Sie nimmt Obsidian Graph View und Capacities als Referenz, legt den Schwerpunkt aber auf fokussiertes Erkunden statt auf eine unlesbare Vollansicht.

## Nutzerfluss

1. Vault oder Vault-Kombination wählen.
2. Über Suche oder Karte einen Zettel auswählen.
3. Direkte Nachbarn nach Kantenart verstehen und filtern.
4. Eine Abzweigung gezielt aufklappen und den Zettelinhalt lesen.
5. Zum bisherigen Erkundungskontext zurückkehren.

## Funktionsumfang Version 1

- Externe Vault-Pfade nur lesend einlesen; `_archive` und Backups ausschließen.
- Obsidian-Wiki-Links auflösen, einschließlich case-insensitiver Namen, Aliasse und Pfadpräfixe.
- Kanten aus Wiki-Links und `related` anzeigen und klar als explizite, kuratierte Beziehungen kennzeichnen.
- Knoten nach Vault, Area, Tag, Typ und Status filterbar machen.
- Suche nach Titel, Alias und Pfad; Auswahl zentriert die lokale Nachbarschaft.
- Fokus-Canvas mit ausgewähltem Zettel im Zentrum und direkten Nachbarn als klickbare Knoten anzeigen.
- Zoom, Verschieben und Zurücksetzen der Canvas-Ansicht anbieten.
- Fehlende Linkziele sichtbar machen, aber nie automatisch korrigieren.
- Details zu einem Knoten zeigen: Titel, Vault, Pfad, Metadaten und Beziehungen.

## Nicht-Ziele

- Schreibzugriffe oder automatische Reparaturen im Vault
- KI-gestützte oder rein semantische Verbindungen
- Bereitstellung im Web
- vollwertiger Rabbit-Hole-Lesemodus

## Akzeptanzkriterien

- Ein bekannter Zettel ist über Suche auffindbar und sein lokaler Kontext in wenigen Interaktionen verständlich.
- Nutzer können jederzeit erkennen, ob eine Kante aus einem Inline-Link, dem `related`-Feld oder einer späteren Ableitung stammt.
- Die Ansicht bleibt bei der aktuellen Größenordnung (ca. 1.900 aktive Zettel) bedienbar; große Gesamtansichten werden progressiv statt vollständig geladen.
- SX und DX sind in der Darstellung eindeutig unterscheidbar.

## Offene Entscheidung

Festzulegen ist, ob der erste Startzustand getrennte SX-/DX-Landkarten oder eine gemeinsame Karte mit prominenter Domänengrenze zeigt.

## Erstes Increment

Ein lokaler, read-only Indexer erstellt aus konfigurierten Vault-Pfaden einen Graphen. Eine schlanke Browseroberfläche bietet Suche, Knotendetails, eine fokussierte direkte Nachbarschaft und eine interaktive Canvas-Karte. Bei großen Nachbarschaften zeigt die Karte die ersten 36 Knoten, während die vollständige Beziehungsliste weiterhin erreichbar bleibt. Die Vollansicht, Strukturkanten aus Tags und Areas sowie semantische Ähnlichkeit folgen erst später.

Der ursprüngliche Prototyp ist nach `main` gemergt. Der anschließende Umbau ergänzt einen eigenständigen Graph-Arbeitsraum mit Sigma.js, Graphology und ForceAtlas2 im Worker. Als nächste Ausbaustufen gelten Pfad-Historie, Kanteninspektor, unaufgelöste Ziele, persistierte Einstellungen und mobile Reduktion.

Der geplante Umbau zu einem eigenständigen, an Obsidian vertrauten Graph-Arbeitsraum ist in [`docs/graph-view-obsidian-plan.md`](../../docs/graph-view-obsidian-plan.md) beschrieben. Er trennt Gesamt- und Lokalgraph, Auswahl und Öffnen sowie Tiefe und Knotenbudget. Ein Renderer-Spike ist das erste Entscheidungstor.

## Tatsächlicher Stand

Umgesetzt sind read-only Indexierung, die Route `/graph`, Gesamt- und Lokalmodus, physikbasiertes Worker-Layout, Suche, Auswahlkarte, Doppelklick beziehungsweise Aktion zum Lesen, Filter nach Vault, Beziehungstyp, Area, Tag, Typ und Status, Waisensteuerung, Gruppierung nach Metadaten, Darstellungs- und Kraftregler, getrennte lokale Tiefe und Knotengrenze, URL-Zustand sowie eine zugängliche Knotenliste. Die Graphlogik für Aggregation, Filter und Breitensuche ist vom Renderer getrennt und automatisiert getestet.

Noch offen sind Pfad-Historie als sichtbarer Rabbit-Hole-Verlauf, ein vollständiger Kanteninspektor, eigene Knoten für unaufgelöste Ziele, persistierte Einstellungen, mobile Bottom Sheets und die belastbare Behandlung mehrdeutiger Linkziele. Diese Punkte bauen weiterhin auf [„Verlässlicher Graphindex“](verlaesslicher-graph-index.md) auf.
