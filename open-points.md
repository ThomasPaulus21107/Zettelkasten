# Offene Punkte

Diese Liste sammelt Entscheidungen und Klärungsbedarfe, die nicht stillschweigend angenommen werden sollen. Sie wird bei neuen Befunden ergänzt und zu Beginn einer Arbeitsphase sowie vor Abschluss einer zusammenhängenden Änderung geprüft.

## Produkt und Nutzung

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

- **Status:** entschieden am 16. September 2026
- **Kontext:** Zettel sollen direkt im Reader manuell bearbeitet und einfach mit `@add` markiert werden können, ohne die Sicherheitsgrenze für Vault-Schreibzugriffe aufzugeben.
- **Auswirkung:** Die Anwendung benötigt einen kontrollierten Schreibpfad mit Konflikterkennung und transparenter Bestätigung.
- **Entscheidung:** Der Bearbeitungsmodus verändert nur den Textkörper des geöffneten Zettels. Quelle, Begründung und eine Änderungsvorschau werden vor dem Schreiben angezeigt; erst ein eigener Bestätigungsbutton schreibt atomar in den Vault. Eine Revisionsprüfung verhindert das Überschreiben zwischenzeitlicher Änderungen. `@add` wird per Knopf an der aktuellen Cursorposition eingefügt.

### GitHub als maßgeblicher Vault-Stand

- **Status:** entschieden am 19. September 2026
- **Kontext:** Der lokale Indexer benötigt ein Dateisystem, während der Vault in GitHub geführt wird.
- **Auswirkung:** Die Oberfläche muss ihren Datenstand als GitHub-Commit nachvollziehbar machen und darf keinen unbemerkt veralteten lokalen Snapshot als aktuell ausgeben.
- **Entscheidung:** GitHub ist die Quelle der Wahrheit. Die Anwendung aktualisiert vor jedem Indexabruf einen lokalen, austauschbaren Cache gegen den konfigurierten Branch. Bei einem fehlgeschlagenen Abgleich wird der Abruf sichtbar abgebrochen. Branch, Commit und Abrufzeit erscheinen in der Oberfläche.

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

### Bedeutung von `@`-Markern

- **Status:** offen, vorläufig vollständig gezählt
- **Kontext:** Im Textkörper kommen redaktionelle Arbeitsmarker wie `@fix`, `@new`, `@gap`, `@add`, `@ask` und `@link`, aber auch technische Tokens wie `@property` oder `@pytest` vor.
- **Auswirkung:** Eine reine `@…`-Erkennung findet alle Vorkommen, überschätzt aber möglicherweise die Zahl der Zettel mit redaktionellem Pflegebedarf.
- **Vorläufige Umsetzung:** Die Startseite zählt und filtert alle `@…`-Tokens einzeln und zeigt die konkreten Markernamen zusätzlich in der Zettelansicht, ohne ihnen automatisch eine Bedeutung zuzuweisen.
- **Frage:** Sollen künftig alle `@…`-Tokens zählen oder nur eine festgelegte Liste redaktioneller Arbeitsmarker?

## Technik und Betrieb

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
- **Vorläufige Umsetzung:** Die Suche wählt einen zentralen Treffer. Die Canvas zeigt einen lokalen Wissensgraphen mit einer direkt einstellbaren Tiefe von einer bis fünf Ebenen und maximal 30 Räumen. Zunächst werden mehrere durchgehende Korridore bis in die gewählte Tiefe aufgebaut, danach seitliche Abzweigungen ergänzt. Jeder sichtbare Raum trägt seinen Namen. Die für die Erkundung gewählten Gänge sind deutlich, zusätzliche Querverbindungen zurückhaltend sichtbar und bei Fokus hervorgehoben; Richtung, Linkherkunft sowie SX/DX bleiben erkennbar. Zoom und Verschieben ermöglichen die räumliche Erkundung.
- **Frage:** Welche Darstellungsgrenze und welche Strategie zum schrittweisen Nachladen soll langfristig gelten?
