# Zettelkasten Interaktion

Lokale, read-only Graphansicht für die SX- und DX-Vaults. Der erste Prototyp liest Markdown und zeigt pro ausgewähltem Zettel dessen direkte, explizite Nachbarschaft.

## Start

1. `vaults.config.example.json` nach `vaults.config.json` kopieren und einen absoluten, ausschließlich für den GitHub-Cache bestimmten Pfad eintragen.
2. `npm start` ausführen.
3. `http://localhost:4173` im Browser öffnen.

Der aktuelle Übergabestand und das nächste Increment stehen in [`PROJECT-STATUS.md`](PROJECT-STATUS.md). Für die Fortsetzung in der Desktop-App siehe [`DEVELOPMENT.md`](DEVELOPMENT.md). Der Integrationsvertrag zur getrennten Quelle steht in [`docs/vault-integration-contract.md`](docs/vault-integration-contract.md).

Es werden keine Abhängigkeiten installiert und keine Vault-Dateien geschrieben. Vor jedem Abruf aktualisiert die Anwendung ihren lokalen Cache gegen den konfigurierten GitHub-Branch. Wenn dieser Abgleich scheitert, liefert sie keinen veralteten Stand als aktuell aus. Die Graph-API liefert ausschließlich Metadaten und Beziehungen, nicht den Markdown-Inhalt der Zettel.

## Aktueller Funktionsumfang

- schließt Archive, Backups und Obsidian-/Git-Metadaten aus
- liest `title`, `aliases`, `tags`, `area`, `status`, `type` und `related` aus dem Frontmatter
- löst Wiki-Links case-insensitiv über Dateiname, Titel und Aliasse auf
- unterscheidet Inline-Wiki-Links von `related`-Kanten
- zeigt Suche, Knotendetails und direkte Nachbarschaft

Das ist ein Early Prototype. Bekannte Abweichungen bei YAML-Blocklisten, gleichnamigen Linkzielen und Dateiklassifikation werden im nächsten Increment [„Verlässlicher Graphindex“](roadmap/feature-requests/verlaesslicher-graph-index.md) behoben. Die vollständige Planung und der geprüfte Funktionsstand stehen in der [Roadmap](roadmap/README.md).

## Strukturelle Empfehlung

Die bestehende Struktur ist für dieses Increment ausreichend. Mittelfristig lohnt sich eine explizite Beziehungstypisierung im `related`-Feld, zum Beispiel `related: [{ target: "[[X]]", relation: "konkretisiert" }]`. Das macht Beziehungen maschinenlesbar, ohne die derzeitigen freien Textanmerkungen zu verlieren. Eine Migration ist für die Graphansicht nicht nötig und wird erst als separater, bestätigter Pflegevorschlag ausgearbeitet.
