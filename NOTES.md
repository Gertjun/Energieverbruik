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

## Stand (5 november 2026) – versie 1.5.0
- Eén importknop op Invoer voor Vattenfall, HomeWizard, SolarEdge en Excel (herkenning op inhoud; Excel aan
  zip-kop/.xlsx). SolarEdge-deel onder Maandgegevens en Excel-kaart in Instellingen verwijderd.
- Getest in de app met alle zes echte bestanden tegelijk (laptop en iPhone): alles herkend, verwerkt in de volgorde
  Vattenfall → HomeWizard → Excel → SolarEdge. Voorrang gecontroleerd: 5-5 t/m 3-11-2026 blijft Vattenfall,
  ook als HomeWizard ná Vattenfall wordt ingelezen.

## Stand (5 november 2026) – versie 1.6.0
- Scherm Analyse gebouwd (keuzes van Geert: verbruik, kosten, weer, tijdvakken/uur; vergelijken met vorig jaar,
  andere periode en tweede grootheid; favorieten met sync; CSV-export).
- Instellingen samengevoegd: tandwiel-venster weg, secties van de schil staan in `#settings-panel` (index.html) en
  worden door het scherm Instellingen getoond per onderdeel (Tarieven / Gegevens / App en sync).
- Getest in Chrome met Geerts echte bestanden (Excel, HomeWizard, Vattenfall): maandtotalen in Analyse gelijk aan
  Historie → Maanden; tijdvakken tellen op tot het totaal; favoriet bewaren/openen; sync-knop zonder koppeling
  opent App en sync. Laptop- en iPhone-breedte bekeken (tabbalk met 5 knoppen past).
- Temperatuur ná de Excel kon in de testomgeving niet opgehaald worden (Open-Meteo geblokkeerd); in de app wel.

## Stand (5 november 2026) – versie 1.7.0
- Knop Grafiek/Lijst per kaart in het Overzicht; Zonnepanelen standaard als grafiek (staven + lijn).
- Getest met een testpagina met nagemaakte gegevens (zon-opbrengst gelijk aan Geerts schermafbeelding) op laptop
  (donker) en iPhone-breedte (licht); keuze blijft na herladen staan.
- Kerncijfers en Termijnen hebben geen knop: dat zijn losse getallen, geen reeks.

## Stand (5 november 2026) – versie 1.8.0
- Zonnepanelen-grafiek op verzoek van Geert: zelf gebruikt binnen de opbrengst-kolom, percentage erboven, jaren naast
  elkaar (jan–dec). Getest met nagemaakte gegevens (opbrengst 2024–2026, stroom vanaf 20-11-2025) op laptop (donker)
  en iPhone (licht). Op de iPhone passen de percentages bij 1–2 jaren (staand bij 2); bij 3+ jaren alleen via aantikken.

## Stand (5 november 2026) – versie 1.9.0
- Indeling Overzicht op de laptop instelbaar (Eén kolom / Naast elkaar / Grafiek en lijst / Alles tegelijk), in
  Instellingen → App en sync (sinds 1.9.1 op het Overzicht). Getest met een testpagina met Geerts Excel en HomeWizard-bestanden op 1860 px (donker),
  1280 px (licht) en iPhone-breedte: grafieken krijgen de breedte van hun kolom, iPhone ongewijzigd.
- Grafieken passen hun breedte niet aan als het venster versleept wordt zonder de grens van 1200 px te passeren
  (was al zo); opnieuw openen van het scherm helpt.

## Stand (5 november 2026) – versie 1.9.1
- Indelingskeuze verplaatst van Instellingen naar het Overzicht, rechts naast de titel (op verzoek van Geert). Alleen
  zichtbaar vanaf 1200 px. Bekeken op 1860 px (donker), 1280 px (licht) en iPhone-breedte.

## Stand (5 november 2026) – versie 1.9.2
- Uitlijning in twee kolommen verbeterd (Geert: blokken niet even groot/uitgelijnd). Gemeten in de testpagina
  (1860 px): grafieken in dezelfde rij starten op dezelfde pixel; ook bekeken op 1280 px (licht).

## Stand (5 november 2026) – versie 1.9.3
- Dagkosten vergeleken met Vattenfall-schermafbeeldingen van 25, 28 en 31 oktober 2026 (Vattenfall-kwartierdata).
  Gas en vaste kosten stroom/gas kloppen exact; stroom 31-10 exact (€ 11,33).
- Vaste terugleverkosten per dag nu per maand ÷ dagen in de maand (zoals Vattenfall); 31-10 komt nu op € 19,72
  (Vattenfall € 19,71: zij tellen afgeronde deelbedragen op).
- 25-10 (wintertijd, 25 uur): stroom app € 1,94, Vattenfall € 1,96. Vattenfall deelt na het extra uur elk kwartier
  vermoedelijk een uur te laat in (op kwartiervolgorde i.p.v. klok) en telt het dubbele uur 02:00 anders
  (6,929 i.p.v. 6,924 kWh); zo kom je precies op € 1,96. App niet aangepast: die rekent hier juist.
- 28-10: stroom app € 11,48, Vattenfall € 11,02 – nog niet verklaard. Doordeweeks, met overschot teruglevering in
  dal dag (12–16 u). Zelfs alles verrekend tegen het duurste tarief geeft € 11,29, dus Vattenfall rekent een deel
  van de afname tegen een lager tarief. Nachttarief 22–07 past op deze dag maar niet op de weekenddagen.

