# Offene Punkte

Diese Liste sammelt Entscheidungen und Klärungsbedarfe, die nicht stillschweigend angenommen werden sollen. Sie wird bei neuen Befunden ergänzt und zu Beginn einer Arbeitsphase sowie vor Abschluss einer zusammenhängenden Änderung geprüft.

## Produkt und Nutzung

### Interaktionsabdeckung und Trefferquote

- **Status:** entschieden am 25. September 2026
- **Kontext:** Das Wissensspiel soll über mehrere Runden zeigen, mit welchen Zetteln bereits eine auswertbare Interaktion stattgefunden hat und wie diese ausgefallen ist.
- **Entscheidung:** Es gibt keinen Zustand „gelernt“. Eine gespeicherte Interaktion erhöht die Coverage unabhängig vom Ergebnis. Ihr Ergebnis wird als zutreffend oder nicht zutreffend gespeichert und fließt getrennt in die Trefferquote ein. Die Historie liegt dauerhaft in PostgreSQL; der Browser hält nur den Zustand einer laufenden Runde.
- **Auswirkung:** Coverage und fachliche Trefferquote bleiben getrennt auswertbar; eine falsche Antwort verschlechtert nicht rückwirkend die Abdeckung.

### Gemeinsamer oder getrennter Startgraph

- **Status:** entschieden am 13. September 2026
- **Kontext:** SX und DX können gemeinsam dargestellt werden, ihre Herkunft muss sichtbar bleiben.
- **Auswirkung:** Bestimmt die Startansicht und das erste Orientierungsmodell der Anwendung.
- **Entscheidung:** Die Startseite zeigt einen gemeinsamen Graphen; SX und DX gelten als getrennte Quellen und bleiben über Farbe, Kennzeichnung und klickbare Quellfilter unterscheidbar.

### Primärer Einstiegspunkt

- **Status:** entschieden am 13. September 2026
- **Kontext:** Der Prototyp bietet Suche und eine fokussierte Nachbarschaft, aber keinen festgelegten ersten Nutzungsschritt.
- **Auswirkung:** Beeinflusst Informationsarchitektur und Oberfläche.
- **Entscheidung:** Ein zentrales Suchfeld ist der primäre Einstieg. Die Suche filtert die dargestellte Graphansicht.

### Leitmotiv der Interaktion

- **Status:** entschieden am 15. September 2026
- **Kontext:** „Zettelkasten“ bezeichnet das Produkt, soll aber nicht das räumliche Sinnbild der Bedienung bestimmen.
- **Auswirkung:** Sprache, visuelle Hierarchie und Navigation brauchen ein gemeinsames Motiv für Tiefe, Verzweigung und Entdeckung.
- **Entscheidung:** Das tragende Narrativ ist das Rabbit Hole. Zettel werden als Räume, Beziehungen als Türen beziehungsweise Abzweigungen und weitere Relationsebenen als zunehmende Tiefe vermittelt. „Zettelkasten“ bleibt der Name.

### Position und Unabhängigkeit des Zettel-Readers

- **Status:** entschieden am 16. September 2026
- **Kontext:** Ein ausgewählter Zettel soll im Zusammenhang mit seinem Rabbit Hole lesbar bleiben und später auch einen Bearbeitungsmodus aufnehmen können.
- **Auswirkung:** Bestimmt die Seitenaufteilung sowie die gemeinsame Grundlage für Lesen und spätere bestätigungspflichtige Edits.
- **Entscheidung:** Der Reader ist ein eigenständiger Bereich und steht normalerweise oberhalb der Rabbit Hole Navigation. Erst in einer Widescreen-Ansicht stehen Navigation und Reader nebeneinander. Trefferliste und visualisierte Räume verwenden denselben Reader.

### Manuelle Vault-Änderungen

- **Status:** teilweise überholt durch die Markerentscheidung vom 25. September 2026
- **Kontext:** Zettel sollen direkt im Reader manuell bearbeitet und einfach mit `@add` markiert werden können, ohne die Sicherheitsgrenze für Vault-Schreibzugriffe aufzugeben.
- **Auswirkung:** Die Anwendung benötigt einen kontrollierten Schreibpfad mit Konflikterkennung und transparenter Bestätigung.
- **Entscheidung:** Freie Textänderungen benötigen weiterhin Quelle, Begründung, Vorschau, Bestätigung und Revisionsprüfung. Marker sind davon ausgenommen: Die App schreibt `@add`, `@new`, `@fix` und `@ask` nicht direkt in den Vault, sondern speichert bestätigte Marker-Aufträge in PostgreSQL. Ein späterer VAULTS-Prozess setzt sie um.

### GitHub als maßgeblicher Vault-Stand

- **Status:** entschieden am 19. September 2026
- **Kontext:** Der lokale Indexer benötigt ein Dateisystem, während der Vault in GitHub geführt wird.
- **Auswirkung:** Die Oberfläche muss ihren Datenstand als GitHub-Commit nachvollziehbar machen und darf keinen unbemerkt veralteten lokalen Snapshot als aktuell ausgeben.
- **Entscheidung:** GitHub ist die Quelle der Wahrheit. Die Anwendung aktualisiert vor jedem Indexabruf einen lokalen, austauschbaren Cache gegen den konfigurierten Branch. Bei einem fehlgeschlagenen Abgleich wird der Abruf sichtbar abgebrochen. Branch, Commit und Abrufzeit erscheinen in der Oberfläche.

