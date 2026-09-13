# Projektstatus und Übergabe

**Stand:** 13. September 2026

Dieses Dokument ist der Einstieg für die Weiterarbeit in einem neuen Projekt-Chat. Es hält den geprüften Ist-Stand fest und trennt bereits funktionierende Teile von offenen Grundlagenarbeiten.

## Kurzurteil

Das Repository ist eine gute, bewusst kleine Basis für den lokalen Graph-Prototyp. Produktidee, Vault-Grenzen und spätere Features sind dokumentiert. Bevor Lesemodus, Pflegemodus oder Generierung aufgebaut werden, muss der Graphindex jedoch verlässlich und sicher gemacht werden. Der nächste priorisierte Schritt ist deshalb [`feature-request-verlaesslicher-graph-index.md`](feature-request-verlaesslicher-graph-index.md).

## Umgesetzt

- lokaler Node-Server auf `127.0.0.1`, standardmäßig Port 4173
- read-only Einlesen separat konfigurierter SX- und DX-Pfade
- Ausschluss konfigurierter Archiv-, Backup-, Obsidian- und Git-Verzeichnisse
- Graph aus Inline-Wiki-Links und `related`
- Suche nach Titel, Alias und Pfad
- Detailansicht mit Metadaten und ein fokussierter Canvas mit direkter Nachbarschaft
- aktueller Quellcode entfernt den Markdown-Körper vor der Ausgabe der Graph-API
- getrennte Feature Requests für Graph, Lesen/Rabbit Hole, Pflege, Generierung und Hosting
- trunk-orientierter Workflow mit Conventional Commits und Pull Requests

## Gemessener Stand am echten Vault

| Messung | Ergebnis |
| --- | ---: |
| eingelesene Markdown-Dateien | 1.916 |
| erzeugte explizite Kanten | 13.849 |
| nicht aufgelöste Linkvorkommen | 417 |
| Indexaufbau lokal | ca. 0,45–0,55 Sekunden |
| Größe der aktuellen Graph-API ohne Bodies | ca. 4,2 MB |
| doppelte Edge-IDs | 1.347 |
| doppelte Dateibasenamen innerhalb eines Vaults | 9 |

Der aktuelle Frontmatter-Parser übersieht nach der Bestandsmessung mindestens 18 blockförmige `related`-Listen sowie jeweils 7 blockförmige `tags`-, `aliases`- und `area`-Listen. 55 eingelesene Markdown-Dateien besitzen kein erkanntes Frontmatter; darunter können Steuer-, Protokoll- oder Entwurfsdateien liegen und nicht nur Zettel.

## Bekannte Lücken und Risiken

### Priorität 1: Datenkorrektheit

- Der handgeschriebene Frontmatter-Parser bildet gültiges YAML nur teilweise ab.
- Pfadpräfixe in Wiki-Links werden bei der Auflösung verworfen. Bei gleichen Dateinamen kann deshalb das falsche Ziel gewählt werden.
- Mehrdeutige Titel, Dateinamen oder Aliasse werden derzeit stillschweigend auf den ersten Treffer aufgelöst.
- Jede Markdown-Datei wird als Knoten behandelt. Unter anderem `CLAUDE.md`, `log.md` und `_proposals` benötigen eine explizite Klassifikation oder einen Ausschluss.
- Wiederholte Linkvorkommen erzeugen nicht eindeutige Edge-IDs. Für Rabbit-Hole-Pfade und spätere Analysen braucht jede Kante eine stabile Identität und nachvollziehbare Herkunft.

### Priorität 1: Sicherheit und Betrieb

- Beziehungskarten setzen Vault-Werte derzeit mit `innerHTML` ein. Diese Ausgabe muss auf sichere DOM-Erzeugung mit `textContent` umgestellt werden.
- Ein gestarteter Node-Prozess lädt Codeänderungen nicht automatisch neu. Bei der Prüfung lief auf Port 4173 noch ein älterer Prozess, der Markdown-Körper ausgab, obwohl der aktuelle Quellcode sie entfernt. Nach jedem Pull oder Branchwechsel muss der lokale Server beendet und neu gestartet werden.
- Absolute lokale Pfade und interne Fehlermeldungen dürfen bei einer späteren Web-Bereitstellung nicht an Clients gelangen.

### Priorität 2: Entwicklungsqualität

- Es gibt erst einen automatisierten Indexer-Test.
- GitHub Actions/CI und eine festgelegte unterstützte Node-Version fehlen.
- Die Graph-API wird bei jedem Abruf vollständig neu aufgebaut und komplett an den Browser übertragen. Das ist lokal noch schnell genug, aber keine dauerhafte API-Grenze für Lesen oder Hosting.
- Der Canvas ist mit Maus und Pointer bedienbar, besitzt jedoch noch keine gleichwertige Tastaturnavigation.

### Dokumentationsabgleich

Der Graph-Prototyp ist umgesetzt, aber noch nicht der gesamte als „Version 1“ beschriebene Umfang. Filter nach Vault, Area, Tag, Typ und Status, das Lesen des Zettelinhalts, Pfad-Historie sowie eine vollständige Darstellung der Kantenherkunft sind weiterhin offen.

## Getroffene Entscheidungen

- Das Vault-Repository bleibt Quelle der Wahrheit und standardmäßig read-only.
- Vault-Inhalte und lokale Konfiguration werden nicht in dieses Repository eingecheckt.
- Explizite Beziehungen haben Vorrang; berechnete Ähnlichkeiten werden später sichtbar als Hypothesen gekennzeichnet.
- SX und DX dürfen gemeinsam dargestellt werden, ihre Herkunft muss aber immer sichtbar bleiben.
- Strukturelle Vault-Änderungen werden vorgeschlagen und nie stillschweigend durchgeführt.
- Web-Hosting, Semantic Release und Vault-Schreibfunktionen folgen erst nach einem verlässlichen lokalen Kern.
- GitHub verwendet `main` als Default Branch.

## Offene Produktentscheidungen

- Standardstart als gemeinsame Karte oder getrennte SX-/DX-Sicht
- Einstieg über globale Übersicht, Suche oder kuratierten Startzettel
- erste Form einer späteren Lückenerkennung: strukturelle Lücke, thematische Nähe oder Domänenbrücke
- Regeln für absichtliche Cross-Vault-Links und deren eindeutige Syntax
- Lizenzierung des öffentlich sichtbaren Anwendungs-Repositories

## Empfohlene Reihenfolge

1. verlässlicher Graphindex und sichere Ausgabe
2. Filter und erklärbare Kantenanzeige vervollständigen
3. Lesemodus mit Rabbit-Hole-Pfad
4. Pflegemodus und Lückenanalyse
5. bestätigungspflichtige Vorschläge und Generierung
6. Datenschutz-, Zugriffs- und Hostingkonzept

## Übergabe an einen neuen Projekt-Chat

Der neue Chat liest zuerst `AGENTS.md`, danach dieses Dokument, `CONCEPT.md`, `DEVELOPMENT.md`, `docs/vault-integration-contract.md` und den jeweils aktiven Feature Request. Er beginnt auf aktuellem `main` und setzt als Nächstes den verlässlichen Graphindex um, sofern der Nutzer keine andere Priorität nennt.
