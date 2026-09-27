# Feature Request: Verlässlicher Graphindex

**Status:** als Nächstes · **Priorität:** Grundlage vor weiteren Produktfeatures

## Ziel

Aus den beiden Vaults einen deterministischen, überprüfbaren und sicheren Graphindex erzeugen. Kein Link darf nur aufgrund der Reihenfolge im Dateisystem auf ein beliebiges Ziel zeigen. Der Index soll später dieselbe fachliche Grundlage für Graph, Lesemodus, Pflegehinweise und Generierung bilden.

## Umfang

### Frontmatter

- gültiges YAML mit einem etablierten Parser lesen
- Inline- und Blocklisten für `tags`, `aliases`, `related` und `area` unterstützen
- unbekannte Felder verlustfrei tolerieren
- Parserfehler als Diagnose mit Vault und relativem Pfad melden, ohne den gesamten Indexlauf unverständlich abzubrechen
- unterschiedliche SX-/DX-Profile validieren, aber Abweichungen zunächst nur melden

### Dateiklassifikation

- zwischen normalen Zetteln, Index/MOC, Entwürfen, Systemanweisungen und Protokollen unterscheiden
- `CLAUDE.md`, `log.md` und `_proposals` nicht stillschweigend als normale Zettel behandeln
- Klassifikationsregeln zentral, testbar und pro Vault erweiterbar halten

### Linkauflösung

Die Auflösung verwendet eine feste Reihenfolge:

1. exakter relativer Pfad im Quell-Vault,
2. exakter Pfad ohne `.md`,
3. eindeutiger Dateiname, Titel oder Alias im Quell-Vault,
4. ausdrücklich erlaubte Cross-Vault-Auflösung.

Mehrere Treffer ergeben den Status `ambiguous` mit Kandidaten statt einer willkürlichen Auswahl. Nicht vorhandene Ziele bleiben `unresolved`. Case-Insensitivity, Aliasse, Überschriftenanker und Obsidian-Anzeigenamen bleiben unterstützt.

### Kanten und Herkunft

- stabile, eindeutige IDs für Kanten oder Linkvorkommen
- Herkunft `inline`, `related` oder später `structure`/`semantic`
- Richtung, Quellknoten und relative Quellposition nachvollziehbar halten
- wiederholte Links entweder bewusst als Vorkommen erhalten oder deterministisch aggregieren
- keine absoluten Dateisystempfade und keine Markdown-Körper in der Graph-API

### Sichere Ausgabe

- Vault-Werte im Browser ausschließlich als Text behandeln; kein `innerHTML` mit Quelldaten
- interne Fehler für die lokale UI verständlich, aber ohne unnötige Pfad- oder Inhaltsdaten ausgeben
- laufenden Serverstand erkennbar machen, damit ein veralteter Prozess nicht mit dem aktuellen Code verwechselt wird

### Qualitätssicherung

- repräsentative synthetische Fixtures für SX und DX
- Tests für Inline- und Block-YAML, CRLF, Aliasse, Pfadpräfixe, gleiche Dateinamen, Cross-Vault-Fälle, unaufgelöste und mehrdeutige Links sowie ausgeschlossene Dateitypen
- API-Test, der das Fehlen von Markdown-Körpern sicherstellt
- unterstützte Node-Version festlegen
- CI auf Pull Requests und `main`

## Akzeptanzkriterien

- Alle im Testbestand gültigen Frontmatter-Varianten werden korrekt gelesen.
- Kein mehrdeutiger Link wird stillschweigend einem Ziel zugeordnet.
- Pfadpräfixe können gleichnamige Zettel zuverlässig unterscheiden.
- Edge-IDs sind eindeutig oder Vorkommen werden explizit als solche modelliert.
- Steuer-, Log- und Entwurfsdateien erscheinen nicht als normale Zettel.
- Die Browserausgabe kann aus Titel, Alias oder Linktext kein HTML ausführen.
- Die Graph-API enthält weder Markdown-Körper noch absolute Vault-Pfade.
- Der vollständige reale Index bleibt auf einem Entwicklungsrechner in einer für lokale Interaktion brauchbaren Größenordnung.
- Tests laufen lokal und in CI erfolgreich.

## Nicht-Ziele

- Filter- oder Canvas-Neugestaltung
- vollständige Zettel-Leseansicht
- semantische Ähnlichkeit oder KI-Auswertung
- automatische Änderungen am Vault
- persistente Datenbank oder Web-Hosting

## Strukturelle Auswirkung auf die Vaults

Für dieses Increment ist keine Vault-Migration erforderlich. Inkonsistenzen werden diagnostiziert. Falls eine eindeutige Cross-Vault-Syntax oder typisierte `related`-Struktur später wesentlich hilft, wird sie als eigener Vorschlag mit Nutzen, betroffenen Zetteln, Risiko und Migrationsweg vorgelegt.
