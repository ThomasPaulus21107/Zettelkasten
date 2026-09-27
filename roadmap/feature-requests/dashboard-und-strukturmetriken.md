# Feature Request: Dashboard und Strukturmetriken

**Status:** erster Umfang umgesetzt, Datenqualität vom verlässlichen Index abhängig

## Ziel

Den Bestand über klickbare Kennzahlen erschließen. Eine Suche soll nicht nur Treffer liefern, sondern zugleich die sichtbaren Strukturmetriken auf den aktuellen Ausschnitt begrenzen.

## Umgesetzter Umfang

- zentrales Suchfeld als primärer Einstieg;
- klickbare Kennzahlen und Bestandsfilter;
- Strukturtypen wie Zettel, Quotes, Bücher, Quellen und weitere bekannte Typen;
- Areas als klickbare Themen;
- Befunde für leere oder unvollständige Zettel, fehlende Metadaten, isolierte Zettel und unaufgelöste Links;
- Erkennung und Aufschlüsselung vorhandener `@`-Tokens;
- Suche als gemeinsamer Filter für Treffer und Kennzahlen;
- Übergang aus einer Kennzahl in die gefilterte Bestandsansicht.

## Offene Erweiterungen

- Kennzahlen aus einem versionierten PostgreSQL-Snapshot;
- klare Trennung redaktioneller Marker vom technischen Altbestand;
- Vergleich von Kennzahlen über Vault-Revisionen;
- belastbare Klassifikation von Systemdateien, Logs und Entwürfen;
- gespeicherte persönliche Filter.

## Abhängigkeit

Die Aussagekraft aller Strukturmetriken hängt vom [verlässlichen Graphindex](verlaesslicher-graph-index.md) ab.
