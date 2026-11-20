# Architectuur – hoe de app in elkaar zit

> **Dit bestand (heden):** opbouw, aansluiting op PWA-Core, datamodel, conventies en stijl. Bijwerken als een van die dingen verandert.
> **Niet hier:** wat de app doet en de stand van nu → [`README.md`](README.md); wat nog moet → [`ROADMAP.md`](ROADMAP.md); wat er per versie veranderde → [`CHANGELOG.md`](CHANGELOG.md); waarom → [`DECISIONS.md`](DECISIONS.md).

Bijgewerkt: 20 november 2026 · versie 1.45.5 · PWA-Core v1.3.0 · gegevensversie (schema) 5

## Uitgangspunten

- Alleen HTML, CSS en JavaScript (ES-modules), zonder framework, build-stap, npm-packages of CDN-scripts in de app. De tests gebruiken wel npm (Playwright).
- Draait op GitHub Pages (`https://gertjun.github.io/Energieverbruik/`), installeerbaar als PWA en offline bruikbaar.
- Eén gebruiker (Geert), meerdere apparaten (iPhone, iPad, laptop) via een versleutelde kluis in de private repo `gertjun/SyncData`.

## Mappen en bestanden

```
index.html                    Schil van de app (schermen van PWA-Core) en de CSP
manifest.webmanifest, icons/  PWA-manifest en iconen
sw.js                         Service worker: offline cache (PRECACHE) en updates (VERSION)
css/base.css                  Basis-CSS van PWA-Core (niet aanpassen)
css/app.css                   Eigen CSS: kleuren, thema's, schermen van deze app
js/main.js                    Start de schil (core/shell.js)
js/config.js                  App-instellingen: naam, version, storagePrefix, kluispad, vergrendeltijd
js/thema.js                   Kleurthema en licht/donker per apparaat, vóór het tekenen gezet
js/app.js                     Aansluiting op de kern: schermen, schema, migrate/merge, renderSettings
js/core/                      PWA-Core (kluis, versleuteling, sync, vergrendelen, Face ID, koppelen, navigatie)
js/energie/model.js           Datamodel, samenvoegen, totalen per periode
js/energie/tarief.js          Tijdvakken, contracten, kosten, graaddagen
js/energie/tijd.js            Datum- en tijdhulpjes (lokale tijd, zomer-/wintertijd)
js/energie/import-homewizard.js  HomeWizard CSV → verbruik per uur en per dag
js/energie/import-vattenfall.js  Vattenfall CSV (kwartier/uur/dag) → zelfde omrekening
js/energie/import-solaredge.js   SolarEdge CSV (opbrengst per dag of per maand)
js/energie/solaredge-auto.js  Opbrengst automatisch inlezen uit SyncData (bestand van de GitHub Action)
js/energie/import-excel.js    Oude Excel inlezen (via xlsx.js, zonder library)
js/energie/xlsx.js            Beveiligde XLSX-lezer (ZIP/XML met grenzen)
js/energie/importeren.js      Imports in de kluis zetten, importlogboek, ongedaan maken
js/energie/controle.js        Controles: verdachte waarden, ontbrekende dagen, steekproef
js/energie/weer.js            Temperaturen bij Open-Meteo
js/energie/extern.js          Zoninstraling (Open-Meteo) en beursprijzen (EnergyZero), bewaard op het apparaat
js/energie/grafiek.js         Grafieken in SVG: staven (optioneel lijn/grenslijn), heatmap, puntenwolk, jaarlijnen
js/energie/analyse.js         Rekenwerk voor Analyse (indelingen, vergelijkingen, stooklijn, prognose, uitsluiten)
js/energie/analyse-soorten.js De kant-en-klare soorten analyse, groepen voor de tegels
js/energie/analyse-watals.js  Rekenwerk batterij, dynamisch contract, warmtepomp, CO₂ … (zonder DOM, met Node te testen)
js/energie/analyse-watals-soorten.js  Keuzes en resultaat van die soorten
js/energie/analyse-gasprognose.js     Gasprognose met de weersverwachting
js/energie/ui.js              Gedeelde schermonderdelen van deze app
js/energie/scherm-*.js        De schermen: overzicht, invoer, historie, analyse, controle, instellingen
tests/                        Unit- en contracttests (node --test) en tests/e2e/ (Playwright)
tools/pin.mjs, tools/precache.mjs  Controle van de PWA-Core-pin en van de PRECACHE-lijst
core-manifest.json, pwa-core.lock.json  Welke PWA-Core-versie is vastgepind en welke bestanden daarbij horen
```

