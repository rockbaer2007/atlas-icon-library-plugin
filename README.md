# ATLAS Icon Bibliothek

Eigenständiges ATLAS-Plugin zum Durchsuchen und Kopieren von Home-Assistant-Icons. MDI und importierte Iconsets werden in einem responsiven, virtualisierten Raster angezeigt. Das Plugin unterstützt Deutsch, Englisch und Französisch.

## Installation in ATLAS

Repository-Katalog in der ATLAS-Administration im Plugin-Manager hinzufügen:

```text
https://raw.githubusercontent.com/rockbaer2007/atlas-icon-library-plugin/main/repository.json
```

Das Plugin wird als eigenständiges Repository veröffentlicht und kann über diese Katalogadresse im ATLAS Plugin-Manager hinzugefügt werden.

Voraussetzung: ATLAS 0.1.248 oder neuer. Ältere Versionen enthalten nicht die korrigierte Verarbeitung externer Plugin-Pakete.

## Funktionen

- 7.447 lokal mitgelieferte MDI-Icons aus Version 7.4.47
- Iconset-Dropdown, Suche und bis zu 20 Rasterspalten
- virtuelle Darstellung großer Iconlisten
- Klick kopiert den vollständigen Namen, zum Beispiel `mdi:home` oder `atlas:home`
- Icon-Studio- und unterstützte statische Home-Assistant-Iconsets sicher vom PC oder über File Studio aus `/config/www/` einlesen
- `/config/www/` und Unterordner nach unterstützten Icon-Studio-Sets durchsuchen; berücksichtigt werden Dateien mit „icon“ im Namen oder in einem Ordnernamen (einschließlich `/config/www/community/`, in Home Assistant als `/local/community/` erreichbar)
- Home-Assistant-Legacy-Sets verwenden, wenn `window.customIcons` eine Namensliste bereitstellt
- eigene Import-Sets bleiben lokal in der Browser-IndexedDB gespeichert
- DE/EN/FR und ein einheitlicher Plugin-Hub-Button oben rechts

Die moderne Home-Assistant-Schnittstelle `window.customIconsets` stellt keinen allgemeinen Namensindex bereit. Sets ohne eigene Iconliste können deshalb nicht automatisch vollständig aufgelistet werden. Das Plugin führt fremden JavaScript-Code nicht aus. Für den direkten Dateizugriff muss `/config/www` in File Studio freigegeben sein; ein Home-Assistant-Token wird nicht benötigt.

## Entwicklung

```sh
npm run build
npm run check
npm test
```

Der Build erstellt das Installationspaket und synchronisiert den Repository-Katalog. Der gebündelte MDI-Katalog enthält seine Lizenzangaben aus `@mdi/svg` 7.4.47.
