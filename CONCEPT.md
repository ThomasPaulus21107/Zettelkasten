# Konzept: Zettelkasten Interaktion

## Vision

Die Anwendung macht aus zwei umfangreichen Zettel-Vaults eine erkundbare Denklandschaft. Sie soll nicht nur zeigen, was bereits verlinkt ist, sondern Abzweigungen sichtbar machen: Woran hängt ein Gedanke, wo liegt ein Übergang zwischen SX und DX und wo fehlt später möglicherweise ein eigener Zettel?

## Ausgangslage

Das externe Vault-Repository enthält die zwei bewusst getrennten Domänen:

| Vault | Fokus | Aktive Markdown-Dateien (Stand Analyse) |
| --- | --- | ---: |
| SX | soziale Systeme, Führung, Kommunikation, Wandel | ca. 1.360 |
| DX | digitale Transformation, Cloud, AI, Architektur, Daten | ca. 550 |

Die Zettel verfügen über Obsidian-Wiki-Links, Aliasse, YAML-Frontmatter, `related`-Bezüge und `area`-Zuordnungen. Dadurch ist ein Graph nicht nur aus Wortähnlichkeiten ableitbar, sondern zunächst aus kuratierten Beziehungen.

## Produktphasen

1. **Graph-Landkarte:** lokale, interaktive Visualisierung und Zettel-Fokus; ausschließlich lesend.
2. **Lesemodus:** ruhiges Lesen mit Rabbit-Hole-Pfaden und kontextuellen Abzweigungen.
3. **Pflegemodus:** erklärbare Hinweise zu Links, Struktur und möglichen Lücken.
4. **Zettelvorschläge:** quellengestützte Ideen und später editierbare Entwürfe.
5. **Web-Hosting:** Bereitstellung mit passendem Zugriffs- und Datenschutzmodell.

## Entscheidendes Modell für Phase 1

Die Graphansicht arbeitet mit einer klaren Beziehungshierarchie:

| Priorität | Kante | Bedeutung |
| --- | --- | --- |
| Hoch | Wiki-Link / `related` | explizit vom Zettelautor gesetzt |
| Mittel | gemeinsamer Index, Area oder Tag | strukturierter gemeinsamer Kontext |
| Später | semantische Ähnlichkeit | errechnete Hypothese, nie mit expliziten Links vermischen |

Der globale Graph dient als Orientierung. Die eigentliche Arbeit erfolgt in fokussierten Nachbarschaften: Zettel suchen, auswählen, Beziehungen verstehen, Abzweigung öffnen, Inhalt lesen und bei Bedarf zum Pfad zurückkehren.

## Nicht-Ziele der ersten Phase

- automatisches Erzeugen oder Ändern von Zetteln
- semantische KI-Verbindungen
- Hosting, Authentifizierung und Mehrbenutzerbetrieb
- vollständiger Lesemodus oder Pflegemodus

## Offene Produktentscheidungen

- Soll der Standardgraph SX und DX zunächst getrennt zeigen oder als gemeinsame Landkarte mit sichtbarer Vault-Grenze?
- Welcher Einstieg ist wertvoller: globale Übersicht, Suche oder ein zufällig kuratierter Startzettel?
- Welche Art „neuer Abzweigung" soll später vorrangig sein: strukturelle Lücke, thematische Nähe oder überraschende Brücke zwischen Domänen?
