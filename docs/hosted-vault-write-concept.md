# Konzept: Sichere Vault-Änderungen aus einer gehosteten Web-App

Stand: 22. September 2026 · Status: Zielkonzept, noch nicht umgesetzt

## Kurzentscheidung

Die gehostete Anwendung schreibt nicht in einen lokalen Git-Cache und standardmäßig nicht direkt nach `main`. Eine bestätigte Änderung erzeugt serverseitig einen kurzlebigen Arbeitsbranch, einen nachvollziehbaren Commit und einen Pull Request im Repository `ThomasPaulus21107/VAULTS`. Erst der Merge dieses Pull Requests verändert die Quelle der Wahrheit. Ein GitHub-Webhook aktualisiert danach den Leseindex auf genau den neuen Commit.

Der Browser erhält zu keinem Zeitpunkt GitHub-Zugangsdaten. Der Server authentifiziert den Benutzer, prüft die Berechtigung und verwendet für den einzelnen Schreibvorgang ein kurzlebiges, auf das Vault-Repository begrenztes Installationstoken einer GitHub App.

## Ziele

- GitHub bleibt die einzige Quelle der Wahrheit.
- Jede Änderung besitzt Urheber, Grund, Ausgangsrevision, sichtbaren Diff und explizite Bestätigung.
- Gleichzeitige Änderungen werden als Konflikt angezeigt und nicht stillschweigend überschrieben.
- Öffentlicher Lesezugriff und authentifizierter Schreibzugriff sind technisch getrennt.
- Ein kompromittierter Browser kann kein dauerhaftes GitHub-Token auslesen.
- Die App kann Schreibfunktionen schrittweise einführen, ohne den read-only Betrieb zu gefährden.

## Nicht-Ziele der ersten Version

- automatische Merges in `main`;
- automatische Konfliktauflösung;
- freie Bearbeitung beliebiger Repository-Dateien;
- Änderungen an `.github`, GitHub Actions, Vault-Regeldateien oder App-Konfiguration;
- mehrere Dateien in einer einzigen redaktionellen Änderung;
- KI-generierte Inhalte ohne menschliche Vorschau und Bestätigung.

## Empfohlenes Betriebsmodell

```text
Browser
  │ HTTPS + sichere Sitzung
  ▼
Web/API (Backend for Frontend)
  ├── Authentifizierung und Rollen
  ├── Vorschau, Diff und Validierung
  ├── Konflikt- und Idempotenzprüfung
  └── kurzlebiges GitHub-App-Installationstoken
          │
          ▼
GitHub: ThomasPaulus21107/VAULTS
  ├── main: geschützte Quelle der Wahrheit
  ├── app/edit/...: kurzlebige Änderungsbranches
  └── Pull Requests: Prüfung und Freigabe
          │ push-/pull_request-Webhook
          ▼
Indexer-Worker → unveränderlicher Index-Snapshot pro Commit
```

Die Web/API-Schicht, nicht der Browser, ist die Vertrauensgrenze. Der Indexer liest einen konkreten Commit und erzeugt daraus einen versionierten Snapshot. Ein lokales Checkout kann ein Implementierungsdetail des Workers bleiben, wird aber niemals direkt durch einen Web-Request bearbeitet.

## Nutzerfluss

### 1. Zettel öffnen

Die Lese-API liefert neben Inhalt und Metadaten mindestens:

- `noteId` aus Vault und relativem Pfad;
- den gelesenen `baseCommitSha`;
- den Git-Blob-SHA der Datei;
- eine Revision des bearbeitbaren Textkörpers;
- den Zeitpunkt und Status des Index-Snapshots.

Damit ist sichtbar, gegen welchen unveränderlichen Stand der Benutzer arbeitet.

### 2. Lokal bearbeiten

Der Entwurf bleibt zunächst im Browser. In Version 1 darf nur der Markdown-Textkörper verändert werden. Frontmatter wird serverseitig aus der aktuellen Quelldatei übernommen. Die Oberfläche verhindert nicht nur versehentliche Navigation, sondern zeigt auch klar „Entwurf – noch nicht im Vault“.