## Aansluiting op PWA-Core

- De kern komt uit `Gertjun/PWA-Core` en is vastgepind in `pwa-core.lock.json` (versie, tag, commit en SHA-256 van het manifest). `core-manifest.json` noemt de bestanden die bij de kern horen (`js/core/*` en `css/base.css`).
- **Die bestanden pas je hier nooit aan.** Een fix hoort in PWA-Core zelf; daarna komt hij via een eigen distributie-PR in deze app. `node tools/pin.mjs verify` controleert dat de kopie exact klopt.
- **Afwijkingen van de kern: geen.** Sinds 1.45.0 (D49) en de pin op PWA-Core (D50) is `js/core/` een exacte kopie; de vroegere uitzonderingen (instellingen als paneel, een bestand uit SyncData lezen) zitten nu in de kern zelf (`ctx.syncConfigured`, `ctx.readSyncFile`).
- Wat de app aan de kern levert (`app` in `js/app.js`): `schemaVersion`, `initialData`, `migrate`, `merge`, `screens` (Overzicht, Invoer, Historie, Analyse), `render(root, ctx)` en `renderSettings(pagina, el, ctx)` voor de eigen instellingenpagina's Tarieven, Gegevens en Weergave.
- Wat de kern regelt: kluis en versleuteling, wachtwoord en Face ID/passkey, automatisch vergrendelen, synchroniseren met GitHub, apparaat koppelen, de navigatie (tabbalk op de iPhone, tabbladen op de iPad rechtop, inklapbare zijbalk vanaf 1000 px) en het scherm Instellingen.
- Vaste waarden in `js/config.js` die nooit meer mogen veranderen: `storagePrefix: 'energieverbruik'` en `defaultDataPath: 'energieverbruik/vault.json'`.

## Datamodel

De kluis bevat één object (zie `initialData` in `js/energie/model.js`):

| Veld | Inhoud | Id |
| --- | --- | --- |
| `schema` | gegevensversie, nu **5** | — |
| `dagen` | verbruik per dag (afname, teruglevering, gas, per uur), opmerking, `imp`, `gecontroleerd` | vast: `d:<datum>` |
| `weer` | temperatuur per dag | vast: `w:<datum>` |
| `maanden` | per maand: termijnbedrag, zonne-opbrengst per maand | vast: `m:<jjjj-mm>` |
| `zon` | zonne-opbrengst per dag (SolarEdge) | vast: `z:<datum>` |
| `contracten` | tarieven met geldigheidsperiode | willekeurig (`crypto.randomUUID`) |
| `importen` | importlogboek met herstelgegevens (laatste 10 ongedaan te maken) | willekeurig |
| `analyses` | bewaarde favorieten van Analyse | willekeurig |
| `uitgesloten` | perioden die Analyse overslaat | willekeurig |
| `instellingen` | temperatuurlocatie (plaats, lat, lon) met `updatedAt` | — |

Regels:

- **Elk record** heeft `id`, `createdAt` en `updatedAt`. Een wijziging zet `updatedAt` (`upsert` in model.js, `updateById` in de kern).
- **Nooit echt verwijderen.** Een verwijderd record wordt een grafsteen `{ id, deleted: true, updatedAt }` (`removeById` uit `core/records.js`); de verwijderadministratie van de kern (`core/deletions.js`) zorgt dat het ook op andere apparaten weg blijft. Lijsten tonen alleen `alive(...)`.
- **Vaste id's** per datum/maand zorgen dat dezelfde dag op twee apparaten één record wordt. Een vaste-id-record komt na een grafsteen alleen terug als het strikt nieuwer is (D50).
- **Samenvoegen** (`merge`): per collectie wint per id het record met de nieuwste `updatedAt`; bij `instellingen` het object met de nieuwste `updatedAt`.
- **Gegevensversie verhogen** als een oudere appversie de nieuwe gegevens niet goed kan samenvoegen (bijv. een nieuwe collectie of een veld met een andere betekenis):
  1. `SCHEMA` in model.js met 1 ophogen en een regel met uitleg in het commentaar erboven zetten;
  2. de nieuwe collectie aan `COLLECTIES` en `initialData` toevoegen en `migrate` laten aanvullen, zodat oude gegevens blijven werken;
  3. een test voor het laden van gegevens van de vorige versie toevoegen;
  4. in ROADMAP een actie voor Geert: na het bijwerken alle apparaten eenmaal openen. Een apparaat met een oudere app krijgt dan vanzelf de melding dat het moet bijwerken (de kern weigert gegevens met een hoger schema).
