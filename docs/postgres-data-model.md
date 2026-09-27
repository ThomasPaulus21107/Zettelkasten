# PostgreSQL-Datenmodell zwischen Vault und App

Stand: 25. September 2026 · Status: Zielentwurf, noch nicht umgesetzt

## Ziel und Zuständigkeiten

PostgreSQL ist die dauerhafte Arbeits- und Integrationsschicht der Anwendung. Es ersetzt GitHub nicht als Quelle der Zettelinhalte.

| Bereich | Maßgebliche Quelle |
| --- | --- |
| Markdown-Inhalt und Vault-Struktur | GitHub-Repository `ThomasPaulus21107/VAULTS` |
| Knoten, Kanten und Suchindex eines Commits | aus dem Vault reproduzierbare PostgreSQL-Daten |
| Interaktionshistorie, Coverage und Trefferquote | PostgreSQL |
| Meldungen zu generierten Quizfragen und Bearbeitungsstatus | PostgreSQL |
| Marker-Aufträge und ihr Bearbeitungsstatus | PostgreSQL |
| Umsetzung eines Markers im Markdown | späterer VAULTS-Prozess |

Die erste Ausbaustufe bleibt ein Einzelnutzersystem, wird aber direkt für PostgreSQL gebaut. Eine SQLite-Zwischenstufe ist nicht vorgesehen.

## Grundsätze

- Rohe Ereignisse und Statuswechsel werden dauerhaft gespeichert; Kennzahlen sind daraus ableitbare Projektionen.
- Es gibt keinen Zustand `gelernt`, `beherrscht` oder eine vergleichbare fachliche Behauptung.
- Eine auswertbare Interaktion erhöht die Coverage unabhängig davon, ob ihr Ergebnis zutreffend war.
- Zutreffende und nicht zutreffende Ergebnisse bleiben getrennt erhalten und bestimmen die Trefferquote.
- Zettelkörper werden nicht als App-Zustand dupliziert. Indexdaten verweisen auf eine konkrete GitHub-Revision.
- Jeder schreibende Request besitzt einen Idempotenzschlüssel.
- Marker werden von der App niemals direkt in den Vault geschrieben.

## Vorgeschlagene Tabellen

### Vault und Index

`vault_sources`

- `id` UUID, Primärschlüssel
- `code` Text, eindeutig, beispielsweise `SX` oder `DX`
- `repository` Text
- `branch` Text
- `created_at` Timestamptz

`vault_snapshots`

- `id` UUID, Primärschlüssel
- `source_id` UUID, Fremdschlüssel
- `commit_sha` Text
- `fetched_at` Timestamptz
- `indexed_at` Timestamptz, optional
- `status` mit `fetching`, `indexing`, `ready` oder `failed`
- `error_code` Text, optional und ohne vertrauliche Pfade oder Inhalte
- eindeutiger Schlüssel aus `source_id` und `commit_sha`

`notes`

- `id` UUID, stabile App-Identität
- `source_id` UUID, Fremdschlüssel
- `current_path` Text
- `first_seen_snapshot_id` UUID
- `last_seen_snapshot_id` UUID
- `retired_at` Timestamptz, optional

`note_versions`

- `note_id` UUID
- `snapshot_id` UUID
- `relative_path` Text
- `blob_sha` Text
- `title` Text
- `type`, `status` und `area` als normalisierte Indexfelder
- `metadata` JSONB für tolerierte Zusatzfelder
- Primärschlüssel aus `note_id` und `snapshot_id`

`edges`

- `id` UUID
- `snapshot_id` UUID
- `source_note_id` und `target_note_id` UUID
- `kind` für Wiki-Link, `related`, Area, Tag oder spätere berechnete Beziehungen
- `origin` JSONB mit nachvollziehbarer Herkunft, jedoch ohne vollständigen Zettelkörper
- Eindeutigkeit wird entsprechend der noch offenen Entscheidung zu wiederholten Linkvorkommen festgelegt.

## Interaktionen, Coverage und Trefferquote

`interaction_events` ist die fachliche Wahrheit. Ein Ereignis wird nicht überschrieben, wenn später eine weitere Interaktion mit demselben Zettel stattfindet.

- `id` UUID
- `note_id` UUID
- `snapshot_id` UUID für den gezeigten Vault-Stand
- `kind` Text, zunächst beispielsweise `quiz_answer`
- `outcome` mit `zutreffend` oder `nicht_zutreffend`
- `occurred_at` Timestamptz
- `idempotency_key` Text, eindeutig
- `context` JSONB für Fragetyp oder Runde, ohne unnötige Zettelinhalte

Abgeleitete Kennzahlen:

- **Coverage:** Anzahl unterschiedlicher Zettel mit mindestens einem auswertbaren Ereignis geteilt durch die Zahl der für den gewählten Ausschnitt berechtigten Zettel.
- **Trefferquote:** Anzahl zutreffender Ergebnisse geteilt durch alle ausgewerteten Ergebnisse.
- **Zettelansicht:** Anzahl Interaktionen, zutreffende und nicht zutreffende Ergebnisse sowie letzte Interaktion; kein Label „gelernt“.

