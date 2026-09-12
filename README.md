# Zettelkasten Interaktion

Lokale, read-only Graphansicht für die SX- und DX-Vaults. Der erste Prototyp liest Markdown und zeigt pro ausgewähltem Zettel dessen direkte, explizite Nachbarschaft.

## Start

1. `vaults.config.example.json` nach `vaults.config.json` kopieren und die absoluten lokalen Pfade zu `SX` und `DX` eintragen.
2. `npm start` ausführen.
3. `http://localhost:4173` im Browser öffnen.

Es werden keine Abhängigkeiten installiert und keine Vault-Dateien geschrieben. Der Index entsteht bei jedem Abruf neu und bleibt dadurch immer ein Abbild des aktuellen Dateibestands. Die Graph-API liefert in diesem Increment ausschließlich Metadaten und Beziehungen, nicht den Markdown-Inhalt der Zettel.

## Aktueller Funktionsumfang

- schließt Archive, Backups und Obsidian-/Git-Metadaten aus
- liest `title`, `aliases`, `tags`, `area`, `status`, `type` und `related` aus dem Frontmatter
- löst Wiki-Links case-insensitiv über Dateiname, Titel und Aliasse auf
- unterscheidet Inline-Wiki-Links von `related`-Kanten
- zeigt Suche, Knotendetails und direkte Nachbarschaft

## Strukturelle Empfehlung

Die bestehende Struktur ist für dieses Increment ausreichend. Mittelfristig lohnt sich eine explizite Beziehungstypisierung im `related`-Feld, zum Beispiel `related: [{ target: "[[X]]", relation: "konkretisiert" }]`. Das macht Beziehungen maschinenlesbar, ohne die derzeitigen freien Textanmerkungen zu verlieren. Eine Migration ist für die Graphansicht nicht nötig und wird erst als separater, bestätigter Pflegevorschlag ausgearbeitet.