### 3. Vorschau erzeugen

`Vorschau` sendet Ausgangsrevision, neuen Textkörper und eine Begründung an den Server. Der Server:

1. authentifiziert Benutzer und Rolle;
2. löst `noteId` ausschließlich gegen erlaubte Pfade auf;
3. lädt Datei und aktuellen `main`-Commit frisch von GitHub;
4. vergleicht Commit, Blob-SHA und Textrevision;
5. bewahrt Frontmatter bytegetreu und ersetzt nur den Textkörper;
6. validiert Größe, UTF-8, Markdown-Grenzen und erlaubte Dateiklasse;
7. erzeugt einen serverseitigen Diff und einen kurzlebigen, einmal verwendbaren Vorschau-Datensatz.

Die Antwort enthält den Diff, den noch einmal gelesenen Quellstand und eine `previewId`, aber keine Schreibberechtigung.

### 4. Explizit bestätigen

Der Bestätigungsdialog zeigt:

- Vault, Pfad und Titel;
- Ausgangscommit;
- vollständigen Diff;
- Begründung;
- erwartete externe Wirkung: „Erstellt einen Branch und Pull Request, ändert `main` noch nicht“.

Die Bestätigung sendet nur `previewId` und einen eindeutigen `clientMutationId`. Der Server akzeptiert sie nur, wenn Benutzer, Inhalt, Diff-Hash und Ausgangsrevision unverändert sind. Doppelklicks oder Wiederholungen erzeugen dank Idempotenzschlüssel keinen zweiten Pull Request.

### 5. Branch, Commit und Pull Request erzeugen

Der Server beschafft erst jetzt ein kurzlebiges GitHub-App-Installationstoken und führt seriell aus:

1. aktuellen Kopf von `main` lesen;
2. Konfliktprüfung gegen Blob-SHA und Revision wiederholen;
3. Branch `app/edit/<datum>-<slug>-<kurz-id>` vom geprüften `main`-Commit erzeugen;
4. genau die erlaubte `.md`-Datei auf diesem Branch aktualisieren;
5. Commit mit einer konventionellen Nachricht erzeugen, etwa `content(SX): marker in systemtheorie ergänzen`;
6. Pull Request nach `main` öffnen.

Der Pull-Request-Text enthält Benutzeridentität, Begründung, Zettel-ID, Ausgangscommit und eine Kennung des App-Vorgangs. Keine Sitzungsdaten oder geheimen Tokens werden aufgenommen.

Für eine einzelne Datei reicht die GitHub Contents API. Sobald eine fachliche Änderung mehrere Dateien atomar ändern muss, werden Git-Blobs, Tree und Commit über die Git-Database-API erzeugt; dies ist nicht Teil der ersten Version.

### 6. Prüfen und mergen

`main` ist geschützt. Pull Requests müssen mindestens die Vault-Validierung und Linkprüfung bestehen. Für die erste gehostete Version gilt ein manueller Self-Merge. Eine Freigabe durch eine zweite Person ist im privaten Einzelnutzerbetrieb nicht erforderlich. Der Pull Request bleibt dennoch die sichtbare Prüfstufe zwischen bestätigtem Vorschlag und Quelle der Wahrheit.

Die App zeigt den Vorgang als `PR offen`, verlinkt auf GitHub und behandelt den geänderten Text noch nicht als aktuellen Vault-Inhalt.

### 7. Index aktualisieren

Nach einem Push auf `main` prüft der Server die Signatur und Zustellungskennung des GitHub-Webhooks. Der Indexer baut oder aktualisiert den Snapshot für den neuen Commit. Erst wenn dieser Snapshot erfolgreich veröffentlicht wurde, liefert die Anwendung ihn als aktuell aus. Webhook-Ereignisse werden dedupliziert; ein periodischer Abgleich dient nur als Reparaturmechanismus für verpasste Ereignisse.

## Zustandsmodell einer Änderung