### Zettel aus dem Reader löschen

- **Status:** offen
- **Kontext:** Der Reader soll eine Löschen-Aktion neben „Bearbeiten“ anbieten. Der aktuelle Schreibpfad arbeitet jedoch im bei jedem Abruf zurückgesetzten GitHub-Cache.
- **Auswirkung:** Ein bloß lokales Löschen wäre nicht dauerhaft und würde beim nächsten GitHub-Abgleich wieder erscheinen. Eine echte Löschung braucht einen nachvollziehbaren GitHub-Schreibweg mit Vorschau, expliziter Bestätigung und Commit oder Pull Request.
- **Frage:** Soll eine bestätigte Löschung direkt einen Commit auf einen festgelegten Branch erzeugen oder standardmäßig einen Pull Request vorbereiten?

### Freigabemodell für gehostete Vault-Änderungen

- **Status:** entschieden am 22. September 2026
- **Kontext:** Eine gehostete Anwendung kann Änderungen nicht dauerhaft in einem lokalen Cache halten. Das Zielkonzept erzeugt nach Vorschau und Bestätigung einen Branch, Commit und Pull Request über eine minimal berechtigte GitHub App; siehe [`docs/hosted-vault-write-concept.md`](docs/hosted-vault-write-concept.md).
- **Auswirkung:** Bestimmt Geschwindigkeit, Vier-Augen-Prinzip, Branchschutz und den Übergang von einem Vorschlag zur Quelle der Wahrheit.
- **Entscheidung:** Pull Requests sind der Standard für freie und strukturelle Vault-Änderungen. Im privaten Einzelnutzerbetrieb genügt der manuelle Self-Merge; eine zweite Person ist nicht erforderlich. Marker verwenden stattdessen die PostgreSQL-Übergabe an VAULTS.

### Direkter Commit-Schnellweg für Marker

- **Status:** verworfen am 25. September 2026
- **Kontext:** Die App wird primär zum Lesen und Explorieren verwendet; gelegentlich gesetzte Marker sind kleine, klar begrenzte Aufträge. Der Marker selbst ist bereits die von VAULTS verstandene Übergabe. Eine zusätzliche Handoff-Datei würde Ziel, Auftrag und Verarbeitungsstatus duplizieren.
- **Auswirkung:** Die App benötigt für Marker keine GitHub-Schreibberechtigung. Idempotenz, Status und Übergabe werden in PostgreSQL abgebildet.
- **Entscheidung:** Es gibt keinen direkten Commit-Schnellweg. Das frühere Konzept ist als verworfene Variante gekennzeichnet: [`docs/direct-marker-write-concept.md`](docs/direct-marker-write-concept.md).

### Sichtbarkeit der gehosteten Vault-Inhalte

- **Status:** entschieden am 22. September 2026
- **Kontext:** Das Hosting braucht vor der technischen Umsetzung eine klare Grenze zwischen privaten Inhalten, authentifizierten Lesern und eventuell öffentlich freigegebenen Zetteln.
- **Auswirkung:** Legt Authentifizierung, Indextrennung, Cache-Header, Suchmaschinenzugriff und Datenschutzanforderungen fest.
- **Entscheidung:** Die erste gehostete Version ist vollständig privat. Sämtliche Inhalte, Graphdaten, Suche und Schreibfunktionen erfordern eine authentifizierte und explizit freigeschaltete Sitzung. Eine öffentliche Teilmenge wird erst in einem späteren, gesonderten Konzept geprüft.

### Hosting-Plattform und Zugangsweg

- **Status:** offen; Optionen in mehreren Projekt-Chats geprüft
- **Kontext:** Render Frankfurt, Tailscale auf eigener Hardware, Hetzner, Railway, Fly.io, Vercel, Cloud Run und GitHub Pages wurden eingeordnet. PostgreSQL ist inzwischen unabhängig von der Plattform gesetzt.
- **Auswirkung:** Bestimmt Betriebsaufwand, Datenstandort, Verfügbarkeit, Authentifizierung, Indexer-Ausführung und die Zahl zusätzlicher Datenkopien.
- **Frage:** Soll der erste private Betrieb über A) Tailscale und einen eigenen Always-on-Rechner, B) einen Managed-Dienst wie Render Frankfurt oder C) einen selbst betriebenen Hetzner-VPS erfolgen?

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

### Datenbank zwischen Vault und App

