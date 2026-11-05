# Notities – stand van zaken

## Stand (5 november 2026) – versie 1.0.0
- Eerste versie gebouwd en live op GitHub Pages: Overzicht, Invoer, Historie, Instellingen.
- Getest met Geerts echte bestanden: HomeWizard-export 4-11-2025 t/m 4-11-2026 (data vanaf 20-11-2025,
  20:00; 348 volledige dagen) en Gasverbruik.xlsx (gas vanaf 11-10-2025, stroom vanaf 3-6-2026).
  Dagtotalen HomeWizard kloppen met de Excel (3-6-2026: 52,832 vs 52,834 kWh).
- Temperaturen ophalen kon in de testomgeving niet getest worden (Open-Meteo geblokkeerd in de sandbox);
  in de app zelf moet het werken. Controleren op de iPhone.

## Stand (5 november 2026) – versie 1.1.0
- Importcontrole gebouwd: importrapport, Historie → Maanden en Controle, ongedaan maken (laatste 10 imports).
- Getest met Gasverbruik.xlsx en een nagemaakte HomeWizard-export (de echte exports zaten niet in deze sessie).
  Met de Excel alleen geeft de controle 8 meldingen: 6 dagen begin juni–juli met 43–53 kWh stroom
  (veel meer dan de dagen eromheen; vermoedelijk echt, bijv. auto laden) en 2 dagen met veel gas per graaddag
  (20-10-2025 en 15-4-2026). Geert kan die afvinken als ze kloppen.
- Datamodel naar schema 2 (zie DECISIONS.md). Een apparaat met 1.0.0 kan na synchronisatie niets meer
  wijzigen tot het is bijgewerkt.

## Stand (5 november 2026) – versie 1.2.0
- Vattenfall-download (CSV) in te lezen naast HomeWizard; Vattenfall gaat voor (zie DECISIONS.md).
- Getest met `E-…-Kwartier.csv` en `G-…-Uur.csv` (5-5 t/m 4-11-2026): geen gaten, wintertijd 25-10 goed
  (25 uur), dagtotalen gelijk aan de Excel. De laatste dag (vandaag) is leeg en wordt overgeslagen.
- Een Vattenfall-download lijkt maximaal een half jaar te beslaan; oudere perioden in stukken downloaden.
- Het dagbestand van Vattenfall is alleen met een nagemaakt bestand getest.

## Stand (5 november 2026) – versie 1.3.0
- Gas per graaddag per dag in Historie (kolom m³/gd, detailregel, maandtotaal) en in de CSV-export.
- Gecontroleerd met de Excel: alle 268 dagen met gas en temperatuur geven dezelfde waarde als kolom O.
- De app neemt uit de Excel alleen temperaturen over, geen graaddagen of m³/graaddag; die rekent hij zelf.
- Niet visueel getest op iPhone-breedte (geen browser in de testomgeving): nakijken of de dagtabel met de
  extra kolom nog goed past.

## Stand (5 november 2026) – versie 1.3.1
- Grafiek Gas per graaddag in het Overzicht volgt de periodekeuze (dag/week/maand/jaar).

## Stand (5 november 2026) – versie 1.3.2
- Logo, naam en versie in de zijbalk (laptop) en in de kopbalk (iPhone/iPad). Visueel gecontroleerd met een
  testpagina op laptop- (licht/donker, in- en uitgeklapt) en iPhone-breedte.

## Stand (5 november 2026) – versie 1.3.3
- Bugfix: "null" boven de dagtabel in Historie. Oorzaak: het bewerkvak is leeg als er geen dag is aangetikt,
  en die lege waarde werd als tekst getoond. Nu filtert app.js lege onderdelen weg (alle schermen).
- Zes nieuwe wensen van Geert op WISHLIST.md gezet (totalen Dagen = Maanden, SolarEdge-import, Analyse-scherm,
  één Instellingen-plek, kleuren kiezen).

## Stand (5 november 2026) – versie 1.3.4
- Maandtotaal in Historie → Dagen als vette tabelregel. Visueel gecontroleerd met testgegevens op laptop- en
  iPhone-breedte (op de iPhone loopt "Oktober 2026" over twee regels; past verder).

## Stand (5 november 2026) – versie 1.4.0
- SolarEdge-export (opbrengst per maand) in te lezen. Getest met Geerts bestand
  `comparative-month-chart-data_11_05_2026_02_53_PM.csv` (jan 2020 t/m dec 2026) na de Excel-import:
  75 maanden ingelezen (aug 2020 t/m okt 2026), 7 maanden vóór de installatie en nov/dec 2026 overgeslagen.
  Jaartotalen 2021–2025: 4.138 / 4.728 / 4.168 / 3.848 / 3.487 kWh.