## Stand (5 november 2026) – versie 1.9.4
- Duidelijkere jaarkleuren (Geert: kleuren van de jaren beter uit elkaar). Vorig jaar oranje i.p.v. lichtgrijs; zon-jaren
  groenblauw / oranje / indigo / magenta. Bekeken met een testpagina op laptop- (licht) en iPhone-breedte (donker).

## Stand (5 november 2026) – versies 1.10.0 t/m 1.22.1: uitbreiding Analyse
- Dertien uitbreidingen, elk een eigen versie: sluipverbruik (1.10), piekvermogen (1.11), per dag van de week (1.12),
  keuze "Soort analyse" + heatmap (1.13), wat als de saldering stopt (1.14), eigen verbruik in de zonuren (1.15),
  stooklijn (1.16), gas weer-gecorrigeerd (1.17), opgeteld verloop (1.18), jaarprognose (1.19), top-10 (1.20),
  gemiddeld per dag (1.21), uitgesloten perioden (1.22, schema 4). 1.22.1: heatmap/top-10 onder de CSP.
- Getest met een testpagina (buiten de repo) die Geerts echte Vattenfall-, HomeWizard- en Excel-bestanden inleest, met
  dezelfde Content-Security-Policy als de app. Alle 312 combinaties van grootheid × indeling × vergelijking en alle
  soorten × periodeknoppen doorgelopen op laptop- en iPhone-breedte zonder fouten; elke soort visueel bekeken.
- Temperaturen ná 5-7-2026 waren in de test nagemaakt (Open-Meteo geblokkeerd). Stooklijn, weer-gecorrigeerd en de
  gasprognose zijn dus voor juli–november met nepweer getest; met echte temperaturen in de app opnieuw bekijken.
- Uitkomsten met Geerts data (ter controle): sluipverbruik ~110 W winter / ~170 W zomer; hoogste piek L2 6.463 W
  (8-1-2026 19:15); einde saldering +€ 203 over 1-12-2025 t/m 4-11-2026; 1.957 kWh te verschuiven (€ 526 na 2027);
  stooklijn vast 0,46 m³/dag, stookgrens 12,5 °C, 0,64 m³ per graad; prognose 2026 € 3.200, ~€ 284 bijbetalen.
- Opvallend in de data: ’s nachts wisselt de afname per uur tussen ~0,16 en ~1,5 kWh (iets dat aan- en afslaat,
  bijv. boiler of warmtepomp). Niet onderzocht; Geert kan het in de heatmap per dag bekijken.

## Stand (5 november 2026) – versie 1.23.0
- Soort analyse staat als tegels in een eigen kaart bovenaan Analyse. Bekeken op laptop (licht) en iPhone-breedte
  (donker); alle combinaties opnieuw zonder fouten doorgelopen.

## Stand (5 november 2026) – versie 1.24.0
- Kleurthema's (6) en licht/donker/automatisch in Instellingen → App en sync → Weergave, per apparaat.
- Getest in Chrome op laptop- en iPhone-breedte: wisselen, keuze blijft na herladen, statusbalkkleur volgt; Overzicht
  en Analyse met Geerts Excel en Vattenfall-bestanden in Framboos (licht) en Blauw (donker). Geen fouten.
- Niet getest op een echte iPhone: of de statusbalk bovenin meekleurt in de geïnstalleerde app.

## Openstaande punten
- [ ] Geert: thema's bekijken op iPhone/iPad/laptop; kleuren naar wens? Kleurt de statusbalk mee?
- [ ] Geert: tegels voor Soort analyse bekijken op iPhone/iPad; prominent genoeg, niet te veel ruimte?
- [ ] Geert: HomeWizard-export (stroom) opnieuw inlezen, zodat ook eerdere dagen piekvermogen krijgen (1.11.0).
- [ ] Geert: na het bijwerken alle apparaten eenmaal openen (gegevensversie 4, uitgesloten perioden).
- [ ] Geert: aug–sep 2025 (huis leeg) toevoegen bij Analyse → Uitgesloten perioden.
- [ ] Geert: nieuwe analyses bekijken op iPhone, iPad en laptop; vooral heatmap (leesbaar?) en jaarprognose
      (klopt de verwachte eindafrekening met wat hij verwacht?).
- [ ] Stooklijn en gas weer-gecorrigeerd nakijken met echte temperaturen (in de test nagemaakt na 5-7-2026).
- [ ] Aansluiting 3×25 A staat vast in analyse.js (`AANSLUITING`); instelbaar maken als het ooit verandert.
- [ ] Geert: nieuwe jaarkleuren bekijken op iPhone en laptop; bevallen ze?
- [ ] Geert stuurt Vattenfall-dagkosten van een paar doordeweekse dagen (zonnig en somber, bijv. 26, 27, 29, 30 okt,
      2 en 3 nov) om het verschil op 28-10 (€ 0,46 stroom) te verklaren.
- [ ] Geert: de vier indelingen op de laptop bekijken en er één kiezen; de andere eventueel later weer weghalen.
- [ ] Geert: Overzicht op iPhone/iPad bekijken; past de lijst (4 kolommen) en is de zon-grafiek leesbaar?
- [ ] Geert: Analyse en Instellingen bekijken op iPhone en iPad. Na het bijwerken eenmaal alle apparaten openen
      (gegevensversie 3).
- [ ] Template-afwijking: shell.js en index.html (instellingen als paneel i.p.v. venster); base.css en app.css (kleuren met light-dark(), thema's, 1.24.0). Bij een update vanuit
      de PWA-template deze wijziging meenemen; eventueel ook in de template zelf doorvoeren.
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
- [ ] Geert: SolarEdge-export inlezen (Invoer → Bestanden inlezen); maandelijks herhalen na de 1e.
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
