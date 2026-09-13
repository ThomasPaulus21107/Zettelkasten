# Integrationsvertrag für die Vaults

Dieses Dokument beschreibt, was die Interaktionsschicht über das externe Daten-Repository wissen muss. Die maßgeblichen Quelldateien liegen in [`ThomasPaulus21107/VAULTS`](https://github.com/ThomasPaulus21107/VAULTS) und bleiben dort. Der Vertrag ist eine Zusammenfassung, keine Kopie der Vault-Regeln.

## Quellen der Wahrheit

Für die Interpretation der Daten sind im Vault-Repository maßgeblich:

- `CLAUDE.md` im Root für gemeinsame Regeln und die Wahl zwischen den Domänen
- `SX/CLAUDE.md` für den Vault „soziale Systeme"
- `DX/CLAUDE.md` für den Vault „digitale Transformation"
- `Luhmann-Prinzipien.md` für die Prinzipien des Zettelkastens
- `OFFENE-THEMEN.md` für gemessene Befunde, offene Fragen und den Arbeitsvorrat

Die Anwendung darf diese Dateien lesen, aber nicht als vertrauliche Zettelinhalte in dieses Repository spiegeln. Wenn eine Regel hier und im Vault voneinander abweichen, ist der Vault maßgeblich und dieser Vertrag muss aktualisiert werden.

## Domänen und Profile

| Vault | Inhaltlicher Fokus | Titel-/Körpersprache | Bereiche | Besondere Regeln |
| --- | --- | --- | --- | --- |
| SX | soziale und lebende Systeme, Führung, Kommunikation, Wandel | Deutsch / Deutsch | kontrollierte Mehrfachzuordnung | freie Tags, Hypothesen vorsichtig formulieren |
| DX | digitale Transformation, Cloud, AI, Architektur, Daten | Englisch / Deutsch | genau ein kontrollierter Bereich | kontrollierte englische Tags, Export-/Public-Felder beachten |

Ein Zettel wird nach der Fragestellung geroutet: Menschen, Gruppen, Organisationen und soziale Veränderung gehören grundsätzlich nach SX; technische Artefakte, Architektur und Werkzeuge nach DX. Sozio-technische Grenzfälle bleiben sichtbar als offene Zuordnung und werden nicht stillschweigend umklassifiziert.

## Gemeinsames Datenmodell

Ein Knoten wird durch `vault + relativer Pfad` identifiziert. Relevante Frontmatter-Felder sind `title`, `type`, `status`, `tags`, `created`, optional `modified`, `related`, `aliases` und `area`; je nach Vault kommen `public`, `learning` oder mediale Herkunftsfelder hinzu. Die Anwendung muss unbekannte Zusatzfelder tolerieren.

Beziehungen werden nach Herkunft unterschieden:

1. explizite Wiki-Links im Text,
2. explizite `related`-Bezüge,
3. strukturierende Beziehungen über Area, Tag oder Index,
4. später berechnete semantische Ähnlichkeit.

Wiki-Links sind Obsidian-kompatibel, case-insensitive und können Aliasse sowie Pfadpräfixe enthalten. Die Auflösung erfolgt gegen Zielpfad, Dateiname, Titel und Aliasse. Unaufgelöste Ziele bleiben als sichtbare Befunde erhalten.

## Struktur- und Schreibgrenzen

- Prosa verwendet im Vault grundsätzlich keine künstlichen harten Zeilenumbrüche.
- Areas sind Navigation, keine versteckte Ordnerstruktur.
- Ein Inhalt soll nur einmal als Zettel existieren; MOCs und Indexzettel übernehmen Navigation.
- Jeder neue Zettel soll in ein bestehendes Netz eingeordnet werden; eingehende und begründete ausgehende Links sind wichtiger als lose Tag-Sammlungen.
- Indexzettel listen die Zettel eines Bereichs; Lücken in diesen Indizes sind Datenqualitätsbefunde, keine Berechtigung zum automatischen Umbau.
- `_proposals/`, offene Fragen und Arbeitsprotokolle sind Entwurfs- bzw. Entscheidungsräume und keine normalen Zettel.

Die Interaktionsschicht ist standardmäßig read-only. Vorschläge, Analysen und spätere Entwürfe bleiben getrennt vom Vault. Ein Schreibvorgang benötigt sichtbare Quellen, Begründung, Vorschau und explizite Bestätigung.

## Aktueller Messstand

Der lokale Indexer hat beim letzten Prototyp-Lauf (September 2026) aus den konfigurierten Vault-Pfaden 1.916 Knoten, 13.849 explizite Kanten und 417 nicht aufgelöste Linkziele erkannt. Diese Zahlen sind ein reproduzierbarer App-Snapshot, keine dauerhafte Statistik; für Qualitätsbefunde bleibt `OFFENE-THEMEN.md` im Vault die maßgebliche Quelle.

Die Anwendung schließt Archiv-, Backup-, `.obsidian`- und Git-Metadaten aus. Markdown-Körper werden im Graph-Increment nicht an den Browser ausgeliefert.

## Strukturelle Vorschläge

Die bestehende Struktur reicht für die erste Graphansicht aus. Als späterer, bestätigungspflichtiger Vorschlag bleibt eine typisierte Form von `related` offen, etwa `related: [{ target: "[[X]]", relation: "konkretisiert" }]`. Nutzen und Risiken müssen zunächst an echten Beispielen aus SX und DX geprüft werden; eine Migration ist nicht Voraussetzung für Graph, Suche oder Fokusansicht.