- Verschil met de Excel (blad Kosten): nov 2025 35 → 139 kWh, jul 2026 493 → 582 kWh (vermoedelijk halverwege
  de maand overgetikt). Vijf maanden kregen alleen de decimaal erbij (bijv. 87 → 87,2).
- Augustus 2025 is 0 kWh in SolarEdge en september 2025 laag (97 kWh): melding in het rapport. Geert vragen of de
  omvormer toen stuk/uit was.
- Ongedaan maken getest: de Excel-waarden komen precies terug. Visueel gecontroleerd in de echte app (kluis
  aangemaakt in een testbrowser) op laptop- en iPhone-breedte.
- `import-vattenfall.js` stond niet in de offline-cache van sw.js; toegevoegd.

## Stand (5 november 2026) – versie 1.4.1
- Uitleg SolarEdge-export noemt het SolarEdge Monitoring platform (naam bevestigd door Geert).
- Lage opbrengst aug/sep 2025 bevestigd: huis leeg, panelen uit. De melding over aug 2025 in het importrapport
  is dus terecht; verder niets aan doen. Let op: zelfvoorzienendheid en verbruik van die maanden zijn niet
  representatief bij vergelijkingen met vorig jaar.

## Openstaande punten
- [ ] Geert: Historie op de iPhone bekijken; past de dagtabel met de kolom m³/gd? (°C valt daar al weg.)
- [ ] Geert: Vattenfall-bestanden inlezen (kwartier/uur). Daarna HomeWizard alleen nog voor de laatste dagen.
- [ ] HomeWizard-export per dag (in plaats van kwartier) wordt nu als "gat" gelezen en vlak over de uren
      verdeeld. Nagaan of dat voorkomt; zo ja, als dagbestand behandelen zoals bij Vattenfall.
- [ ] Geert: na het inlezen Historie → Controle doorlopen, Maanden naast de Excel leggen en de jaarafrekening
      invullen bij "Vergelijken".
- [ ] Imports van vóór 1.1.0 hebben geen rapport en zijn niet ongedaan te maken (wel gecontroleerd).
- [ ] Geert: kluis aanmaken, sync koppelen (`gertjun/SyncData`, pad `energieverbruik/vault.json`),
      Face ID aan, HomeWizard-bestanden en Excel inlezen.
- [ ] Controleren of temperaturen automatisch verschijnen (Historie → tik op een dag).
- [ ] Tarieven nalopen: de app start met de tarieven van de tariefkaart, geldig vanaf 1-1-2025. De oudere
      tarieven uit Blad1 (linkerkolom) zijn niet ingevoerd; als die voor een eerdere periode gelden,
      een extra contract met de juiste data toevoegen.
- [ ] Geert: SolarEdge-export inlezen (Invoer → Maandgegevens); maandelijks herhalen na de 1e.
- [ ] Geert zoekt uit of het SolarEdge Monitoring platform per dag kan exporteren (zie WISHLIST). Daarna de
      precieze menunaam van de grafiek in de uitleg zetten.
- [ ] Saldering met tijdvakken is een aanname (zie DECISIONS.md); vergelijken met de volgende jaarafrekening.

## Bronbestanden in het Claude-project
- Vattenfall-downloads `E-<EAN>-Kwartier.csv` (stroom) en `G-<EAN>-Uur.csv` (gas): `Datum;Tijd;Meterstand levering;
  Verbruik;(Stand teruglevering;Teruglevering)`, Nederlandse getallen, nieuwste regel bovenaan, gas in Windows-1252.
- SolarEdge-export `comparative-month-chart-data_<datum>.csv`: `"Meettijd","Energy (kWh)"`, één regel per maand
  (`"jan. 2020","0"`), UTF-8 met BOM, komma als scheiding, punt als decimaalteken, alle jaren t/m december van
  het huidige jaar (toekomstige maanden 0).
- `Gasverbruik.xlsx`: blad DATA (per dag), blad Kosten (per maand: termijn €243, SolarEdge-opbrengst),
  blad Blad1 (jaarafrekening-schatting per tijdvak).
- `Energietarieven.png` en `Gastarieven.png`: Vattenfall-tarieven (6 tijdvakken).
- HomeWizard-exports `P1e-…csv` (stroom) en `P1g-…csv` (gas): kolommen `time, Import T1 kWh, Import T2 kWh,
  Export T1 kWh, Export T2 kWh, L1/L2/L3 max W` en `time, Total gas used`; meterstanden per kwartier,
  lokale tijd (bij wintertijd komt 02:00–02:45 twee keer voor).
