# Weiterarbeit im Desktop-Projekt

Dieses Dokument hält fest, wie das Projekt nach einem Gespräch oder auf einem anderen Rechner weitergeführt wird.

## Projektkontext

Das lokale Projekt ist `/Users/thomaspaulus/Code/Zettelkasten/Zettelkasten`. Im Codex-Desktop sollte dieser Ordner als Projekt geöffnet sein. `AGENTS.md` wird automatisch aus dem Projektkontext berücksichtigt; die externe Datenquelle `VAULTS` bleibt ein separates Repository und wird nicht als Unterordner eingecheckt.

Ein neues Gespräch kann mit diesem kurzen Kontext starten:

> Arbeite im Projekt Zettelkasten. Lies zuerst `AGENTS.md`, danach bei Bedarf `CONCEPT.md`, `DEVELOPMENT.md` und die passende Feature-Datei. Die Vaults liegen separat und sind read-only. Änderungen erfolgen auf einem kleinen Branch, werden getestet, committed und als Pull Request nach `main` geführt.

## Lokaler Prototyp

1. `vaults.config.example.json` nach `vaults.config.json` kopieren.
2. Die lokalen absoluten Pfade zu `SX` und `DX` eintragen.
3. Im integrierten Terminal `npm start` ausführen.
4. `http://localhost:4173` im Browser öffnen.
5. Mit `npm test` den Parser und die Auflösungstests ausführen.

`vaults.config.json` ist absichtlich ignoriert und darf keine Zugangsdaten oder Vault-Inhalte committen. Der Server bindet lokal an `127.0.0.1`; der aktuelle Graph liefert Metadaten und Kanten, nicht den Markdown-Körper.

Die Desktop-App stellt ein integriertes Terminal bereit. Falls die Terminal-Schaltfläche nicht sichtbar ist, kann das Projektterminal über das Terminal-Menü bzw. die übliche Terminal-Kurztaste geöffnet werden. Für den lokalen Test genügt entweder der Browser in der Desktop-App oder ein normaler lokaler Browser.

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

Die erste fokussierte Graphansicht ist umgesetzt und nach `main` gemergt. Als nächste Increments bieten sich Filter, stabilere Layouts, Pfad-Historie und anschließend der Lesemodus an. Pflege-, Generierungs- und Hosting-Funktionen bleiben bewusst spätere Feature Requests.
