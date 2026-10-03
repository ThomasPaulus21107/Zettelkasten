# Offene Punkte

Diese Liste sammelt Entscheidungen und Klärungsbedarfe, die nicht stillschweigend angenommen werden sollen. Sie wird bei neuen Befunden ergänzt und zu Beginn einer Arbeitsphase sowie vor Abschluss einer zusammenhängenden Änderung geprüft.

## Produkt und Nutzung

### Gemeinsamer oder getrennter Startgraph

- **Status:** entschieden am 13. September 2026
- **Kontext:** SX und DX können gemeinsam dargestellt werden, ihre Herkunft muss sichtbar bleiben.
- **Auswirkung:** Bestimmt die Startansicht und das erste Orientierungsmodell der Anwendung.
- **Entscheidung:** Die Startseite zeigt einen gemeinsamen Graphen; SX und DX bleiben über ihre Farbe und Kennzeichnung unterscheidbar.

### Primärer Einstiegspunkt

- **Status:** entschieden am 13. September 2026
- **Kontext:** Der Prototyp bietet Suche und eine fokussierte Nachbarschaft, aber keinen festgelegten ersten Nutzungsschritt.
- **Auswirkung:** Beeinflusst Informationsarchitektur und Oberfläche.
- **Entscheidung:** Ein zentrales Suchfeld ist der primäre Einstieg. Die Suche filtert die dargestellte Graphansicht.

### Erste Lückenerkennung

- **Status:** offen
- **Kontext:** Spätere Pflegehinweise können strukturelle Lücken, thematische Nähe oder Brücken zwischen SX und DX erkennen.
- **Auswirkung:** Legt den ersten Fokus für Pflegemodus und Analyse fest.
- **Frage:** Welche Form der Lückenerkennung hat zuerst Priorität?

### Lizenz des Anwendungs-Repositories

- **Status:** offen
- **Kontext:** Das sichtbare Anwendungs-Repository besitzt noch keine festgelegte Lizenz.
- **Auswirkung:** Relevant vor einer öffentlichen Bereitstellung oder Beiträgen Dritter.
- **Frage:** Unter welcher Lizenz soll das Anwendungs-Repository veröffentlicht werden?

## Datenmodell und Indexierung

### Cross-Vault-Links

- **Status:** offen
- **Kontext:** Die Linkauflösung soll Cross-Vault-Ziele nur bei ausdrücklich erlaubter Syntax auflösen.
- **Auswirkung:** Ohne Regel bleiben gleichnamige Ziele über Vault-Grenzen hinweg mehrdeutig oder ungelöst.
- **Frage:** Welche eindeutige Syntax und welche Regeln sollen absichtliche Cross-Vault-Links verwenden?

### Modellierung wiederholter Links

- **Status:** offen
- **Kontext:** Mehrfach vorkommende Wiki-Links brauchen eindeutige Kanten-IDs und nachvollziehbare Herkunft.
- **Auswirkung:** Entscheidet, ob der Graph Linkvorkommen vollständig erhält oder sie deterministisch zusammenfasst.
- **Frage:** Sollen wiederholte Links als einzelne Vorkommen oder als aggregierte Beziehung modelliert werden?

### Typisierte `related`-Beziehungen

- **Status:** offen, späterer struktureller Vorschlag
- **Kontext:** Denkbar ist eine Form wie `related: [{ target: "[[X]]", relation: "konkretisiert" }]`.
- **Auswirkung:** Würde Kanten semantisch präziser machen, erfordert aber Prüfung und gegebenenfalls Migration im Vault.
- **Frage:** Soll nach dem verlässlichen Index ein Vorschlag für typisierte `related`-Beziehungen an echten SX- und DX-Beispielen ausgearbeitet werden?

## Technik und Betrieb

### Cloudflare MVP: Zugang und erste Datenfreigabe

