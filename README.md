# Energieverbruik

Installeerbare web-app (PWA) om dagelijks het verbruik en de kosten van stroom en gas bij te houden.
Vervangt het Excel-bestand *Gasverbruik.xlsx*. Gebouwd op de eigen PWA-template.

**App:** https://gertjun.github.io/Energieverbruik/

## Wat de app doet

- **Eén knop voor alle bestanden** (Invoer → Bestanden inlezen): de app herkent zelf Vattenfall, HomeWizard,
  SolarEdge of de oude Excel. Voorrang bij verschillen: Vattenfall > HomeWizard > Excel > handmatig.
- **Invoer** via de CSV-download van Mijn Vattenfall (stroom per kwartier, gas per uur, of per dag) of de
  CSV-export van de HomeWizard Energy-app (P1-meter, per kwartier). Vattenfall gaat voor.
  Handmatig een dag invullen of een opmerking toevoegen kan ook.
- **Zonne-opbrengst** per dag of per maand uit een SolarEdge-export (monitoringportaal, CSV), of per maand handmatig.
  Met dagwaarden ook zelfvoorzienendheid per dag en week.
- **Eenmalige import** van het oude Excel-bestand (dagverbruik, opmerkingen, temperaturen, termijnbedragen, zonne-opbrengst).
- **Kosten per dag** volgens het Vattenfall-contract met 6 tijdvakken, inclusief vaste kosten,
  energiebelasting, saldering tot 1-1-2027 en de terugleverregeling daarna. Tarieven zijn per contract
  met geldigheidsperiode in te stellen.
- **Overzicht**: kerncijfers en grafieken per dag, week, maand en jaar, steeds vergeleken met vorig jaar, met pijltjes om terug in de tijd te bladeren;
  gas per graaddag; zelfvoorzienendheid van de zonnepanelen; termijnbedragen tegenover de werkelijke kosten.
  Op de laptop kies je rechtsboven de indeling: één kolom, naast elkaar, grafiek en lijst, of alles tegelijk.
- **Historie**: tabel per dag, per maand te bladeren, met ontbrekende dagen gemarkeerd.
  Daarnaast *Maanden* (totalen om naast de Excel te leggen) en *Controle* (verdachte waarden,
  ontbrekende dagen, steekproef, vergelijking met de jaarafrekening en alle imports).
- **Analyse**: zelf grafieken en tabellen samenstellen (verbruik, sluipverbruik, piekvermogen, kosten, weer; per
  dag/week/maand/jaar, per dag van de week, per uur of tijdvak; totaal of gemiddeld per dag), vergelijken met vorig
  jaar, een andere periode of een tweede grootheid. Daarnaast kant-en-klare analyses: heatmap (uur × datum), wat als
  de saldering stopt, eigen verbruik in de zonuren, stooklijn, gas weer-gecorrigeerd, opgeteld verloop door het jaar,
  jaarprognose, top-10, opvallende dagen, goedkopere uren, terugleverschaal, zon tegen instraling, thuisbatterij,
  dynamisch contract, warmtepomp, CO₂-uitstoot en vergelijken met een gemiddeld huishouden (in groepen).
  Niet-representatieve perioden zijn uit te sluiten. Als favoriet bewaren, CSV downloaden.
- **Instellingen** op één plek: Tarieven, Gegevens (export, temperatuurlocatie, back-up) en App en sync
  (met kleurthema en licht/donker per apparaat).
- **Importcontrole**: na elke import een rapport; elke import (de laatste 10) is ongedaan te maken.
- **Temperaturen** worden automatisch opgehaald bij Open-Meteo (gratis, geen account).
- **Export** als CSV (opent in Excel) of JSON.

## Gegevens en privacy

Alle gegevens staan versleuteld op het apparaat en synchroniseren als één versleuteld bestand naar de
private repo `gertjun/SyncData` (pad `energieverbruik/vault.json`). Deze code-repo bevat geen gegevens.

De zonne-opbrengst kan automatisch komen: een GitHub Action in SyncData (`.github/workflows/solaredge.yml`
en `.github/scripts/solaredge.mjs`) haalt elke nacht de opbrengst per dag op bij de SolarEdge-API en schrijft
`energieverbruik/solaredge-dag.csv`. De API-sleutel staat alleen als geheim `SOLAREDGE_API_KEY` in SyncData,
nooit in deze publieke repo. De app leest het bestand met het sync-token (`js/energie/solaredge-auto.js`).

## Structuur

```
js/app.js                     Navigatie en schermkeuze
js/energie/model.js           Datamodel, samenvoegen, totalen per periode
js/energie/tarief.js          Tijdvakken, contracten, kosten, graaddagen
js/energie/import-homewizard.js  HomeWizard CSV → verbruik per uur en per dag
js/energie/import-vattenfall.js  Vattenfall CSV (kwartier/uur/dag) → zelfde omrekening
js/energie/import-solaredge.js SolarEdge CSV (opbrengst per dag of per maand)
js/energie/solaredge-auto.js  Opbrengst automatisch inlezen uit SyncData (bestand van de GitHub Action)
js/energie/import-excel.js    Oude Excel inlezen (via xlsx.js, zonder library)
js/energie/importeren.js      Imports in de kluis zetten, importlogboek, ongedaan maken
js/energie/controle.js        Controles: verdachte waarden, ontbrekende dagen, steekproef
js/energie/scherm-controle.js Historie → Maanden en Controle, importrapport
js/energie/weer.js            Temperaturen bij Open-Meteo
js/energie/grafiek.js         Grafieken in SVG: staven (optioneel lijn/grenslijn), heatmap, puntenwolk, jaarlijnen
js/energie/analyse.js         Rekenwerk voor Analyse (indelingen, vergelijkingen, stooklijn, prognose, uitsluiten)
js/energie/analyse-soorten.js De kant-en-klare soorten analyse (keuzes en resultaat per soort), groepen voor de tegels
js/energie/analyse-watals.js  Rekenwerk voor de soorten van 1.29–1.37 (batterij, dynamisch, warmtepomp, CO₂, …)
js/energie/analyse-watals-soorten.js  Keuzes en resultaat van die soorten
js/energie/extern.js          Zoninstraling (Open-Meteo) en beursprijzen (EnergyZero), bewaard op het apparaat
js/energie/scherm-*.js        De vijf schermen
js/core/                      Template-kern (kluis, sync, Face ID) — niet aanpassen, behalve:
                              shell.js toont de instellingen als paneel (#settings-panel) i.p.v. venster (1.6.0)
                              shell.js: ctx.syncIngesteld en ctx.leesSyncBestand(pad); github.js: getText() (1.38.0)
```

Zie `NOTES.md` (stand van zaken), `DECISIONS.md` (keuzes), `CHANGELOG.md` en `WISHLIST.md`.
Werkinstructies voor Claude staan in `docs/CLAUDE-INSTRUCTIES.md`.

## Lokaal testen

```bash
python3 -m http.server 8080   # open http://localhost:8080
```
