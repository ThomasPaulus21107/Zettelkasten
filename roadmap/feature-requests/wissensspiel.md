# Feature Request: Wissensspiel

**Status:** erster spielbarer Durchstich umgesetzt, PostgreSQL-Persistenz offen

## Ziel

Die Anwendung bietet ein kurzes, wiederholbares Quiz, das Wissen über den aktuellen Vault-Stand abfragt. Es soll nicht bloß Metadaten zählen, sondern das Wiedererkennen von Gedanken, expliziten Beziehungen und fachlicher Einordnung trainieren.

## Erster spielbarer Durchstich

- eigener Bereich unter `/quiz`
- zehn zur Laufzeit erzeugte Fragen pro Runde
- gemischte Fragetypen: Zettel anhand eines nicht titelverratenden Textausschnitts erkennen, einen im Fließtext verlinkten Gedanken aus seinem konkreten Satzkontext ergänzen, einen Begriff seiner belegten Beschreibung zuordnen sowie Zitat und Urheber:in in beide Richtungen erkennen
- vier Antwortmöglichkeiten pro Frage ohne Zeitlimit; die Antwortzeit wird für eine mögliche spätere Score-Skalierung lediglich gemessen
- 100 Basispunkte für eine richtige Antwort und ein wachsender Serienbonus; die gemessene Antwortzeit beeinflusst den Score vorerst nicht
- unmittelbare Auflösung mit erklärendem Satz und Link zum zugrunde liegenden Zettel
- Meldeaktion für unklare, mehrdeutige, zu leichte, falsch zugeordnete, kontextarme oder technisch beschädigte Fragen sowie eine individuelle `Rework Note`
- Rundenergebnis mit Punkten und richtiger Antwortzahl
- neue Mischung bei jeder Runde; keine Vault-Inhalte werden im Anwendungs-Repository gespeichert

## Daten- und Sicherheitsgrenze

Die Fragen werden serverseitig aus dem zu einer konkreten Vault-Revision aufgebauten PostgreSQL-Index erzeugt. Der Vault bleibt read-only und GitHub die Quelle der Wahrheit. Die Quiz-API gibt nur den für die aktuelle Runde nötigen kurzen Ausschnitt, Antwortoptionen und eine Quellenreferenz aus; der vollständige Zettel bleibt in der vorhandenen Einzelzettel-API.

Jede beantwortete Frage erzeugt ein dauerhaftes Interaktionsereignis für den zugrunde liegenden Zettel mit dem Ergebnis `zutreffend` oder `nicht_zutreffend`. Es gibt keinen Zustand „gelernt“. Coverage misst den Anteil der Zettel mit mindestens einer auswertbaren Interaktion; die Trefferquote bewertet deren Ergebnisse getrennt davon.

## Qualitätskriterien

- Jede Frage besitzt genau vier unterschiedliche Antwortmöglichkeiten.
- Die richtige Antwort ist eindeutig und stammt aus dem aktuellen Indexlauf.
- Kontextfragen verwenden ausschließlich aufgelöste Wiki-Links im Fließtext und maskieren den verlinkten Gedanken im umgebenden Absatz.
- Textausschnitte werden von Markdown-Auszeichnung, Codeblöcken und Arbeitsmarkern bereinigt.
- Fragen werden verworfen, wenn der Ausschnitt den gesuchten Titel vollständig oder über seine prägenden Wörter verrät.
- Ablenkungsantworten stammen bevorzugt aus derselben Area und immer aus demselben Vault.
- Zitatfragen verwenden als richtige Antwort nur persönliche Zuschreibungen, die im Zettel explizit belegt und nicht als offen oder prüfbedürftig markiert sind.
- Zitatfragen zeigen ausschließlich den vollständigen Wortlaut aus einem Blockzitat. Ein gekürzter Zetteltitel ist kein zulässiger Ersatz.
- Wird bei einer Frage „Autor:in zu Zitat“ ein falsches Zitat gewählt, nennt die Auflösung zusätzlich die im Vault belegte Urheber:in dieses gewählten Zitats.
- Die Aktion `rework` bleibt während der gesamten Frage oben rechts erreichbar, also auch vor einer Antwort.
- Bei Definitionsfragen stammt nur die richtige Beschreibung aus dem benannten Zettel; die Alternativen stammen aus anderen Zetteln und bevorzugt aus demselben fachlichen Kontext.
- Nach der Auflösung kann die Quelle im Reader geöffnet werden.
- Das Spiel ist mit Tastatur bedienbar und auf schmalen Ansichten nutzbar.

## Meldungen

Der Meldefluss besitzt bereits einen eigenen API-Vertrag und transportiert Grund, eine optionale individuelle `Rework Note`, Fragetyp, Quellzettel sowie den gezeigten Fragesnapshot. Der freie Grund `other` erfordert eine nicht leere Note. Bis die PostgreSQL-Ausbaustufe umgesetzt ist, hält der lokale Prototyp höchstens 500 Meldungen für die laufende Serversitzung. Das Zieldatenmodell speichert sie dauerhaft in `quiz_question_reports`; Vault-Dateien werden dadurch nicht verändert.

## Später denkbar

- Auswahl von SX, DX, Area oder Fragetyp
- Schwierigkeitsgrade und längere Challenges
- persistente Bestwerte, Interaktionsabdeckung und Trefferquote
- Wiederholungsmodus für falsch beantwortete Fragen
- Fragen zu Rabbit-Hole-Pfaden und Kantenherkunft
