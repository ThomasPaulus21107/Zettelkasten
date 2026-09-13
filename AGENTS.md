# Zettelkasten Interaktion — Arbeitsregeln

## Produktkontext

Dieses Repository ist die Interaktionsschicht für das externe Vault-Repository `ThomasPaulus21107/VAULTS`. Das Vault-Repository ist die Quelle; diese Anwendung liest und interpretiert sie, ersetzt sie aber nicht.

Die Quellen bestehen aus den getrennten Domänen `SX` (soziale Systeme) und `DX` (digitale Transformation). Derzeit gibt es rund 1.900 aktive Markdown-Dateien.

## Leitprinzipien

- Vault-Inhalte werden standardmäßig ausschließlich gelesen.
- Keine Vault-Dateien oder vertrauliche Zettelinhalte in dieses Repository kopieren oder einchecken.
- Die Anwendung macht Beziehungen nachvollziehbar: Herkunft, Typ, Richtung und Gewicht einer Kante bleiben sichtbar.
- Interaktion vor Dekoration: Ein Graph muss Suche, Fokus, Filter und Übergang zum Zettelinhalt anbieten.
- Große Datenmengen sind ein Kernfall; Indexierung und Darstellung müssen bei mehr als 1.000 Zetteln sinnvoll funktionieren.

## Fachmodell

- Ein **Knoten** ist ein Zettel, eindeutig über `vault + relativer Pfad`.
- Eine **Kante** ist eine Beziehung mit Herkunft, etwa Wiki-Link im Fließtext, `related` im YAML-Frontmatter, Tag, Area oder später semantische Ähnlichkeit.
- Ein **Rabbit Hole** ist ein nachvollziehbarer Erkundungspfad durch Zettel und Abzweigungen.

## Bekannte Quellkonventionen

- Wiki-Links sind Obsidian-kompatibel, case-insensitive und können Aliasse verwenden.
- Pfadpräfixe können vorkommen; die Auflösung folgt dem Zettelziel, nicht nur blind dem Linktext.
- Das Frontmatter enthält unter anderem `title`, `type`, `status`, `tags`, `related`, `aliases` und `area`.
- Archiv- und Backup-Pfade werden beim normalen Index ausgeschlossen.

Der aktuelle Prototyp bildet diese Regeln noch nicht vollständig ab. Insbesondere YAML-Blocklisten, Pfadmehrdeutigkeiten und die Trennung von Zetteln, Systemdateien, Logs und Entwürfen gelten bis zum Abschluss des verlässlichen Graphindex als bekannte technische Lücken.

## Dokumentation

- `CONCEPT.md` enthält Vision, Phasen und fachliche Entscheidungen.
- `PROJECT-STATUS.md` ist der geprüfte Übergabepunkt mit Ist-Stand, Risiken und Arbeitsreihenfolge.
- `DEVELOPMENT.md` beschreibt Desktop-Fortsetzung, lokalen Start, Tests und Git-Ablauf.
- `docs/vault-integration-contract.md` fasst den Integrationsvertrag der externen Vault-Quelle zusammen.
- `feature-request-<name>.md` beschreibt jeweils ein abgrenzbares Vorhaben.
- Neue Annahmen werden als offen markiert, bis sie bestätigt oder umgesetzt sind.

Bei einem neuen Projekt-Chat werden zuerst `AGENTS.md` und `PROJECT-STATUS.md` gelesen. Ohne eine anderslautende Nutzerpriorität ist `feature-request-verlaesslicher-graph-index.md` das nächste Increment.

## Externe Quelle und aktuelle Basis

Das externe Repository [`ThomasPaulus21107/VAULTS`](https://github.com/ThomasPaulus21107/VAULTS) ist die Quelle der Wahrheit. Besonders relevant sind dort `CLAUDE.md`, `SX/CLAUDE.md`, `DX/CLAUDE.md`, `Luhmann-Prinzipien.md` und `OFFENE-THEMEN.md`; sie werden nicht in dieses Repository kopiert. Der aktuelle lokale App-Snapshot umfasst rund 1.916 Knoten, 13.849 explizite Kanten und 417 unaufgelöste Linkziele. Diese Zahlen sind laufabhängig und ersetzen keine Messung aus dem Vault.

## Markdown-Statussignale

Damit Markdown-Arbeit im Gespräch unmittelbar erkennbar ist, wird eine knappe Kommentarzeile mit genau einem passenden Signal gesendet:

- 🗂️ nach dem vollständigen Lesen von `AGENTS.md`
- 📖 nach dem Lesen einer anderen Markdown-Datei
- ✍️ unmittelbar vor dem Erstellen oder Ändern einer Markdown-Datei

Die Signale werden nur verwendet, wenn die jeweilige Aktion tatsächlich stattgefunden hat oder als nächster Schritt unmittelbar bevorsteht.

## Git- und Release-Workflow

- Commit-Nachrichten folgen Conventional Commits, insbesondere `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` und `build:`. Inkompatible Änderungen kennzeichnen `!` im Typ oder einen `BREAKING CHANGE:`-Footer.
- Entwicklung ist trunk-orientiert: `main` bleibt integrierbar. Änderungen entstehen auf kleinen, kurzlebigen Branches, werden per Pull Request geprüft und zeitnah nach `main` gemergt.
- Branches benennen die Absicht, zum Beispiel `feature/focused-graph-canvas`, `fix/wikilink-resolution` oder `chore/tooling`.
- Semantic Release wird eingeführt, sobald die Anwendung als nutzbare Version veröffentlicht wird. Dann bestimmen Conventional Commits die Versionsstufe und das Changelog: `fix` für Patch, `feat` für Minor, Breaking Changes für Major.

## Sicherheitsgrenze für spätere Schreibfunktionen

Vorschläge, Entwürfe und Analysen bleiben getrennt von Vault-Dateien. Ein Schreibvorgang braucht stets sichtbare Quellen, Begründung, Vorschau und eine explizite Bestätigung.

## Strukturelle Verbesserungsvorschläge

Wenn eine Änderung an Frontmatter, Linksyntax, Dateibenennung, Taxonomie oder einer anderen Vault-Struktur die Zuverlässigkeit oder den Nutzen der Interaktionsschicht wesentlich verbessert, wird sie aktiv vorgeschlagen. Jeder Vorschlag beschreibt den konkreten Nutzen, die betroffenen Zettel, Risiken, einen Migrationsweg und ob das Feature ohne ihn bereits sinnvoll funktioniert. Strukturelle Vault-Änderungen werden niemals stillschweigend vorausgesetzt oder automatisch ausgeführt.
