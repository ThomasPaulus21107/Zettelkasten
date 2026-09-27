# Roadmap

Dieser Ordner trennt geplante Vorhaben von nachweislich umgesetzten Fähigkeiten.

## Struktur

- [`feature-requests/`](feature-requests/README.md) enthält die kanonischen Feature Requests. Teilweise umgesetzte Vorhaben bleiben dort, solange ihr dokumentierter Umfang noch offen ist.
- [`implemented-features/`](implemented-features/README.md) führt Funktionen auf, die im aktuellen Code nutzbar und anhand von Routen, Modulen oder Tests nachvollziehbar sind.

Der geprüfte Gesamtzustand, aktuelle Risiken und die empfohlene Arbeitsreihenfolge stehen weiterhin in [`PROJECT-STATUS.md`](../PROJECT-STATUS.md). Fachliche und technische Klärungen werden in [`open-points.md`](../open-points.md) geführt.

Der Abgleich mit den zum Projekt verfügbaren Codex-Aufgaben ist in [`chat-audit.md`](chat-audit.md) dokumentiert.

## Reihenfolge

1. [Verlässlicher Graphindex](feature-requests/verlaesslicher-graph-index.md)
2. PostgreSQL als Index- und App-Zustandsschicht gemäß [`docs/postgres-data-model.md`](../docs/postgres-data-model.md)
3. [Interaktive Graph-Visualisierung vervollständigen](feature-requests/interaktive-graph-visualisierung.md)
4. [Lesemodus mit Rabbit Hole](feature-requests/lesemodus-rabbit-hole.md)
5. [Pflegemodus](feature-requests/pflegemodus.md)
6. [Zettel-Vorschläge und Generierung](feature-requests/zettel-vorschlaege-und-generierung.md)
7. [Web-Hosting](feature-requests/web-hosting.md)

Das [Wissensspiel](feature-requests/wissensspiel.md) besitzt bereits einen spielbaren Durchstich. Seine dauerhafte Interaktionshistorie gehört zur PostgreSQL-Ausbaustufe.

Bereits nutzbare Querschnittsfunktionen sind außerdem [News und Bereichsnavigation](feature-requests/news-und-bereichsnavigation.md) sowie das [Dashboard mit Strukturmetriken](feature-requests/dashboard-und-strukturmetriken.md).
