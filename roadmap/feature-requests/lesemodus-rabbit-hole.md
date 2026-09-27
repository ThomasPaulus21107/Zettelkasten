# Feature Request: Lesemodus mit Rabbit Hole

**Status:** Reader-Grundlage umgesetzt, vollständiger Rabbit-Hole-Verlauf offen

## Ziel

Zettel in einer ruhigen Leseansicht erfassen und entlang eines sichtbaren, wiederaufnehmbaren Denkpfads weitererkunden.

## Kernidee

Neben dem gelesenen Zettel erscheinen nur kontextbezogene nächste Schritte: direkte Links, Rückverweise, relevante Nachbarn und bewusst angebotene Abzweigungen. Der bisherige Pfad bleibt sichtbar und lässt sich sichern oder zurückverfolgen.

## Voraussetzung

Ein belastbarer, erklärbarer Graphindex aus Feature 1.

## Tatsächlicher Stand

Umgesetzt sind die eigenständige Route `/lesen?id=…`, lesefreundliches Markdown, klickbare Wiki-Links, Quellenkennzeichnung für SX und DX sowie die anschließende Navigation durch das lokale Rabbit Hole. Reader und Graph sind getrennte Bereiche; auf breiten Ansichten können sie nebeneinander stehen.

Noch offen sind ein sichtbarer und wiederaufnehmbarer Pfadverlauf, gespeicherte Rabbit Holes, vollständige Rückverweise sowie die belastbare Kantenherkunft mit Sprungstelle.
