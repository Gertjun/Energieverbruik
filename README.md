# Energieverbruik

Installeerbare web-app (PWA) om dagelijks het verbruik en de kosten van stroom en gas bij te houden.
Vervangt het Excel-bestand *Gasverbruik.xlsx*. Gebouwd op PWA-Core (`Gertjun/PWA-Core`).

**App:** https://gertjun.github.io/Energieverbruik/

## Waar vind je wat

Elk onderwerp staat op één plek.

| | Vraag | Bestand |
| --- | --- | --- |
| Heden | Waar staan we nu, wat doet de app? | dit bestand, `README.md` |
| Heden | Hoe zit de app in elkaar (opbouw, datamodel, conventies, stijl)? | [`ARCHITECTUUR.md`](ARCHITECTUUR.md) |
| Toekomst | Wat moet of kan er nog gebeuren? | [`ROADMAP.md`](ROADMAP.md) |
| Verleden | Wat is er per versie veranderd? | [`CHANGELOG.md`](CHANGELOG.md) |
| Verleden | Waarom is iets zo gekozen? | [`DECISIONS.md`](DECISIONS.md) |

Werkafspraken voor Claude: [`CLAUDE.md`](CLAUDE.md).

## Stand

Bijgewerkt: 20 november 2026 · `main` **1.45.5** met PWA-Core v1.3.0. Dit blok wordt aan het eind van elke sessie overschreven.

- De documenten zijn omgezet naar de uniforme opbouw van al Geerts apps: `ARCHITECTUUR.md` is nieuw, de roadmap gebruikt W-nummers, de besluiten D-nummers en `CLAUDE.md` volgt de werkwijze met branch en pull request. Geen nieuwe appversie (alleen documenten).
- PWA-Core v1.3.0 met apparaatkoppeling (PR #10), beveiligde XLSX-import (PR #11) en versie 1.45.5 (PR #12) zijn gemerged. Bij PR #11 slaagden 123 unit tests, de Playwright-test, build en deploy.
- Praktijktests op echte apparaten na deze versies zijn nog niet vastgelegd; groene tests zijn geen apparaattest.
- Automatische zonne-opbrengst via SolarEdge doet nog niets: er is nog geen API-sleutel (ROADMAP W7 en W8).
- Afwijkingen van de gedeelde kern: geen (zie `ARCHITECTUUR.md`).

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

De zonne-opbrengst kan automatisch komen via een GitHub Action in SyncData; de API-sleutel staat alleen als
geheim in SyncData, nooit in deze publieke repo. Hoe dat werkt staat in `ARCHITECTUUR.md`.