- Een nieuw optioneel veld dat oudere versies gewoon laten staan, heeft geen nieuwe gegevensversie nodig.

### Gegevens buiten de kluis

Alleen niet-persoonlijke gegevens en weergavekeuzes per apparaat staan in `localStorage` (niet versleuteld, niet gesynchroniseerd):

- `energieverbruik:weergave` (thema, licht/donker), `energieverbruik.overzichtWeergave`, `energieverbruik.overzichtIndeling`, `energieverbruik.zonJaren`;
- openbare, opnieuw op te halen gegevens: `energieverbruik:straling`, `energieverbruik:beursprijzen`, `energieverbruik:weervoorspelling`, `energieverbruik:normaaltemperatuur`;
- `energieverbruik:solaredge-sha` (welk automatisch SolarEdge-bestand al is verwerkt).

Verbruik, kosten, tarieven en alles wat over Geert gaat, staat alleen in de kluis.

### Automatische zonne-opbrengst

Een GitHub Action in `gertjun/SyncData` (`.github/workflows/solaredge.yml`) schrijft elke nacht `energieverbruik/solaredge-dag.csv` (opmaak van een SolarEdge-dagexport). De API-sleutel staat alleen als geheim `SOLAREDGE_API_KEY` in SyncData. De app leest het bestand met het sync-token via `ctx.readSyncFile` (`js/energie/solaredge-auto.js`) en verwerkt alleen nieuwe of gewijzigde dagen als import (D30).

## Externe diensten

Elk domein staat in `connect-src` van de CSP in `index.html`; offline of een fout wordt netjes gemeld zonder dat de app stopt.

| Dienst | Domein | Waarvoor |
| --- | --- | --- |
| GitHub | `api.github.com` | synchroniseren (kern) en het SolarEdge-bestand |
| Open-Meteo | `archive-api.open-meteo.com`, `api.open-meteo.com` | temperaturen, instraling, weersverwachting |
| EnergyZero | `api.energyzero.nl` | beursprijzen (dynamisch contract) |

Nieuwe dienst: domein aan `connect-src` toevoegen en offline/fouten afvangen.

## Bronbestanden (importformaten)

Voorbeelden van deze bestanden staan in het Claude-project, niet in deze publieke repo.

- Vattenfall-downloads `E-<EAN>-Kwartier.csv` (stroom) en `G-<EAN>-Uur.csv` (gas): `Datum;Tijd;Meterstand levering;
  Verbruik;(Stand teruglevering;Teruglevering)`, Nederlandse getallen, nieuwste regel bovenaan, gas in Windows-1252.
- SolarEdge-dagexport `energy-chart-data_<datum>.csv`: `"Meettijd","Productie (kWh)","Verbruik (kWh)"`, één regel
  per dag (`"1 okt. 2026 00:00","8.21","0"`); Verbruik is altijd 0 (geen verbruiksmeter).
- SolarEdge-export `comparative-month-chart-data_<datum>.csv`: `"Meettijd","Energy (kWh)"`, één regel per maand
  (`"jan. 2020","0"`), UTF-8 met BOM, komma als scheiding, punt als decimaalteken, alle jaren t/m december van
  het huidige jaar (toekomstige maanden 0).
- `Gasverbruik.xlsx`: blad DATA (per dag), blad Kosten (per maand: termijn €243, SolarEdge-opbrengst),
  blad Blad1 (jaarafrekening-schatting per tijdvak).
- `Energietarieven.png` en `Gastarieven.png`: Vattenfall-tarieven (6 tijdvakken).
- HomeWizard-exports `P1e-…csv` (stroom) en `P1g-…csv` (gas): kolommen `time, Import T1 kWh, Import T2 kWh,
  Export T1 kWh, Export T2 kWh, L1/L2/L3 max W` en `time, Total gas used`; meterstanden per kwartier,
  lokale tijd (bij wintertijd komt 02:00–02:45 twee keer voor).

Voorrang bij verschillen: Vattenfall > HomeWizard > Excel > handmatig.

## Service worker en nieuwe bestanden

