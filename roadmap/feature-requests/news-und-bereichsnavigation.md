# Feature Request: News und Bereichsnavigation

**Status:** erster Umfang umgesetzt

## Ziel

Neue und geänderte Zettel schnell erfassen und die Hauptarbeitsweisen der Anwendung als eigenständige Bereiche erreichbar machen.

## Umgesetzter Umfang

- Hauptnavigation für `News`, `Verzetteln`, `Rabbit Hole`, `Lesen` und `Wissensspiel`;
- eigene Route `/news`;
- getrennte Listen für neue und geänderte Zettel;
- Zeitraumfilter für Heute sowie 7, 10, 30 und 90 Tage;
- neue Zettel über `created`, Änderungen über `modified`;
- keine doppelte Anzeige eines neuen Zettels als Änderung;
- sichtbarer GitHub-Branch, Commit und Abrufzeitpunkt des verwendeten Vault-Stands.

## Offene Erweiterungen

- belastbare Behandlung fehlender oder ungültiger Datumsfelder;
- PostgreSQL-basierte Snapshot-Historie statt ausschließlicher Frontmatter-Auswertung;
- erklärbare Änderungsvorschau zwischen zwei Vault-Revisionen;
- persönliche Gelesen-Markierung und Filter.

## Abhängigkeit

Die heutige Ansicht basiert auf dem aktuellen GitHub-Snapshot. Eine echte Änderungshistorie benötigt die geplanten PostgreSQL-Snapshots und stabile Zettelidentitäten.
