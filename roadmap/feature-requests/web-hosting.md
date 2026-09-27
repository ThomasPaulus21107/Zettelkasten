# Feature Request: Web-Hosting

**Status:** Zielkonzept ausgearbeitet, Umsetzung später

## Ziel

Die Interaktionsschicht im Web bereitstellen, ohne Vault-Inhalte, Zugriffsrechte oder Privatheit zu gefährden.

Die erste Webversion ist vollständig privat. Lesen, Suche, Graph und Bearbeitung setzen eine authentifizierte und explizit freigeschaltete Sitzung voraus. Für Änderungen gilt ein Pull-Request-Workflow mit manuellem Self-Merge; eine zweite Freigabeperson ist nicht erforderlich.

## Abhängigkeiten

- Stabiler lokaler Lese- und Indexierungsworkflow
- Festlegung der konkreten Hosting-Plattform und des Identitätsanbieters
- Umsetzung der privaten Zugriffskontrolle für Rohzettel, Index und Graphdaten

## Schreibmodell

Für eine spätere gehostete Bearbeitung gilt der Pull-Request-Weg als empfohlene Grundlage: Die App erzeugt nach Vorschau und Bestätigung serverseitig einen Branch, Commit und Pull Request im Vault-Repository. Erst der Merge ändert die Quelle der Wahrheit; ein Webhook aktualisiert anschließend den Index. GitHub-Zugangsdaten bleiben vollständig auf dem Server. Ablauf, Sicherheitsmodell, Konfliktbehandlung, API-Grenze und Einführungsstufen stehen in [`docs/hosted-vault-write-concept.md`](../../docs/hosted-vault-write-concept.md).

Marker bilden eine Ausnahme: Sie werden als PostgreSQL-Aufträge gespeichert und später von VAULTS verarbeitet. Die App benötigt dafür keine GitHub-Schreibberechtigung.

## Geprüfte Betriebsoptionen

- **Render Frankfurt:** geeigneter Managed-Einstieg mit Web Service und PostgreSQL; ein persistentes Volume begrenzt jedoch Replikation und Zero-Downtime-Deployments.
- **Tailscale und eigener Rechner:** datensparsame Option für persönlichen Fernzugriff mit geringem Plattformaufwand.
- **Hetzner VPS:** gute Kontrolle und deutscher Standort, aber eigener Patch-, Backup- und Monitoringbetrieb.
- **Railway oder Fly.io:** technisch mögliche containerbasierte Alternativen mit eigenen Grenzen bei Volumes und Replikation.
- **Vercel oder Cloud Run:** erst nach Trennung von zustandsloser Web/API-Schicht, Indexer und dauerhaftem Speicher sinnvoll.
- **GitHub Pages:** nur für öffentliche Dokumentation oder eine künstliche Demo, nicht für die private Hauptanwendung.

Eine Hosting-Plattform ist noch nicht entschieden. Das frühere Render-Zielbild bleibt eine bewertete Option, keine Festlegung.