- `sw.js` bewaart alle bestanden van de app in de cache (`PRECACHE`). **Elk nieuw bestand** (JS, CSS, icoon) moet in `PRECACHE`; `node tools/precache.mjs` controleert dat alle kernbestanden erin staan.
- `VERSION` in `sw.js` is altijd gelijk aan `version` in `js/config.js`. Bij een nieuwe versie ziet de app "update beschikbaar".
- De cachenaam bevat het pad van de app, zodat andere apps onder `gertjun.github.io` hem niet opruimen.

## Bestanden aanbieden

Back-up en export (CSV, JSON) gaan altijd via `saveFile(naam, inhoud, type)` uit `js/core/dom.js` (op de iPhone het deelmenu). Nooit een eigen downloadlink maken.

## Conventies

- **Taal:** alle teksten in de app, namen van eigen functies/variabelen en commentaar in het Nederlands. De kern gebruikt Engelse namen.
- **Veiligheid:** strikte CSP (`script-src 'self'`, `style-src 'self'`): geen inline scripts, event handlers of `style=""`. Elementen maken met `h()` uit `core/dom.js`; gebruikersinvoer gaat als tekst, nooit via `innerHTML`. Geen gegevens, wachtwoorden of tokens loggen.
- **Rekenwerk los van het scherm:** berekeningen in modules zonder DOM (model.js, tarief.js, analyse*.js, import-*.js), zodat ze met Node te testen zijn.
- **Getallen en datums:** Nederlandse notatie in beeld (komma, € 1.234,56); intern `jjjj-mm-dd` in lokale tijd (`tijd.js`), rekening houdend met zomer- en wintertijd.
- **Schermtoestand** (gekozen periode, open kaart) staat in `staat` in app.js, niet in de kluis.

## Stijl

- **Mobiel eerst:** knoppen minimaal 44 px, invoervelden met 16 px tekst, safe areas via `env(safe-area-inset-*)` en `--safe-top` (minstens 24 px bovenin op de iPad, D42).
- **Kleuren:** alleen CSS-variabelen (`--accent`, `--ok`, …) met `light-dark()`; kleurthema's en licht/donker/Zwart via `js/thema.js` (D22, D23). Geen vaste kleuren.
- **Indeling:** iPhone tabbalk onderin; iPad rechtop tabbladen; laptop en iPad liggend een inklapbare zijbalk links. Tabellen en grafieken passen zonder schuifbalk opzij; grafieken rekenen hun breedte uit met scherm en zijbalk (`grafiek.js`). Brede schermen vanaf 1200 px (D35).
- **Toegankelijkheid (WCAG 2.2 AA):** knoppen met alleen een icoon krijgen een `aria-label`, formulieren hebben zichtbare labels.
- **Richtlijnen in de projectkennis:** `ui-ux-richtlijnen.md` (ontwerp: raster, kleur, typografie, interactie, statussen, checklist per scherm) en `html-best-practices.md` (HTML en CSS) gelden bij elk nieuw scherm of elke wijziging. Bewuste afwijkingen van de UI/UX-richtlijnen (D53):
  - **Namen van de kleurvariabelen**: de app houdt haar eigen namen (`--accent`, `--ok`, `--warn`, `--danger`, `--kleur-*`, `--jaar-*`) in plaats van `--color-*`; hernoemen zou alle CSS raken zonder zichtbaar verschil.
  - **Licht/donker via `light-dark()`** met `color-scheme` in plaats van losse `prefers-color-scheme`-blokken, zodat vast licht of donker per apparaat kan (D22).
  - **Weergave Zwart gebruikt echt #000** voor OLED-schermen (D23); de gewone donkere modus volgt wel de richtlijn (donkergrijs, lichtere kaarten).
  - **Breekpunten** volgen de kern en eerdere keuzes (zijbalk vanaf 1000 px, brede schermen vanaf 1200 px; D35, D49), niet 600/840 px.

## Testen

- `npm install` en dan `npm run test:unit` (unit- en contracttests), `npm run test:e2e` (Playwright: de app start zonder fouten), `node tools/pin.mjs verify` en `node tools/precache.mjs`. Dezelfde stappen draaien op GitHub bij elke pull request (`.github/workflows/test.yml`).
- Lokaal bekijken: `python3 -m http.server 8080` en open `http://localhost:8080`.
- Groene tests zijn geen apparaattest: zie CLAUDE.md voor wat je daarnaast met de hand controleert.