```text
ENTWURF
  → VORSCHAU_GEPRÜFT
  → WIRD_EINGEREICHT
  → PR_OFFEN
      ├── GEMERGT → INDEX_WIRD_AKTUALISIERT → AKTIV
      ├── ABGELEHNT
      └── KONFLIKT

Jeder Serverschnitt kann außerdem in FEHLGESCHLAGEN enden und sicher wiederholt werden.
```

`ENTWURF` ist Browserzustand. Ab `VORSCHAU_GEPRÜFT` existiert ein kurzlebiger serverseitiger Vorgang. GitHub bleibt ab `PR_OFFEN` der dauerhafte Audit-Trail. Eine kleine Betriebsdatenbank speichert nur Vorgangsstatus, Idempotenzschlüssel, GitHub-IDs und Auditmetadaten; sie wird nicht zu einer zweiten Quelle für Zettelinhalte.

## Konfliktbehandlung

Ein Schreibvorgang stoppt, wenn sich seit dem Laden einer der folgenden Werte verändert hat:

- `baseCommitSha` und zugleich der betroffene Dateiinhalt;
- Blob-SHA der Datei;
- Revision des Textkörpers;
- zulässige Dateiklasse oder Pfadzuordnung.

Die App lädt dann Quelle, eigenen Entwurf und aktuellen GitHub-Stand für einen Drei-Wege-Vergleich. In Version 1 muss der Benutzer den Entwurf gegen den neuen Stand erneut prüfen. Selbst bei technisch nicht überlappenden Änderungen erfolgt kein automatischer Merge, bis ausreichend Nutzungserfahrung vorliegt.

Ändert sich `main`, aber die betroffene Datei bleibt bytegleich, darf der Branch vom neuen `main`-Kopf erzeugt werden. Diese Aktualisierung wird in der Bestätigung sichtbar gemacht.

## Authentifizierung und Berechtigung

### Anmeldung

Die erste gehostete Version ist vollständig privat und benötigt eine echte Anmeldung, bevor Zettelinhalte, Graphdaten, Suche oder Schreibfunktionen ausgeliefert werden. Empfohlen ist GitHub als Identitätsanbieter oder ein bestehender OIDC-Anbieter. Nach der Anmeldung prüft der Server zusätzlich eine explizite Benutzer-Allowlist. Die Sitzung wird serverseitig geführt; der Browser erhält nur ein zufälliges Cookie mit `Secure`, `HttpOnly`, `SameSite=Strict` und `Path=/`. Sitzungs- oder GitHub-Tokens gehören nicht in `localStorage`.

### Rollen

| Rolle | Rechte |
| --- | --- |
| Leser | private Zettel und Graphdaten nach expliziter Freischaltung lesen |
| Bearbeiter | Entwurf und Vorschau erzeugen, Pull Request einreichen |
| Prüfer | Pull Requests in GitHub prüfen und mergen |
| Betreiber | GitHub-App-Installation, Rollen und Betrieb verwalten |

Serverseitige Regeln gelten unabhängig von ausgeblendeten Schaltflächen. Für den persönlichen Start genügt eine explizite Allowlist der GitHub-Benutzer-ID; E-Mail oder Anzeigename allein sind keine stabile Berechtigungsidentität.

### GitHub App

Empfohlene Repository-Berechtigungen, ausschließlich für `ThomasPaulus21107/VAULTS`:

- `Contents: read & write` für Branch und Commit;
- `Pull requests: read & write` für das Anlegen und Beobachten von Pull Requests;
- `Metadata: read` als GitHub-Grundberechtigung.

Nicht erforderlich sind `Administration`, `Workflows`, Organisationsrechte oder Zugriff auf weitere Repositories. Installationstokens werden pro Vorgang erzeugt, nur serverseitig im Speicher gehalten und nicht protokolliert. Der private Schlüssel der GitHub App liegt in einem Secret Manager, nicht im Repository oder Container-Image.

## Schreibgrenzen

Version 1 erlaubt ausschließlich:

- vorhandene `.md`-Dateien unter freigegebenen Zettelpfaden in `SX` und `DX`;
- Änderung des Textkörpers;
- eine Datei pro Vorschlag;
- begrenzte Dateigröße und Änderungsgröße.

Explizit gesperrt bleiben:

