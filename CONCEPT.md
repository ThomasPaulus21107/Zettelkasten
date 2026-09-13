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

Die detaillierten Quellregeln sind in [`docs/vault-integration-contract.md`](docs/vault-integration-contract.md) zusammengefasst. Die maßgeblichen Originale bleiben im separaten Vault-Repository. Der lokale Prototyp hat zuletzt 1.916 Knoten, 13.849 explizite Kanten und 417 unaufgelöste Linkziele erkannt; diese Werte dienen als Größenordnung für Indexierung und Darstellung.

## Produktphasen

1. **Verlässlicher Indexkern:** deterministische Quellinterpretation, sichere Ausgabe und belastbare Tests.
2. **Graph-Landkarte:** lokale, interaktive Visualisierung und Zettel-Fokus; ausschließlich lesend.
3. **Lesemodus:** ruhiges Lesen mit Rabbit-Hole-Pfaden und kontextuellen Abzweigungen.
4. **Pflegemodus:** erklärbare Hinweise zu Links, Struktur und möglichen Lücken.
5. **Zettelvorschläge:** quellengestützte Ideen und später editierbare Entwürfe.
6. **Web-Hosting:** Bereitstellung mit passendem Zugriffs- und Datenschutzmodell.

## Entscheidendes Modell für die Graph-Landkarte

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

## Getroffene Entscheidungen

- Das Projekt ist eine read-only Interaktionsschicht; die Vaults bleiben die Datenquelle und werden nicht in dieses Repo gespiegelt.
- SX und DX bleiben als Domänen erkennbar. Eine gemeinsame Karte ist möglich, muss die Vault-Grenze aber sichtbar lassen.
- Explizite Beziehungen werden zuerst visualisiert. Berechnete Ähnlichkeiten dürfen später nur als Hypothesen mit eigener Herkunft erscheinen.
- Strukturelle Änderungen an Frontmatter, Links oder Taxonomien werden vorgeschlagen, begründet und bestätigt; sie sind keine stille Voraussetzung für die erste Graphansicht.
- Die lokale Desktop-App ist der erste Ausführungsort. Web-Hosting ist ein späteres, eigenes Feature.
- Weiterarbeit erfolgt auf kurzlebigen Branches mit Conventional Commits, Pull Requests und zeitnahem Merge nach `main`.
- Datenkorrektheit geht vor weiteren sichtbaren Funktionen. Der geprüfte Projektstand und die Arbeitsreihenfolge stehen in [`PROJECT-STATUS.md`](PROJECT-STATUS.md).

## Offene Produktentscheidungen

- Soll der Standardgraph SX und DX zunächst getrennt zeigen oder als gemeinsame Landkarte mit sichtbarer Vault-Grenze?
- Welcher Einstieg ist wertvoller: globale Übersicht, Suche oder ein zufällig kuratierter Startzettel?
- Welche Art „neuer Abzweigung" soll später vorrangig sein: strukturelle Lücke, thematische Nähe oder überraschende Brücke zwischen Domänen?
