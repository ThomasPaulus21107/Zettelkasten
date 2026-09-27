# Implemented Features

Dieser Index nennt nur Fähigkeiten, die im aktuellen Repository umgesetzt und im Projektstatus oder durch automatisierte Tests nachvollziehbar sind. Er ersetzt weder die Feature Requests noch den detaillierten Übergabestand.

## Vault-Zugriff und Basisindex

- read-only GitHub-Cache-Abgleich mit sichtbarer Quellrevision;
- Ausschluss konfigurierter Archiv-, Backup-, Obsidian- und Git-Verzeichnisse;
- Index aus Inline-Wiki-Links und `related`;
- Suche nach Titel, Alias und Pfad;
- Graph-API ohne Markdown-Körper.

Nachweise: [`PROJECT-STATUS.md`](../../PROJECT-STATUS.md), [`lib/indexer.mjs`](../../lib/indexer.mjs) und [`test/`](../../test/).

## Navigation, News und Bestandsdashboard

- eigenständige Bereiche unter `/news`, `/verzetteln`, `/graph`, `/lesen` und `/quiz`;
- News-Ansicht für neue und geänderte Zettel mit anpassbarem Zeitraum;
- sichtbarer GitHub-Branch, Commit und Abrufzeitpunkt;
- klickbare Strukturtypen, Areas und Datenqualitätsbefunde;
- Suche als Filter für Bestand und Kennzahlen;
- getrennte Aufschlüsselung vorhandener `@`-Tokens.

Nachweise: [News-Feature](../feature-requests/news-und-bereichsnavigation.md), [Dashboard-Feature](../feature-requests/dashboard-und-strukturmetriken.md), [`public/index.html`](../../public/index.html), [`public/app.js`](../../public/app.js) und [`lib/indexer.mjs`](../../lib/indexer.mjs).

## Graph-Arbeitsraum

- eigene Route `/graph` mit Gesamt- und Lokalmodus;
- Sigma.js, Graphology und ForceAtlas2 im Worker;
- Suche, Auswahl, Facettenfilter, Gruppierung und URL-Zustand;
- getrennte Regler für Tiefe, Knotenbudget, Darstellung und Kräfte;
- zugängliche Knotenliste und Übergang zum Reader.

Nachweise: [Feature Request](../feature-requests/interaktive-graph-visualisierung.md), [`public/graph.html`](../../public/graph.html), [`lib/graph-view-model.mjs`](../../lib/graph-view-model.mjs) und die Graph-Tests unter [`test/`](../../test/).

## Reader und Marker-Vorschau

- eigenständige Leseseite mit Rabbit-Hole-Navigation;
- Kontextmenü für `@add`, `@new`, `@fix` und `@ask`;
- Auflösung der markierten Markdown-Stelle;
- Vorschau und Bestätigung ohne automatische Vault-Änderung.

Nachweise: [`PROJECT-STATUS.md`](../../PROJECT-STATUS.md), [`public/app.js`](../../public/app.js) und [`test/marker-model.test.mjs`](../../test/marker-model.test.mjs).

Der aktuelle Prototyp kann bestätigte Änderungen noch über den Dateischreibpfad speichern. Für Marker ist dieser Weg fachlich überholt und muss durch PostgreSQL-Aufträge ersetzt werden.

## Wissensspiel

- eigener Bereich `/quiz` mit Runden, erfasster Antwortzeit ohne Zeitlimit, Punkten und Auflösung;
- mehrere belegbasierte Fragetypen;
- Meldefluss für problematische Fragen;
- Quellenübergang zum zugrunde liegenden Zettel.

Die dauerhafte Interaktionsabdeckung und Trefferquote in PostgreSQL sind noch nicht umgesetzt.

Nachweise: [Feature Request](../feature-requests/wissensspiel.md), [`public/quiz.html`](../../public/quiz.html), [`lib/quiz.mjs`](../../lib/quiz.mjs) und die Quiz-Tests unter [`test/`](../../test/).
