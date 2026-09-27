# Verworfene Variante: Direkter Marker-Schnellweg in das VAULTS-Repository

Stand: 25. September 2026 · Status: verworfen

> Dieses Dokument beschreibt eine verworfene Architekturvariante. Seit der Entscheidung vom 25. September 2026 schreibt die App Marker nicht direkt in das VAULTS-Repository. Sie speichert bestätigte Marker-Aufträge ausschließlich in PostgreSQL; ein späterer VAULTS-Prozess liest sie dort aus, setzt sie nach den Vault-Regeln um und meldet den Status zurück. Die folgenden Abschnitte bleiben nur als Entscheidungsverlauf erhalten und sind keine Umsetzungsgrundlage.

## Historische Kurzentscheidung

Für die vier Marker `@add`, `@new`, `@fix` und `@ask` ist keine zusätzliche Übergabedatei nötig. Der Marker im Zettel ist bereits der Arbeitsauftrag, den die VAULTS-Werkzeuge verstehen. Nach Vorschau und expliziter Bestätigung soll die lokale App deshalb genau diese eng begrenzte Änderung direkt in der betroffenen Markdown-Datei des Repositorys `ThomasPaulus21107/VAULTS` speichern, als eigenen kleinen Commit nach `main` pushen und anschließend den Leseindex auf diesen Commit aktualisieren.

Git wird damit selbst zur Übergabe: Der Dateidiff zeigt die Änderung, die Commit-Nachricht erklärt sie, und VAULTS findet den Marker an der fachlich richtigen Stelle. Eine zweite Warteschlange würde dieselbe Information duplizieren und könnte vom Zettel auseinanderlaufen.

Der Schnellweg gilt ausschließlich für Marker. Freie Textbearbeitung, Frontmatter, neue Zettel, Umbenennen, Verschieben, Löschen, mehrere Dateien und generierte Inhalte bleiben im Branch-/Pull-Request- beziehungsweise `_proposals/`-Weg.

## Warum kleine direkte Commits hier sinnvoll sind

- Marker werden nur gelegentlich gesetzt; die erwartete Commit-Zahl bleibt überschaubar.
- Jeder Commit ist atomar, einzeln verständlich und einzeln rücksetzbar.
- Der Vault-Agent muss keine separate Übergabestruktur interpretieren.
- Der Marker wird sofort von den bestehenden `maintain`-, `todo`- und Scan-Abläufen gefunden.
- GitHub bleibt Quelle der Wahrheit; der vergängliche Lesecache enthält keine exklusiven Änderungen.
- Konflikte betreffen genau einen Zettel und werden vor dem Push sichtbar.

Viele kleine Commits sind für diesen Fall kein technisches Problem, sondern ein brauchbarer Audit-Trail. Ein späteres Zusammenfassen würde die Zuordnung „diese Bestätigung erzeugte genau diesen Marker“ verschlechtern.

## Operationsklassen

| Änderung | Zielweg | Begründung |
| --- | --- | --- |
| einen der vier Marker an bestätigter Textstelle einsetzen | direkter Commit nach `main` | klein, atomar, vollständig rücksetzbar |
| Klartextauftrag unmittelbar hinter einem Marker ergänzen | derselbe direkte Marker-Commit | gehört semantisch zum Marker |
| vorhandenen Marker entfernen, nachdem seine Arbeit erledigt wurde | zunächst Pull Request | Entfernung behauptet Erledigung und braucht fachliche Prüfung |
| freier Textkörper-Edit | Branch und Pull Request | inhaltlich offen, größerer Prüfbedarf |
| Frontmatter ändern | Branch und Pull Request | beeinflusst Taxonomie und Index |
| neuer Zettel oder `@new`-Entwurf | `_proposals/` beziehungsweise Pull Request | eigene VAULTS-Prozessstufe |
| Umbenennen, Verschieben oder Löschen | Branch und Pull Request | Auswirkungen auf Links und Navigation |
| mehrere Dateien oder KI-generierter Inhalt | Branch und Pull Request | atomare Gesamtprüfung erforderlich |