- `.github/**`, `.git/**`, `.obsidian/**`, `_archive/**`, `_backups/**` und `_proposals/**`;
- `CLAUDE.md`, `Luhmann-Prinzipien.md`, `OFFENE-THEMEN.md` und andere Regel-/Steuerdateien;
- symbolische Links, Pfadsegmente wie `..`, Binärdateien und unbekannte Vault-IDs;
- Frontmatter-Änderungen, Umbenennen, Verschieben, Löschen und Neuanlegen.

Diese Fähigkeiten erhalten später eigene Vorschau- und Freigaberegeln. Eine allgemeine Repository-Schreib-API wird nicht angeboten.

## Web-Sicherheitsanforderungen

- ausschließlich HTTPS; HSTS und restriktive Content Security Policy;
- serverseitige Autorisierung bei jedem Lese- und Schreibzugriff;
- CSRF-Token zusätzlich zu `SameSite`-Cookies;
- Origin-Prüfung für schreibende Requests;
- sanitisiertes Markdown-Rendering ohne ungeprüftes `innerHTML`;
- Rate Limits für Vorschau, Bestätigung und Anmeldung;
- kurze Sitzungslebensdauer, Rotation nach Anmeldung und Re-Authentifizierung vor besonders riskanten Funktionen;
- keine Zettelinhalte, Diffs, Tokens oder Cookies in normalen Anwendungslogs;
- verschlüsselte Transport- und Betriebsdaten sowie definierte Aufbewahrungsfristen;
- signierte GitHub-Webhooks, Schutz vor Wiederholung und Deduplizierung nach Delivery-ID;
- Audit-Ereignisse für Anmeldung, Vorschau, Bestätigung, GitHub-Ergebnis und Rollenänderung.

## Empfohlene API-Grenze

| Endpoint | Zweck |
| --- | --- |
| `GET /api/notes/:id` | Zettel plus Commit-, Blob- und Textrevision lesen |
| `POST /api/edit-previews` | Änderung validieren und unveränderlichen Diff erzeugen |
| `POST /api/change-proposals` | bestätigte Vorschau idempotent als Branch und PR einreichen |
| `GET /api/change-proposals/:id` | Status, Konflikt und GitHub-Link lesen |
| `POST /api/github/webhook` | signierte Push- und Pull-Request-Ereignisse verarbeiten |

Eine Route wie das heutige `POST /api/note`, die unmittelbar eine Datei im Cache ersetzt, darf im gehosteten Betrieb nicht existieren.

## Fehlerfälle und erwartetes Verhalten

| Fall | Verhalten |
| --- | --- |
| GitHub nicht erreichbar | keine Einreichung; Vorschau bleibt kurzzeitig wiederaufnehmbar |
| Token-Erzeugung scheitert | keine lokale Ersatzschreibung; verständlicher Fehler und sichere Wiederholung |
| Zettel wurde verändert | Konfliktansicht, keine Branch-Erstellung |
| Branch erstellt, PR-Erstellung scheitert | Vorgang bleibt wiederaufnehmbar; vorhandener Branch wird angezeigt und nicht dupliziert |
| Webhook fehlt | periodischer Commit-Abgleich aktualisiert den Index später |
| Indexaufbau schlägt fehl | alter Snapshot bleibt eindeutig als veraltet markiert; neuer Commit wird nicht als aktiv gemeldet |
| Bestätigung wird doppelt gesendet | derselbe Vorgang und Pull Request werden zurückgegeben |

## Markerübergabe über PostgreSQL

Marker bilden eine eigene Operationsklasse. Die App schreibt `@add`, `@new`, `@fix` und `@ask` weder direkt nach `main` noch über einen App-erzeugten Pull Request. Nach Vorschau und Bestätigung speichert sie einen idempotenten Marker-Auftrag in PostgreSQL. Ein späterer VAULTS-Prozess liest offene Aufträge, prüft Ziel, Ausgangsrevision und Kontext, setzt die Änderung nach den Vault-Regeln um und meldet den Status zurück.

