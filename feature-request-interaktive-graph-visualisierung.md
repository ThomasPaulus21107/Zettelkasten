# Feature Request: Interaktive Graph-Visualisierung

**Status:** Konzept · **Priorität:** zuerst

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
- Zoom, Verschieben und schrittweise Erweiterung der Nachbarschaft anbieten.
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