## Architektur im lokalen Betrieb

```text
Browser im Lesemodus
  │ Marker + Textanker + Ausgangsrevision
  ▼
lokaler App-Server
  ├── Vorschau und explizite Bestätigung
  ├── Pfad-, Marker- und Konfliktprüfung
  ├── persistente Outbox nur bei Übertragungsfehlern
  └── isolierter Schreib-Worktree
          │ commit + normaler Push, niemals force
          ▼
GitHub: ThomasPaulus21107/VAULTS · main
          │ neuer Commit
          ▼
read-only Cache aktualisieren → Index neu bauen → Änderung sichtbar
```

Der heutige, bei jedem Abruf hart zurückgesetzte Cache bleibt strikt read-only. Schreibvorgänge dürfen ihn nicht verwenden. Für jede bestätigte Änderung erzeugt der Server einen isolierten Worktree aus einem aktuellen, dauerhaften Git-Mirror oder einen frischen temporären Clone. Dieser Schreibbereich wird nach erfolgreichem Push verworfen.

Zugangsdaten werden nicht in `vaults.config.json`, im Browser oder im Repository gespeichert. Im lokalen Betrieb verwendet der Schreibadapter die vorhandene Git-Credential-Konfiguration des Benutzers. Für das spätere Hosting übernimmt eine minimal berechtigte GitHub App dieselbe fachliche Operation.

## Gespeicherte Marker-Operation

Die App behandelt eine Bestätigung als unveränderliche Operation:

```json
{
  "operationId": "uuid",
  "noteId": "DX:Zettel/Embedded Technical Skills.md",
  "baseCommitSha": "…",
  "baseBlobSha": "…",
  "marker": "@add",
  "selectedText": "…",
  "anchorBefore": "…",
  "anchorAfter": "…",
  "instruction": "…",
  "confirmedAt": "…"
}
```

`selectedText` und die kurzen Anker dienen nur dazu, dieselbe Stelle im aktuellen GitHub-Stand sicher wiederzufinden. Der Server speichert keine vollständige Kopie des Zettels als Übergabeobjekt. `operationId` verhindert doppelte Commits bei wiederholten Requests oder einem unklaren Netzwerkfehler.

## Ablauf einer bestätigten Markierung

1. Die Lese-API liefert Zettelinhalt, `baseCommitSha`, Blob-SHA und Textrevision.
2. Rechtsklick und Markerwahl erzeugen wie heute ausschließlich eine Diff-Vorschau.
3. Die Bestätigung erzeugt eine unveränderliche Marker-Operation mit Idempotenz-ID.
4. Der Schreibadapter aktualisiert `origin/main` und richtet einen isolierten Worktree auf dessen Kopf ein.
5. Pfad, Dateiklasse, Blob-SHA, Textrevision und Kontextanker werden erneut geprüft.
6. Genau ein erlaubter Marker wird an genau einer Stelle eingesetzt; Frontmatter und übriger Text bleiben bytegetreu.
7. Gezielte Validierungen prüfen Markdown-Grenzen, Markerregeln, Dateigröße und den resultierenden Diff.
8. Der Adapter erzeugt genau einen Commit und pusht ihn ohne Force nach `main`.
9. Scheitert der Push als Non-Fast-Forward, wird einmal gegen den neuen `main`-Kopf erneut geprüft. Ist die Datei verändert, endet der Vorgang als Konflikt und wird nicht automatisch gemergt.
10. Nach erfolgreichem Push aktualisiert die App ihren Lesecache. Erst wenn der neue Commit indexiert ist, meldet die Oberfläche die Markierung als aktiv.

## Commitformat

Empfohlene Nachrichten:

```text
content(marker): add @add to Embedded Technical Skills

Vault: DX
Note: Zettel/Embedded Technical Skills.md
Operation-Id: 78c1…
Source-Revision: a31f…
```

Weitere Beispiele:

