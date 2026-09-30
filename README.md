# Zettelkasten Interaktion

Lokale, read-only Graphansicht für die SX- und DX-Vaults.

## Start

1. vaults.config.example.json nach vaults.config.json kopieren und die absoluten lokalen Pfade zu SX und DX eintragen.
2. npm install ausführen.
3. npm start ausführen.
4. http://localhost:4173 im Browser öffnen.

Die Anwendung schreibt keine Vault-Dateien. Der Index entsteht bei jedem Abruf neu und bleibt dadurch ein Abbild des aktuellen Dateibestands. Die Graph-API liefert ausschließlich Metadaten und Beziehungen, nicht den Markdown-Inhalt der Zettel. Node.js 22 oder neuer ist erforderlich.

Der aktuelle Übergabestand und das nächste Increment stehen in [PROJECT-STATUS.md](PROJECT-STATUS.md). Für die Fortsetzung in der Desktop-App siehe [DEVELOPMENT.md](DEVELOPMENT.md). Der Integrationsvertrag zur getrennten Quelle steht in [docs/vault-integration-contract.md](docs/vault-integration-contract.md).

## Aktueller Funktionsumfang

- schließt Archive, Backups, Steuer-, Log- und Entwurfsdateien aus
- liest gültiges YAML inklusive Inline- und Blocklisten für aliases, tags, area und related
- löst Wiki-Links deterministisch über Pfad, eindeutigen Dateinamen, Titel oder Alias auf; mehrdeutige Ziele bleiben als Diagnose sichtbar
- löst Vault-übergreifende Ziele ausschließlich mit der Syntax `[[DX:Zettel/Pfad]]` oder `[[SX:Zettel/Pfad]]` auf
- erhält wiederholte Links als einzelne Kanten mit stabiler Reihenfolge und Quellposition
- unterscheidet Inline-Wiki-Links von related-Kanten
- zeigt Suche, Knotendetails und direkte Nachbarschaft

## Entwicklung

Tests laufen mit npm test. Die CI führt denselben Testlauf bei Pull Requests und Änderungen auf main aus.
