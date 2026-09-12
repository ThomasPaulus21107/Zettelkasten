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

## Dokumentation

- `CONCEPT.md` enthält Vision, Phasen und fachliche Entscheidungen.
- `feature-request-<name>.md` beschreibt jeweils ein abgrenzbares Vorhaben.
- Neue Annahmen werden als offen markiert, bis sie bestätigt oder umgesetzt sind.

## Markdown-Statussignale

Damit Markdown-Arbeit im Gespräch unmittelbar erkennbar ist, wird eine knappe Kommentarzeile mit genau einem passenden Signal gesendet:

- 🧭 nach dem vollständigen Lesen von `AGENTS.md`
- 📖 nach dem Lesen einer anderen Markdown-Datei
- ✍️ unmittelbar vor dem Erstellen oder Ändern einer Markdown-Datei

Die Signale werden nur verwendet, wenn die jeweilige Aktion tatsächlich stattgefunden hat oder als nächster Schritt unmittelbar bevorsteht.

## Sicherheitsgrenze für spätere Schreibfunktionen

Vorschläge, Entwürfe und Analysen bleiben getrennt von Vault-Dateien. Ein Schreibvorgang braucht stets sichtbare Quellen, Begründung, Vorschau und eine explizite Bestätigung.

## Strukturelle Verbesserungsvorschläge

Wenn eine Änderung an Frontmatter, Linksyntax, Dateibenennung, Taxonomie oder einer anderen Vault-Struktur die Zuverlässigkeit oder den Nutzen der Interaktionsschicht wesentlich verbessert, wird sie aktiv vorgeschlagen. Jeder Vorschlag beschreibt den konkreten Nutzen, die betroffenen Zettel, Risiken, einen Migrationsweg und ob das Feature ohne ihn bereits sinnvoll funktioniert. Strukturelle Vault-Änderungen werden niemals stillschweigend vorausgesetzt oder automatisch ausgeführt.
