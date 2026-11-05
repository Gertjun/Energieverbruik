# Energieverbruik

Installeerbare web-app (PWA) om dagelijks het verbruik en de kosten van stroom en gas bij te houden.
Vervangt het Excel-bestand *Gasverbruik.xlsx*. Gebouwd op de eigen PWA-template.

**App:** https://gertjun.github.io/Energieverbruik/

## Wat de app doet

- **Invoer** via de CSV-download van Mijn Vattenfall (stroom per kwartier, gas per uur, of per dag) of de
  CSV-export van de HomeWizard Energy-app (P1-meter, per kwartier). Vattenfall gaat voor.
  Handmatig een dag invullen of een opmerking toevoegen kan ook.
- **Eenmalige import** van het oude Excel-bestand (dagverbruik, opmerkingen, temperaturen, termijnbedragen, zonne-opbrengst).
- **Kosten per dag** volgens het Vattenfall-contract met 6 tijdvakken, inclusief vaste kosten,
  energiebelasting, saldering tot 1-1-2027 en de terugleverregeling daarna. Tarieven zijn per contract
  met geldigheidsperiode in te stellen.
- **Overzicht**: kerncijfers en grafieken per dag, week, maand en jaar, steeds vergeleken met vorig jaar;
  gas per graaddag; zelfvoorzienendheid van de zonnepanelen; termijnbedragen tegenover de werkelijke kosten.
- **Historie**: tabel per dag, per maand te bladeren, met ontbrekende dagen gemarkeerd.
  Daarnaast *Maanden* (totalen om naast de Excel te leggen) en *Controle* (verdachte waarden,
  ontbrekende dagen, steekproef, vergelijking met de jaarafrekening en alle imports).
- **Importcontrole**: na elke import een rapport; elke import (de laatste 10) is ongedaan te maken.
- **Temperaturen** worden automatisch opgehaald bij Open-Meteo (gratis, geen account).
- **Export** als CSV (opent in Excel) of JSON.

## Gegevens en privacy

Alle gegevens staan versleuteld op het apparaat en synchroniseren als één versleuteld bestand naar de
private repo `gertjun/SyncData` (pad `energieverbruik/vault.json`). Deze code-repo bevat geen gegevens.

## Structuur

```
js/app.js                     Navigatie en schermkeuze
js/energie/model.js           Datamodel, samenvoegen, totalen per periode
js/energie/tarief.js          Tijdvakken, contracten, kosten, graaddagen
js/energie/import-homewizard.js  HomeWizard CSV → verbruik per uur en per dag
js/energie/import-vattenfall.js  Vattenfall CSV (kwartier/uur/dag) → zelfde omrekening
js/energie/import-excel.js    Oude Excel inlezen (via xlsx.js, zonder library)
js/energie/importeren.js      Imports in de kluis zetten, importlogboek, ongedaan maken
js/energie/controle.js        Controles: verdachte waarden, ontbrekende dagen, steekproef
js/energie/scherm-controle.js Historie → Maanden en Controle, importrapport
js/energie/weer.js            Temperaturen bij Open-Meteo
js/energie/grafiek.js         Staafgrafieken in SVG
js/energie/scherm-*.js        De vier schermen
js/core/                      Template-kern (kluis, sync, Face ID) — niet aanpassen
```

Zie `NOTES.md` (stand van zaken), `DECISIONS.md` (keuzes), `CHANGELOG.md` en `WISHLIST.md`.
Werkinstructies voor Claude staan in `docs/CLAUDE-INSTRUCTIES.md`.

## Lokaal testen

```bash
python3 -m http.server 8080   # open http://localhost:8080
```