Eine materialisierte Zusammenfassung kann später ergänzt werden, bleibt aber vollständig aus `interaction_events` rekonstruierbar. Eine einzelne Score-Formel wird erst eingeführt, wenn ihre Darstellung und Gewichtung fachlich festgelegt sind.

## Meldungen zu Quizfragen

`quiz_question_reports` hält Qualitätsmeldungen getrennt von Quizantworten. Eine Meldung verändert weder den Vault noch die ursprüngliche Interaktion.

- `id` UUID
- `note_id` UUID für den Quellzettel
- `snapshot_id` UUID für den Stand, aus dem die Frage erzeugt wurde
- `question_type` Text
- `reason` mit `unclear`, `multiple_correct`, `too_easy`, `wrong_attribution`, `broken_excerpt`, `missing_context` oder `other`
- `question_snapshot` JSONB mit Frage, Ausschnitt und Antwortoptionen; keine vollständigen Zettelkörper
- `status` mit `open`, `accepted`, `dismissed` oder `resolved`
- `idempotency_key` Text, eindeutig
- `reported_at`, `reviewed_at` und `resolved_at` Timestamptz
- `resolution_note` Text, optional

Mehrere identische Meldungen dürfen über den Idempotenzschlüssel zusammengeführt werden. Eine spätere Auswertung kann Fragetypen oder Generatorregeln mit überproportional vielen Meldungen sichtbar machen.

## Marker-Aufträge

`marker_requests`

- `id` UUID
- `note_id` UUID
- `source_snapshot_id` UUID
- `marker` mit `@add`, `@new`, `@fix` oder `@ask`
- `selected_text` Text, optional
- `anchor_before` und `anchor_after` Text, möglichst kurz
- `instruction` Text, abhängig vom Marker verpflichtend
- `status` mit `pending`, `claimed`, `applied`, `rejected` oder `conflict`
- `idempotency_key` Text, eindeutig
- `created_at`, `claimed_at` und `completed_at` Timestamptz
- `consumer_id` Text, optional
- `result_reference` Text, optional, beispielsweise der von VAULTS erzeugte Commit
- `failure_code` Text, optional

`marker_status_events`

- `id` UUID
- `marker_request_id` UUID
- `from_status` und `to_status`
- `occurred_at` Timestamptz
- `actor` Text
- `details` JSONB ohne vollständige Zettelkörper

Statuswechsel erfolgen atomar. VAULTS darf einen Auftrag nur einmal beanspruchen; Wiederholungen mit derselben Auftrags-ID müssen dasselbe Ergebnis liefern.

## Synchronisationsfluss

```text
GitHub/VAULTS
  → Commit abrufen und verifizieren
  → Snapshot und Index in PostgreSQL aufbauen
  → Snapshot atomar auf ready setzen
  → App liest ausschließlich einen ready-Snapshot

App
  → Interaktionsereignis oder bestätigten Marker-Auftrag speichern
  → PostgreSQL bestätigt die idempotente Operation

VAULTS-Prozess
  → offenen Marker-Auftrag beanspruchen
  → gegen aktuellen Vault-Stand prüfen und umsetzen
  → Status und Ergebnisreferenz zurückmelden
```

Ein fehlgeschlagener Indexlauf ersetzt niemals den zuletzt als `ready` markierten Snapshot. Ein Marker-Auftrag verändert den in der App sichtbaren Vault-Inhalt erst, wenn die resultierende GitHub-Revision erneut indexiert wurde.

## Technische Leitplanken

- Schemaänderungen laufen ausschließlich über versionierte Migrationen.
- Fremdschlüssel, Check Constraints und eindeutige Idempotenzschlüssel sichern die fachlichen Grenzen in der Datenbank ab.
- Zeitangaben werden als `timestamptz` in UTC gespeichert.
- Flexible Quellmetadaten dürfen in JSONB liegen; Kernfelder und Statuswerte bleiben typisiert und indexierbar.
- Der App-Datenbankbenutzer und der spätere VAULTS-Consumer erhalten getrennte, minimal notwendige Rechte.
- Backups müssen App-Zustand und Marker-Aufträge erfassen; der reproduzierbare Index kann bei Bedarf aus GitHub neu aufgebaut werden.

## Umsetzungsreihenfolge

1. PostgreSQL-Entwicklungsbetrieb, Migrationstool und Verbindungskonfiguration festlegen.
2. Vault-Snapshots, stabile Zettelreferenzen und Indeximport modellieren.
3. Quizantworten als idempotente `interaction_events` sowie Quizmeldungen speichern und Coverage, Trefferquote und offene Qualitätsmeldungen abfragen.
4. Marker-Aufträge mit Statushistorie speichern; die App bleibt dabei ohne Vault-Schreibrecht.
5. Den technischen Consumer-Vertrag für VAULTS festlegen und erst danach die Verarbeitung implementieren.

## Noch offen

- stabile Zettelidentität bei Umbenennungen: ID im Vault-Frontmatter oder Rename-Historie in PostgreSQL;
- Consumer-Vertrag für VAULTS: direkte Datenbankverbindung, eng begrenzte API oder Worker im App-System;
- genaue Menge der Interaktionen, die neben Quizantworten als auswertbar gelten;
- Aufbewahrungs- und Bereinigungsregeln für alte Index-Snapshots und Kontextanker.
