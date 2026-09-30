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

- **Status:** entschieden am 30. September 2026
- **Kontext:** Die Linkauflösung soll Cross-Vault-Ziele nur bei ausdrücklich erlaubter Syntax auflösen.
- **Entscheidung:** Ein Wiki-Link beginnt mit der Vault-Kennung und Doppelpunkt, etwa DX:Zettel/Architektur/Conway. Die Auflösung folgt danach denselben Pfad- und Namensregeln wie innerhalb eines Vaults.

### Modellierung wiederholter Links

- **Status:** entschieden am 30. September 2026
- **Kontext:** Mehrfach vorkommende Wiki-Links brauchen eindeutige Kanten-IDs und nachvollziehbare Herkunft.
- **Entscheidung:** Jeder Link bleibt ein eigenes Vorkommen. Die Kante enthält eine stabile laufende Nummer sowie ihre Zeichenposition im Markdown-Körper oder den Index im related-Feld.

### Typisierte `related`-Beziehungen

- **Status:** offen, späterer struktureller Vorschlag
- **Kontext:** Denkbar ist eine Form wie `related: [{ target: "[[X]]", relation: "konkretisiert" }]`.
- **Auswirkung:** Würde Kanten semantisch präziser machen, erfordert aber Prüfung und gegebenenfalls Migration im Vault.
- **Frage:** Soll nach dem verlässlichen Index ein Vorschlag für typisierte `related`-Beziehungen an echten SX- und DX-Beispielen ausgearbeitet werden?

## Technik und Betrieb

### Unterstützte Node-Version

- **Status:** entschieden am 30. September 2026
- **Kontext:** Der lokale Prototyp hat keine festgelegte Node-Version.
- **Entscheidung:** Node.js 22 oder neuer ist die unterstützte Mindestversion; die CI verwendet Node 22.

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