- `content(marker): add @new to Digital Transformation`
- `content(marker): add @fix to Systemtheorie`
- `content(marker): add @ask to LITERATUR`

Der Titel bleibt kurz; Trailer machen Herkunft und Idempotenz maschinenlesbar. Es gibt keinen zusätzlichen Eintrag in `log.md`, weil VAULTS triviale Einzelkorrekturen dort ausdrücklich ausnimmt.

## Markerregeln in der Oberfläche

Die vier Marker besitzen unterschiedliche Mindestanforderungen:

| Marker | Eingabe nach Auswahl |
| --- | --- |
| `@add` | optionaler kurzer Hinweis, was ergänzt werden soll |
| `@new` | empfohlenes Thema oder Arbeitstitel des neuen Zettels |
| `@fix` | erforderliche Beschreibung des technisch behebbaren Defekts |
| `@ask` | erforderliche konkrete, beantwortbare Frage |

Ein nacktes `@ask` widerspricht dem VAULTS-Vertrag und darf nicht direkt committed werden. Existiert im Zettel bereits ein offenes `@ask`, blockiert die App einen weiteren und verweist auf die vorhandene Frage. `@fix` darf nicht als allgemeines „hier stimmt etwas nicht“ verwendet werden; die Auswahloberfläche zeigt deshalb weiterhin die Bedeutung „technischer Defekt“.

Der Klartextauftrag steht direkt hinter dem Marker. Bei einer markierten Wortfolge entsteht beispielsweise:

```markdown
strategische und kulturelle Evolution @add Praxisbeispiel aus einer realen Organisation ergänzen
```

## Konflikte und Doppelübertragungen

- **Datei unverändert, `main` weitergelaufen:** Operation darf auf den neuen Kopf angewendet werden.
- **Datei verändert, Anker eindeutig und Änderung außerhalb des Zielkontexts:** In Version 1 trotzdem Konflikt anzeigen; kein automatischer Merge.
- **Datei verändert oder Anker mehrdeutig:** Operation bleibt in der Outbox und benötigt erneute Vorschau.
- **Marker steht bereits direkt an der Zielstelle:** Operation gilt als erfolgreich und erzeugt keinen zweiten Commit.
- **Request wiederholt:** `operationId` liefert das bereits vorhandene Ergebnis.
- **Push-Ergebnis unklar:** Vor einem erneuten Push werden Commit-Historie und `Operation-Id` geprüft.

## Lokale Outbox als Notfallpuffer

Wenn GitHub nicht erreichbar ist, darf die App die bestätigte Operation in einer persistenten lokalen Outbox speichern. Diese Outbox liegt weder im Interaktions-Repository noch im Vault-Cache und enthält nur die minimale Operation samt kurzen Kontextankern.

Die Oberfläche unterscheidet sichtbar:

- `Vorschau` – noch nicht bestätigt;
- `wartet auf Übertragung` – lokal dauerhaft gesichert, aber noch nicht im Vault;
- `wird committed`;
- `aktiv in <commit>`;
- `Konflikt – erneut prüfen`.

Ein Outbox-Eintrag darf nicht als aktueller Vault-Inhalt im Graph oder Reader erscheinen. GitHub bleibt bis zum erfolgreichen Push die Quelle der Wahrheit.

## Warum keine separate Übergabedatei für Marker

Eine Datei wie `_proposals/app-handoff/123.md` müsste Zielpfad, Textstelle, Marker und Auftrag wiederholen. Danach müsste ein zweiter Prozess diese Beschreibung interpretieren, den Zettel verändern und die Übergabe als verarbeitet markieren. Das erzeugt drei zusätzliche Fehlerzustände: Übergabe und Zettel driften auseinander, dieselbe Übergabe wird doppelt verarbeitet oder ein bereits erledigter Marker bleibt in der Warteschlange.

Für `@add` und `@new` ist `_proposals/` erst der Ort des später daraus entstehenden Inhalts, nicht der Ort zum Ablegen des Markierungsbefehls. Der Marker gehört gemäß VAULTS-Vertrag an die konkrete Stelle im Zettel. Der direkte Commit setzt genau diesen Vertrag um.