- **Status:** entschieden am 25. September 2026; Identitätsmodell noch offen
- **Kontext:** GitHub bleibt Quelle der Zettelinhalte. Eine persistente App-Datenbank soll den reproduzierbaren Graph-/Suchindex sowie eigenen Interaktionszustand wie Interaktionsabdeckung, Trefferquote und Marker-Aufträge verwalten.
- **Auswirkung:** Die App erhält eine klare Synchronisationsgrenze und dauerhaften Zustand, muss aber Vault-Revisionen, Umbenennungen, gelöschte Zettel und ausstehende Schreiboperationen eindeutig behandeln. Vertrauliche Zettelkörper sollen nicht unnötig dupliziert werden.
- **Entscheidung:** PostgreSQL wird von Anfang an auch für die lokale Einzelplatzversion geplant. Die Datenbank ergänzt den Vault und ersetzt ihn nicht. Vault-Inhalte bleiben über GitHub-Commit und stabile Zettelreferenz nachvollziehbar; App-Zustand wird getrennt davon gespeichert.
- **Frage:** Brauchen Zettel für Umbenennungen eine persistente ID im Vault-Frontmatter oder genügt zunächst `vault + Pfad` mit einer Rename-Historie in PostgreSQL?

### Marker-Aufträge und VAULTS-Verarbeitung

- **Status:** entschieden am 25. September 2026; Übergabevertrag noch offen
- **Kontext:** Marker werden als App-Aufträge mit Zielzettel, Textanker, Typ, Status und Vault-Ausgangsrevision gespeichert. Das spätere Einfügen von `@add`, `@new`, `@fix` oder `@ask` in Markdown liegt ausschließlich in der Verantwortung von VAULTS.
- **Auswirkung:** Warteschlange, Idempotenz und Bearbeitungsstatus liegen in PostgreSQL. Die App braucht für Marker keinen Git-Schreibweg; VAULTS übernimmt die spätere Umsetzung.
- **Entscheidung:** Die App speichert bestätigte Marker ausschließlich in PostgreSQL. Ein späterer VAULTS-Prozess liest offene Aufträge, setzt die Marker nach den Vault-Regeln und meldet Erfolg, Ablehnung oder Konflikt zurück.
- **Frage:** Über welchen technischen Vertrag liest VAULTS die Aufträge und bestätigt ihre Verarbeitung: direkte Datenbankverbindung, eng begrenzte API oder Worker im App-System?

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

### Bedeutung von `@`-Markern

- **Status:** entschieden am 22. September 2026; Altbestand bleibt gesondert zu behandeln
- **Kontext:** Im Textkörper kommen redaktionelle Arbeitsmarker wie `@fix`, `@new`, `@gap`, `@add`, `@ask` und `@link`, aber auch technische Tokens wie `@property` oder `@pytest` vor.
- **Auswirkung:** Eine reine `@…`-Erkennung findet alle Vorkommen, überschätzt aber möglicherweise die Zahl der Zettel mit redaktionellem Pflegebedarf.
- **Entscheidung:** Künftig werden ausschließlich `@add`, `@new`, `@fix` und `@ask` gesetzt. Das Kontextmenü im Reader bietet nur diese vier Marker an. Altmarker werden nicht automatisch migriert oder umgedeutet; ihre Bestandsbereinigung bleibt ein eigenes Vault-Vorhaben.

## Technik und Betrieb

### Renderer für Gesamt- und Lokalgraph

- **Status:** entschieden am 22. September 2026
- **Kontext:** Die vorhandene 2D-Canvas funktioniert für begrenzte lokale Ausschnitte. Ein an Obsidian angelehnter Gesamtgraph soll jedoch mehr als 2.000 Knoten und rund 20.000 Kanten interaktiv darstellen, physikbasiert clustern und denselben Interaktionszustand wie der lokale Graph verwenden.
- **Auswirkung:** Die Wahl prägt Performance, Bundlegröße, Layoutqualität, Barrierefreiheits-Ergänzungen und den Aufwand für gerichtete sowie aggregierte Kanten.
- **Entscheidung:** Sigma.js 3 mit Graphology und ForceAtlas2 im Worker wird gemeinsamer Renderer für Gesamt- und Lokalgraph. Cytoscape.js bleibt höchstens eine Option für spätere kleine Analyseansichten. Messaufbau, Werte und Grenzen: [`docs/graph-renderer-comparison.md`](docs/graph-renderer-comparison.md).

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
- **Vorläufige Umsetzung (20. September 2026):** Eigene Graphsuche, eine bis fünf Ebenen (Start: eine), wahlweise 15/30/60 Räume. Breitensuche priorisiert direkte Nachbarn und liefert kürzeste Linkdistanzen; innerhalb einer Nachbarschaft werden Grad und Titel zur Reihenfolge verwendet. Anzeige und Gesamtzahl erreichbarer Räume bleiben getrennt sichtbar. Filter für Wiki-Link/Related, Zurück-Navigation, eine tastaturbedienbare Beziehungsliste sowie Canvas-Navigation (Pfeile wählen, Enter fokussiert, Umschalt plus Pfeile verschiebt) ergänzen die Canvas. Die langfristige Darstellung großer Gesamtgraphen bleibt offen; Recherche siehe `docs/graph-view-research.md`.
- **Frage:** Welche Darstellungsgrenze und welche Strategie zum schrittweisen Nachladen soll langfristig gelten?
