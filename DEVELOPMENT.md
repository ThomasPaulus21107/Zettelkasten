# Weiterarbeit im Desktop-Projekt

Dieses Dokument hält fest, wie das Projekt nach einem Gespräch oder auf einem anderen Rechner weitergeführt wird.

## Projektkontext

Das lokale Projekt ist `/Users/thomaspaulus/Code/Zettelkasten/Zettelkasten`. Im Codex-Desktop sollte dieser Ordner als Projekt geöffnet sein. `AGENTS.md` wird automatisch aus dem Projektkontext berücksichtigt; die externe Datenquelle `VAULTS` bleibt ein separates Repository und wird nicht als Unterordner eingecheckt.

Für den Wechsel aus einem normalen Chat wird in der Desktop-App dieses Repository als lokales Projekt geöffnet und dort ein neuer Task begonnen. Der bestehende Chat muss nicht verschoben werden: Der notwendige Kontext liegt in den versionierten Markdown-Dateien. Falls die Oberfläche keine Aktion „In Projekt verschieben“ anbietet, ist das daher kein Hindernis.

Ein neues Gespräch kann mit diesem kurzen Kontext starten:

> Arbeite im Projekt Zettelkasten. Lies zuerst `AGENTS.md` und `PROJECT-STATUS.md`, danach `CONCEPT.md`, `DEVELOPMENT.md`, `docs/vault-integration-contract.md` und die aktive Feature-Datei. Die Vaults liegen separat und sind read-only. Beginne auf aktuellem `main`; nächstes Increment ist der verlässliche Graphindex, sofern ich nichts anderes priorisiere. Änderungen erfolgen auf einem kleinen Branch, werden getestet, committed und als Pull Request nach `main` geführt.

## Lokaler Prototyp

1. `vaults.config.example.json` nach `vaults.config.json` kopieren.
2. Die lokalen absoluten Pfade zu `SX` und `DX` eintragen.
3. Im integrierten Terminal `npm start` ausführen.
4. `http://localhost:4173` im Browser öffnen.
5. Mit `npm test` den Parser und die Auflösungstests ausführen.

`vaults.config.json` ist absichtlich ignoriert und darf keine Zugangsdaten oder Vault-Inhalte committen. Der Server bindet lokal an `127.0.0.1`; der aktuelle Graph liefert Metadaten und Kanten, nicht den Markdown-Körper.

Ein neuer Git-Worktree übernimmt ignorierte Dateien nicht. Dort muss `vaults.config.json` erneut lokal angelegt oder bewusst außerhalb von Git bereitgestellt werden. Die Vault-Pfade bleiben auf jedem Rechner bzw. Worktree lokale Konfiguration.

Die Desktop-App stellt ein integriertes Terminal bereit. Falls die Terminal-Schaltfläche nicht sichtbar ist, kann das Projektterminal über das Terminal-Menü bzw. die übliche Terminal-Kurztaste geöffnet werden. Für den lokalen Test genügt entweder der Browser in der Desktop-App oder ein normaler lokaler Browser.

Der Server besitzt derzeit kein Hot Reloading. Nach einem Pull oder Branchwechsel den laufenden Prozess mit `Ctrl+C` beenden und `npm start` erneut ausführen. `EADDRINUSE` bedeutet in der Regel, dass noch ein älterer Prozess denselben Port belegt. Der Prozess auf Port 4173 darf nicht allein aufgrund seiner URL als aktueller Quellstand betrachtet werden.

## Git-Ablauf

`main` bleibt integrierbar. Für eine Änderung:

```text
git switch main
git pull --ff-only origin main
git switch -c feature/<absicht>
# ändern und testen
git add <dateien>
git commit -m "docs: ..."   # Conventional Commit
git push -u origin feature/<absicht>
```

Danach wird ein Pull Request geöffnet, geprüft und zeitnah nach `main` gemergt. Branches beschreiben die Absicht, zum Beispiel `feature/focused-graph-canvas`, `fix/wikilink-resolution` oder `docs/complete-project-context`. Commits verwenden `feat`, `fix`, `docs`, `chore`, `refactor`, `test` oder `build`; Breaking Changes werden mit `!` oder einem `BREAKING CHANGE:`-Footer markiert. Semantic Release wird erst eingeführt, wenn eine veröffentlichte Anwendung mit versionierten Releases entsteht.

## Sicherheits- und Datenregeln

- Keine Vault-Dateien oder vertrauliche Zettelinhalte in dieses Repo kopieren.
- Keine Schreiboperation gegen den Vault ohne sichtbare Quellen, Diff, Begründung und explizite Bestätigung.
- Große Datenmengen sind normal; Änderungen an Parsern und Visualisierung müssen mit mehr als 1.000 Zetteln funktionieren.
- Bei Frontmatter-, Link- oder Taxonomieänderungen zuerst einen strukturellen Vorschlag dokumentieren: Nutzen, betroffene Zettel, Risiko, Migration und ob das Feature ohne Migration funktioniert.

## Bisheriger Produktstand

Die erste fokussierte Graphansicht ist als Early Prototype umgesetzt und nach `main` gemergt. Der geprüfte Stand mit Messwerten und Risiken steht in `PROJECT-STATUS.md`. Als nächstes wird `feature-request-verlaesslicher-graph-index.md` umgesetzt; erst danach folgen Filter, stabilere Layouts, Pfad-Historie und der Lesemodus. Pflege-, Generierungs- und Hosting-Funktionen bleiben bewusst spätere Feature Requests.