## Sicherheitsgrenzen

Der Schnellweg akzeptiert nur, wenn alle Bedingungen erfüllt sind:

- Ziel liegt unter einem explizit erlaubten Zettelpfad in `SX` oder `DX`;
- Zieldatei endet auf `.md` und ist weder Regel-, System-, Archiv- noch Proposal-Datei;
- Marker ist exakt einer von `@add`, `@new`, `@fix`, `@ask`;
- Änderung fügt ausschließlich Marker und Klartextauftrag ein;
- Diff verändert weder Frontmatter noch bestehende Zeichen;
- Ausgangsrevision und Kontext sind geprüft;
- Nutzer hat denselben Diff ausdrücklich bestätigt;
- Commit und Push verwenden niemals Force, Rebase auf fremde Änderungen oder automatische Konfliktauflösung.

Jede Abweichung verlässt den Schnellweg und wird als Pull-Request-Vorgang vorbereitet.

## Verhalten bei Branchschutz

Falls `main` direkte Pushes nicht erlaubt oder später stärker geschützt wird, wechselt der Schreibadapter automatisch auf den bereits konzipierten Branch-/Pull-Request-Weg. Die Markeroperation und Vorschau bleiben identisch; nur die Git-Ausgabe ändert sich. Die App erhält keine Berechtigung zum Umgehen von Branchschutz.

## Umsetzungsschritte

### Increment 1 – Schreibadapter für Marker

- Leseantwort um Commit- und Blob-SHA ergänzen;
- Markeroperation und Idempotenz-ID modellieren;
- isolierten Git-Worktree statt Cache-Schreibung verwenden;
- vier Markerregeln und erforderliche Klartexteingaben validieren;
- Commit und normalen Push nach `main` implementieren;
- Cache erst nach bestätigtem Remote-Commit aktualisieren.

### Increment 2 – Zuverlässigkeit

- persistente lokale Outbox;
- Wiederaufnahme nach Prozess- oder Netzwerkfehler;
- Konfliktansicht und erneute Vorschau;
- Commit-Suche über `Operation-Id`;
- Statusanzeige bis zum indexierten Commit.

### Increment 3 – Gehostete Entsprechung

- lokale Git-Credentials durch kurzlebiges GitHub-App-Token ersetzen;
- private Authentifizierung und Allowlist;
- Webhook statt lokalem Pull als primärer Indeximpuls;
- Pull-Request-Fallback bei Branchschutz.

## Abnahmekriterien

- Eine bestätigte Markierung erzeugt genau einen Remote-Commit und verändert genau eine erlaubte Markdown-Datei.
- Ohne Bestätigung entsteht weder Commit noch Outbox-Eintrag.
- Ein Reload nach erfolgreichem Push zeigt Marker und Commitrevision.
- Doppelklick, Timeout und Wiederholung erzeugen keinen zweiten Marker und keinen zweiten Commit.
- Ein paralleler Edit derselben Datei führt zu einem sichtbaren Konflikt.
- Bei GitHub-Ausfall bleibt die Operation eindeutig als lokal wartend erkennbar.
- Kein Schreibvorgang verwendet oder verändert den read-only Vault-Cache.
- `@ask` ohne konkrete Frage und ein zweites `@ask` im selben Zettel werden abgewiesen.
- Alle größeren Operationen verlassen den Schnellweg und erzeugen keinen direkten Commit.

## Empfehlung

Für die aktuelle Nutzung – überwiegend lesen und explorieren, gelegentlich einen Marker setzen – ist **ein direkter kleiner Commit pro bestätigtem Marker** die einfachste und fachlich sauberste Lösung. Eine separate Übergabe wird erst für Inhalte benötigt, die noch nicht selbst an den fachlich richtigen Ort geschrieben werden dürfen. Für diese Fälle existieren `_proposals/` und der geplante Pull-Request-Weg.