- **Status:** teilweise entschieden; Vault-Zugang und automatischer D1-Abgleich fehlen
- **Kontext:** Der Nutzer hat Cloudflare-Account `14c320ab61d87526996099d7d0e175d2` und die allein zugelassene E-Mail `thomaspaulus@me.com` genannt. `workers.dev` ist für den MVP vorgesehen. D1 `zettelkasten-reader` (`d95be413-7120-4b2c-9b93-6cf4e599ce18`) und die drei Schematabellen sind am 3. Oktober 2026 erstellt. Zero Trust Free ist aktiv. Der Worker ist unter `zettelkasten-reader.thomaspaulus.workers.dev` deployt und seine D1-Bindung gesetzt. Worker-Level Access schützt gesamten Traffic und Vorschau-URLs mit der Ein-E-Mail-Policy `Zettelkasten Reader – Thomas`; anonyme Aufrufe von `/`, `/app.js` und `/api/search` werden zum Login umgeleitet. `CLOUDFLARE_ACCOUNT_ID` und `CLOUDFLARE_D1_DATABASE_ID` sind im App-Repository als Actions-Secrets hinterlegt. Für Worker und GitHub Action fehlt ein eigener Vault-Lesetoken; für die Action fehlt ein D1-Schreibtoken.
- **Auswirkung:** Die geschützte Worker-Adresse ist erreichbar, liefert aber ohne Vault-Lesetoken und befüllten Index noch keine Zettel.
- **Frage:** Einen auf `VAULTS` und Repository-Contents-Lesen beschränkten GitHub-Token als Worker-Secret `GITHUB_TOKEN` und Actions-Secret `VAULTS_READ_TOKEN` hinterlegen; außerdem einen Cloudflare-D1-Schreibtoken als Actions-Secret `CLOUDFLARE_D1_TOKEN` hinterlegen. Danach Import und iPhone-Test durchführen. Keine Tokens im Chat oder Repository speichern.
- **Entscheidung vom 3. Oktober 2026:** Cloudflare-Account, `workers.dev`, Zero Trust Free und die allein zugelassene E-Mail sind festgelegt. Die Access-Policy erlaubt nur diese E-Mail und gilt für gesamten Worker-Traffic.

### Cloudflare MVP: Vault-Klassifikation

- **Status:** entschieden und technisch geprüft für den ersten MVP-Import am 3. Oktober 2026
- **Kontext:** Der Import nimmt Markdown unter `SX` und `DX` einschließlich `_inbox` auf und schließt Archiv-, System- und Backup-Pfade aus. Der Dry Run auf Revision `ad12eeb54e2b` ergab 2.319 Zettel, darunter 478 Inbox-Zettel (338 SX, 140 DX), sowie drei YAML-Fallbacks.
- **Auswirkung:** Inbox-Zettel sind suchbar und in Ergebnissen und Zettelansicht als `Draft` erkennbar.
- **Entscheidung vom 3. Oktober 2026, korrigiert nach Nutzerklärung:** Die Inboxen werden vom Nutzer verarbeitet; bis dahin bleiben ihre Zettel im MVP-Suchindex. Der App-Status `draft` ergibt sich aus dem `_inbox`-Pfad, auch wenn das Vault-Frontmatter `rohling` oder `hypothese` enthält. Beim Teilen bleibt das Original-Markdown unverändert.
- **Technische Prüfung:** `AGENTS.md`, Templates, `index.md`, `log.md` und eine datierte Protokolldatei sind ausgeschlossen. Ein regulärer Zettel mit führenden Punkten im Dateinamen wird aufgenommen. Die Importprüfung fand 2.319 Zettel und genau 478 als `draft` gekennzeichnete Inbox-Zettel.

### Unterstützte Node-Version

- **Status:** offen
- **Kontext:** Der lokale Prototyp hat keine festgelegte Node-Version.
- **Auswirkung:** Voraussetzung für reproduzierbare lokale Entwicklung und CI.
- **Frage:** Welche LTS-Version soll als unterstützte Mindestversion festgelegt werden?

### CI-Umfang

- **Status:** offen
- **Kontext:** Automatisierte Tests und CI für Pull Requests sowie `main` fehlen.
- **Auswirkung:** Bestimmt, welche Prüfungen vor Integration verbindlich laufen.
- **Frage:** Soll die erste CI nur Tests ausführen oder zusätzlich Format-, Sicherheits- und API-Prüfungen enthalten?

### API-Grenze bei großen Graphen

- **Status:** offen, nach dem Indexkern
- **Kontext:** Die Graph-API baut den vollständigen Index bei jedem Abruf neu auf und überträgt ihn komplett an den Browser.
- **Auswirkung:** Lokal derzeit ausreichend, für Lesemodus oder Hosting aber keine dauerhafte Schnittstelle.
- **Frage:** Soll zuerst Caching/inkrementelle Indexierung oder eine paginierte bzw. fokussierte Graph-API verfolgt werden?

### Darstellungsgrenze für Fünf-Ebenen-Graphen

- **Status:** offen, vorläufig begrenzt
- **Kontext:** Fünf Beziehungsebenen können im echten Vault schnell fast den gesamten Graphen umfassen.
- **Auswirkung:** Ohne Begrenzung werden Knotenbeschriftungen und Interaktion bei einer großen Nachbarschaft unbrauchbar.
- **Vorläufige Umsetzung:** Die Suche wählt einen zentralen Treffer. Die Canvas zeigt einen nachvollziehbaren Erkundungsbaum mit bis zu fünf Ebenen, höchstens zwei gewichteten Abzweigungen je Knoten und maximal 96 Knoten. Querverbindungen bleiben im Datenmodell erhalten, werden aber nicht als unlesbares Liniennetz gezeichnet.
- **Frage:** Welche Darstellungsgrenze und welche Strategie zum schrittweisen Nachladen soll langfristig gelten?
