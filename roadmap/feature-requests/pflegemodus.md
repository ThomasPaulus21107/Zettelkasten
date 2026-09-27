# Feature Request: Pflegemodus

**Status:** Bestandsansicht und Marker-Vorschau umgesetzt, PostgreSQL-Übergabe offen

## Ziel

Die Struktur des Zettelkastens prüfen und nachvollziehbare Hinweise geben, ohne Quellen automatisch zu verändern.

## Denkbare Hinweise

- nicht auflösbare Links und isolierte Zettel
- ungewöhnlich zentrale oder schwach angebundene Bereiche
- inkonsistente Metadaten oder Pattern-Abweichungen
- Kandidaten für fehlende explizite Verbindungen

## Sicherheitsprinzip

Jede vorgeschlagene Änderung zeigt Quellen, Begründung und Vorschau. Erst eine explizite Bestätigung darf einen dauerhaften Auftrag erzeugen.

Als erste kleine Pflegehandlung bietet der Lesemodus per Rechtsklick ausschließlich `@add`, `@new`, `@fix` und `@ask` für ein Wort oder eine markierte Textpassage an. Auch diese Handlung führt immer zuerst in eine Diff-Vorschau und benötigt eine eigene Bestätigung.

Ein bestätigter Marker wird ausschließlich als idempotenter Auftrag in PostgreSQL gespeichert. Die App verändert dafür keine Vault-Datei und benötigt keine GitHub-Schreibberechtigung. Ein späterer VAULTS-Prozess liest offene Aufträge, prüft sie gegen den aktuellen Vault-Stand, setzt sie um und meldet den Status zurück. Der technische Übergabevertrag zwischen VAULTS und App bleibt separat festzulegen.

## Tatsächlicher Stand

Die Route `/verzetteln` bündelt bereits Bestandsfilter für leere oder unvollständige Zettel, isolierte Zettel, unaufgelöste Links und vorhandene `@`-Marker. Im Reader sind die vier erlaubten Marker über ein Kontextmenü auswählbar; Textstelle und Diff werden vor der Bestätigung angezeigt.

Die heutige Bestätigung verwendet noch den prototypischen Dateischreibweg. Sie muss vor einer produktiven Nutzung auf den beschlossenen PostgreSQL-Auftrag umgestellt werden. Automatische Pflegehinweise und die spätere VAULTS-Verarbeitung sind noch nicht umgesetzt.