Die App zeigt mindestens `bestätigt`, `von VAULTS übernommen`, `umgesetzt`, `abgelehnt` und `Konflikt`. Bis VAULTS die Änderung bestätigt hat, darf der Marker nicht als Bestandteil des aktuellen Vault-Inhalts erscheinen.

Der Pull-Request-Weg bleibt für freie Textänderungen, Löschen, Umbenennen, Frontmatter, neue Zettel, mehrere Dateien und KI-Entwürfe vorgesehen. Das frühere direkte Marker-Commit-Konzept ist verworfen und nur noch als Entscheidungsverlauf dokumentiert: [`direct-marker-write-concept.md`](direct-marker-write-concept.md).

## Einführung in vier Stufen

### Stufe 0 – Gehostet und read-only

- vollständig private Authentifizierung, Allowlist und Rollen;
- versionierte Index-Snapshots;
- keine Schreibberechtigung der GitHub App.

### Stufe 1 – Schreibsimulation

- Editor, Diff, Revisions- und Pfadprüfung;
- Bestätigung erzeugt nur einen simulierten Vorschlag;
- Sicherheits- und Nutzertests ohne GitHub-Schreibrecht.

### Stufe 2 – Pull-Request-Schreibweg

- GitHub App mit minimalen Rechten;
- Branch, Ein-Datei-Commit und Pull Request;
- Webhook-basierte Status- und Indexaktualisierung;
- verpflichtender manueller Merge.

### Stufe 3 – Erweiterte Vault-Operationen

- neue Zettel, Frontmatter, Umbenennen, Löschen und atomare Mehrdatei-Änderungen;
- jeweils eigene Regeln, Vorschauen und Akzeptanztests;
- VAULTS-Consumer für Marker-Aufträge und Statusrückmeldung.

## Abnahmekriterien für Stufe 2

- Kein GitHub- oder Sitzungstoken ist aus dem Browser-JavaScript lesbar.
- Eine bestätigte Änderung erzeugt genau einen Branch, Commit und Pull Request.
- Ohne Bestätigung, Berechtigung oder unveränderte Ausgangsrevision entsteht kein GitHub-Schreibvorgang.
- Die App kann keine Datei außerhalb der freigegebenen Zettelpfade verändern.
- Ein paralleler GitHub-Edit führt reproduzierbar in die Konfliktansicht.
- Vor dem Merge bleibt die bisherige Vault-Version sichtbar; nach dem Merge zeigt die App den neuen Commit und Inhalt.
- Auditdaten verbinden App-Benutzer, Vorschau, GitHub-Branch, Commit und Pull Request, ohne Zettelinhalte zu duplizieren.
- Ausfälle und wiederholte Requests erzeugen weder doppelte Pull Requests noch verlorene Änderungen.

## Noch zu entscheiden

1. Welcher Identitätsanbieter wird verwendet: GitHub-Anmeldung oder bestehendes OIDC?
2. Sollen Entwürfe einen Reload überstehen? Falls ja, nur lokal verschlüsselt im Browser oder kurzzeitig serverseitig?
3. Über welchen technischen Vertrag konsumiert VAULTS die Marker-Aufträge aus PostgreSQL?

Entschieden ist: Die erste Webversion ist vollständig privat, und Pull Requests dürfen nach erfolgreicher Prüfung manuell durch denselben Benutzer gemergt werden. Eine zweite Freigabeperson ist nicht erforderlich.

## Technische Referenzen

- GitHub Apps bieten repository-spezifische Berechtigungen und kurzlebige Installationstokens: <https://docs.github.com/en/rest/apps/apps>
- Dateien können mit Blob-SHA und Zielbranch über die Contents API aktualisiert werden: <https://docs.github.com/en/rest/repos/contents>
- Pull Requests benötigen eine eigene, gezielte Schreibberechtigung: <https://docs.github.com/en/rest/pulls/pulls>
- Branch-Regeln können Pull Requests, Reviews und Statuschecks erzwingen: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
- GitHub-App-Webhooks melden Push- und Pull-Request-Ereignisse: <https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/using-webhooks-with-github-apps>
- OWASP-Empfehlungen für Sitzungen und Authentifizierung: <https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html> und <https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>
