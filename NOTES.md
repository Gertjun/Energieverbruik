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

## Stand (5 november 2026) – versie 1.25.0
- Weergave Zwart (OLED) toegevoegd. Getest in Chrome op laptop- en iPhone-breedte met Geerts gegevens (Paars en
  Groenblauw): achtergrond en statusbalk rgb(0,0,0), geen fouten. Vier knoppen passen op iPhone-breedte.

## Stand (6 november 2026) – versie 1.26.0
- SolarEdge-export per dag in te lezen (zie DECISIONS.md). Getest met Geerts `energy-chart-data_11_06_2026_08_34_AM.csv`
  (oktober 2026, 31 dagen, 311,0 kWh) samen met de Vattenfall-stroomexport: oktober 16% zelfvoorzienend (124 kWh zelf
  gebruikt van 783 kWh verbruik). Opnieuw inlezen: alles gelijk; ongedaan maken zet alles terug.
- Getest in Chrome op laptop- en iPhone-breedte: import via de knop, Overzicht per dag/week/maand (grafiek en lijst),
  Historie (dagdetail), Analyse (zelfvoorzienendheid). Geen fouten.
- Exacte menunaam van de dagexport in het SolarEdge-portaal is niet bekend; de uitleg zegt "de energiegrafiek per dag".

## Stand (6 november 2026) – versie 1.27.0
- Pijltjes op het Overzicht om door de tijd te bladeren (zie DECISIONS.md). Getest in Chrome op laptop- en
  iPhone-breedte met Geerts Excel en Vattenfall-bestanden: maand/week/dag/jaar terug en vooruit, wisselen van
  periode na terugbladeren, "Naar nu". Geen fouten.

## Stand (9 november 2026) – versie 1.38.0
- SolarEdge automatisch: GitHub Action in SyncData (`.github/workflows/solaredge.yml`, `.github/scripts/solaredge.mjs`)
  schrijft `energieverbruik/solaredge-dag.csv`; de app leest dat in (`solaredge-auto.js`). Zie DECISIONS.md.
- Getest met nagemaakte SolarEdge-antwoorden (de echte API is vanuit de sandbox niet bereikbaar): eerste keer
  alles vanaf installatie (in stukken van een jaar), daarna laatste 14 dagen; `null`-waarden overgeslagen; zonder
  sleutel een duidelijke fout. App-kant met Node: het CSV-bestand van de Action leest goed in, eerste import
  zet alle dagen, zelfde bestand opnieuw = geen import, één gewijzigde dag = import van alleen die dag.
- Niet getest: de echte SolarEdge-API en de weergave op Invoer in de browser (de regel verschijnt alleen met
  sync ingesteld en het bestand aanwezig).

## Openstaande punten
- [ ] Geert heeft geen beheerdersaccount bij SolarEdge (nodig voor de API-sleutel). Installateur vragen om zijn
      account beheerder te maken of de sleutel aan te maken. Tot die tijd doet de Action niets (geen foutmail).
- [ ] Geert: SolarEdge-API-sleutel aanmaken, als geheim `SOLAREDGE_API_KEY` in SyncData zetten en de Action
      één keer met de hand starten (uitleg op Invoer). Daarna in de app kijken of de opbrengst binnenkomt en of
      het importrapport klopt met eerdere SolarEdge-exports.
- [ ] Als de Action faalt met 403: sleutel of site-ID controleren; eventueel `SOLAREDGE_SITE_ID` als geheim toevoegen.
- [ ] Geert: pijltjes op het Overzicht bekijken op iPhone/iPad; stap van één periode prettig, of liever een heel scherm tegelijk?
- [ ] Geert: na het bijwerken alle apparaten eenmaal openen (gegevensversie 5, opbrengst per dag).
- [ ] Geert: SolarEdge-export per dag inlezen voor de periode die hij wil (bijv. vanaf november 2025, gelijk met de
      HomeWizard-data); per maand of per jaar exporteren kan allebei. Precieze menunaam doorgeven voor de uitleg.
- [ ] Geert: kaart Zonnepanelen bij Dag en Week bekijken op iPhone/iPad.
- [ ] Geert: Zwart bekijken op de iPhone; kaarten genoeg te onderscheiden van de achtergrond?
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
- [ ] Saldering met tijdvakken is een aanname (zie DECISIONS.md); vergelijken met de volgende jaarafrekening.

## Bronbestanden in het Claude-project
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

## Stand (6 november 2026) – versie 1.27.1
- Kaart Termijnen op het Overzicht neemt het laatst bekende termijnbedrag over voor maanden zonder bedrag
  (gelijk aan de jaarprognose). Invoeren blijft via Invoer → Maandgegevens; bij een wijziging alleen de
  maand van ingang invullen.

## Stand (6 november 2026) – versie 1.28.0
- Heatmap in stoplichtkleuren (groen = gewenst, rood = ongewenst) en gas als keuze.
- Gas per uur (`uurGas`) wordt nu bewaard bij de Vattenfall- en HomeWizard-import. Getest met Geerts bestanden:
  348 HomeWizard-dagen en 184 Vattenfall-dagen, uursom = dagtotaal bij alle dagen; Vattenfall-dag zonder eigen
  uurverdeling krijgt die van HomeWizard (geschaald). Heatmaps visueel gecontroleerd met echte data (sep–nov 2026).
- [ ] Geert: Vattenfall-gasdownload (`G-…-Uur.csv`) en HomeWizard `P1g-…csv` één keer opnieuw inlezen, anders is de
      gas-heatmap leeg voor bestaande dagen.
- Let op: bij teruglevering zijn alle nachturen rood (0 = ongewenst volgens de regel "groen = gewenst"). Als dat
  storend is: nul-uren neutraal (grijs) maken; nog niet gedaan.


## Stand (6 november 2026) – versie 1.28.1
- Analyse → Gas weer-gecorrigeerd: negatieve verschillen (besparing) in de tabel groen, positieve rood (bestond al). De totaalregel kleurt mee.

## Stand (6 november 2026) – versie 1.28.2
- Groen/rood in de verschilkolommen van het Overzicht (lijsttabellen), de eigen Analyse-vergelijking en Einde saldering. Richting per maat staat als `beter: 'lager'|'hoger'` in MATEN (analyse.js) en MAAT (scherm-overzicht.js); hulpfunctie `verschilKleur`.
- Niet visueel getest in een browser; Geert vragen of de kleuren goed overkomen (ook de totaalregel in Analyse).

## Stand (6 november 2026) – versies 1.29.0 t/m 1.37.0: negen nieuwe analyses
- Opvallende dagen, Goedkopere uren, Terugleverschaal, Zon tegen weer, Thuisbatterij, Dynamisch contract, Warmtepomp,
  CO₂-uitstoot en Tegenover gemiddeld; tegels nu in groepen. Zie DECISIONS.md voor de aannames.
- Getest met een testpagina (buiten de repo) met Geerts Vattenfall-, HomeWizard- en Excel-bestanden en dezelfde
  Content-Security-Policy, in Chrome op laptop- (licht) en iPhone-breedte (donker): alle negen zonder fouten, visueel
  bekeken. Open-Meteo en EnergyZero zijn in de testomgeving geblokkeerd; daar zijn nagemaakte antwoorden gebruikt
  (en nagemaakte SolarEdge-maanden 2022–2025 voor Zon tegen weer).
- Uitkomsten met Geerts data (1-12-2025 t/m 4-11-2026, ter controle): 20% verschuiven ≈ € 105; teruglevering 2026
  verwacht ~2.860 kWh (onder schaal 14); batterij 5 kWh nu −€ 20, vanaf 2027 ~€ 370/jaar, terugverdientijd ~6,7 jaar
  bij € 2.500; hybride warmtepomp ~€ 490/jaar (temperaturen na juli ontbraken in de test); CO₂ netto ~2,0 ton;
  stroom ~7.100 kWh totaal tegenover 2.480 gemiddeld voor 2 personen (auto laden).
- [ ] Geert: Dynamisch contract openen op de iPhone. Haalt hij beursprijzen op? Zo niet: melding "Ophalen lukte niet"
      doorgeven (dan blokkeert EnergyZero de browser en is een andere bron nodig).
- [ ] Geert: Zon tegen weer openen; laadt de instraling, en kloppen de gemarkeerde maanden (aug/sep 2025 uitsluiten)?
- [ ] Geert: grenzen van zijn terugleverschaal nakijken (staat 14 = 3.500–4.000 kWh nog op het contract?).
- [ ] Geert: aantal personen en soort woning kiezen bij Tegenover gemiddeld (standaard 2 personen, twee-onder-een-kap).
- [ ] Geert: tegels in groepen bekijken op iPhone/iPad; overzichtelijk genoeg?

## Stand (9 november 2026) – versie 1.38.1
- Juli 2026 ontbrak in Gas per graaddag (Overzicht): minder dan 5 gewogen graaddagen in de maand, dus verborgen
  door het minimum uit 1.3.1. Nu getoond als lichte staaf, schaal op de gewone perioden, te hoge staven afgekapt (↑).
  Geldt voor alle periodekeuzes (dag/week/maand/jaar) en ook voor de staven van vorig jaar.
- Visueel gecontroleerd met testgegevens in headless Chrome (laptopbreedte). Niet met de echte data getest
  (Open-Meteo niet bereikbaar in de testomgeving): Geert controleert juli 2026 in de app.
- Analyse → Gas per graaddag gebruikt nog het oude minimum (waarde verborgen). Bewust zo gelaten; zelfde aanpak
  daar kan later als Geert dat wil.

## Stand (9 november 2026) – versie 1.38.2
- Opgeruimd: `docs/` (startprompt en Claude-instructies uit de template), `tools/setup.mjs` (eenmalige setup),
  ongebruikte functies (`findById`, `isSyncing`, `PERIODE_SLEUTEL`, `fmtTemp`, `leesBestand`, `KORT_TV`) en
  ongebruikte CSS (`.list`, `.list-item`, `.empty`, `dialog.sheet`, `.sheet-*`, `.icon-btn-small`, `.bewerk-rij`, `.maand-som`).
- `js/core/crypto.js` blijft: dat is de versleuteling van de kluis en sync, niet iets van de Crypto Tracker.
- Gecontroleerd: alle modules laden zonder fouten in headless Chrome, versie 1.38.2 zichtbaar.

## Stand (9 november 2026) – versie 1.38.3
- Laptop (vanaf 900 px breed): geen aparte kopbalk meer; wolkje en slotje rechts op de titelregel.
  Getest in een testbrowser op 1866, 1000 en 390 px breed (donker thema), inclusief vergrendelen.
- Gevolg: op de laptop scrollen wolkje en slotje mee omhoog; ze staan niet meer vast bovenin beeld.

## Stand (9 november 2026) – versie 1.38.4
- Indeling-keuze naar de regel met Dag/Week/Maand/Jaar; alle knoppen 128 px breed op een volledig laptopscherm.
  Getest op 1866 px (Eén kolom en Alles tegelijk) en 1240 px (wrapt netjes).
- Bij Eén kolom is de inhoud smaller (1040 px): dan staan Periode en Stroom/Terug/Gas/Kosten op regel 1 en de
  indeling rechts op regel 2. Het woord "Indeling" is weg (staat als tooltip).

## Stand (9 november 2026) – versie 1.39.0
- Alle schermen breed op de laptop (vanaf 1200 px), zie CHANGELOG en DECISIONS.md.
- Getest met een testpagina (buiten de repo) die de echte app draait met Geerts Vattenfall-, HomeWizard- en
  Excel-bestanden, in headless Chrome op 1860 px (donker), 1100 px en iPhone-breedte (390 px). Bekeken: Invoer (met
  importrapporten), Historie Dagen (met en zonder open dag) en Controle, Analyse (Samenstellen, Heatmap,
  Jaarprognose), Instellingen (Tarieven met open contract, Gegevens, App en sync), Overzicht (ongewijzigd).
  Geen fouten in de console.
- [ ] Geert: op de laptop door alle schermen lopen; staan de kaarten logisch naast elkaar?
- Bewust zo gelaten: Historie → Maanden en Dagen zonder open dag zijn één brede tabel (past, maar is luchtig).
  Grafieken in Analyse zijn op de laptop breed en relatief laag; hoger maken kan als Geert dat wil.

## Stand (9 november 2026) – versie 1.39.1
- Analyse-tegels op de laptop uitgelijnd (één gedeeld rijenraster). Visueel gecontroleerd met een testpagina op
  1580 px (zeven kolommen), 1250 px (vier kolommen, twee banden) en iPhone-breedte (ongewijzigd).
- Bij vier kolommen zijn de tegels in de tweede band wat lager dan in de eerste (die band volgt de inhoud);
  bewust zo gelaten.

## Stand (9 november 2026) – versie 1.40.0
- Analyse → Gasprognose gebouwd (zie CHANGELOG en DECISIONS.md). Nieuw bestand `js/energie/analyse-gasprognose.js`.
- Getest met een testpagina (buiten de repo) met Geerts HomeWizard- en Vattenfall-gasbestanden, in headless Chrome
  op laptop (licht), iPhone-breedte (donker) en de keuze 14 dagen. Open-Meteo is in de testomgeving geblokkeerd:
  temperaturen en voorspelling waren nagemaakt. Geen fouten in de console.
- In de test (gas bekend t/m 4-11) gaf de app: november ~114 m³ (99–149 m³). Getallen zeggen niets, temperaturen nep.
- [ ] Geert: Gasprognose openen op iPhone en laptop. Haalt hij de voorspelling op, en lijkt het totaal redelijk?
- [ ] Geert: eind november vergelijken: werkelijk verbruik tegenover de prognose van begin/half november.

## Stand (9 november 2026) – versie 1.41.0
- Kleur per soort in alle grafieken (zie DECISIONS.md). Visueel gecontroleerd met een testpagina (licht en donker):
  stroom, teruglevering, gas met temperatuurlijn, kosten, afname tegen teruglevering.
- Niet in de echte app met Geerts gegevens bekeken; nalopen of iedere analyse de juiste kleur heeft.
- Gevonden en opgelost: `--rijen` op de Analyse-tegels werd door de CSP geblokkeerd (gold sinds 1.39.1).


## Stand (9 november 2026) – versie 1.41.1
- Bugfix vergelijking met vorig jaar per dag in Analyse (zelfde datum i.p.v. 52 weken) en namen "Dit jaar"/"Vorig jaar"
  in de Overzicht-grafieken vervangen door "Deze periode"/"Een jaar eerder" (december 2025 stond als "dit jaar").
- Getest: syntaxcontrole en de nieuwe vergelijkingsperiode (1–9 nov 2026 → 1–9 nov 2025; week blijft 52 weken).
  Niet in de browser met Geerts echte gegevens bekeken.
- [ ] Geert: Analyse per dag met vorig jaar: staat bij 7 november nu het verbruik van 7 november 2025?
- [ ] Geert: als er nog een grafiek is waar december 2025 als "dit jaar" staat, laten weten welke (het screenshot
  kwam niet mee in deze sessie).

## Stand (9 november 2026) – versie 1.42.0
- Gemiddelde-lijnen (gestippeld, kleur van de reeks) in alle grafieken van het Overzicht, ook zonnepanelen.
- Getest met een testpagina (buiten de repo) met nagemaakte cijfers in headless Chrome: laptop licht en donker,
  iPhone-breedte; de legenda loopt op de iPhone netjes over twee regels. Niet met Geerts echte gegevens bekeken.
- Analyse-grafieken hebben nog geen gemiddelde-lijn (niet gevraagd); `gemiddelde` kan daar ook aan staafGrafiek mee.
- [ ] Geert: is de lichte lijn van "een jaar eerder" in donkere modus goed genoeg te zien?

## Stand (9 november 2026) – versie 1.42.1
- Gemiddelde-lijnen dunner op verzoek van Geert (lijn 2 → 1,25, rand 4 → 2,5, kortere streepjes). Bekeken in headless
  Chrome (donker): nog goed te zien.


## Stand (9 november 2026) – versie 1.42.2
- iPad: bovenmarge voor zijbalk en inhoud (zie DECISIONS.md). Op de iPad stond de titel "Overzicht" in de vervaging.
- Knoppen Overzicht in een raster van even brede kolommen. Bekeken met een testpagina (buiten de repo) in headless Chrome
  op 1376 px met een nagebootste veilige zone van 24 px (iPad), 1300 px en 1866 px (Naast elkaar en Eén kolom):
  alles lijnt uit, laptop bovenin ongewijzigd. Niet op een echte iPad getest.
- [ ] Geert: op de iPad kijken of logo en titel nu vrij van de vervaging staan, en of 24 px extra genoeg (of te veel) is.

## Stand (9 november 2026) – versie 1.42.3
- Geert zag in 1.42.2 de zijbalk niet zakken: die had al 12 px onder de veilige zone, dus ging maar 12 px omlaag.
  Extra marge nu 40 px (zijbalk ~28 px lager dan in 1.42.1). Zijbalk en titel blijven op dezelfde hoogte.
- [ ] Geert: op de iPad kijken (v1.42.3 onder het logo); is de ruimte nu goed?

## Stand (9 november 2026) – versie 1.42.4
- Veiligheidsmarge bovenin voor de iPad volgens Games Backlog (zie DECISIONS.md). Oorzaak van 1.42.2/1.42.3 zonder
  effect: iPadOS geeft een veilige zone van 0 door.
- Getest op een kopie zonder "(display-mode: standalone) and " (Chromium kan dat niet nabootsen), met getComputedStyle:
  iPad 1180×820 (touch): zijbalk 36 px, inhoud 40 px (beide +24); iPad 820×1180 (touch): kopbalk 32 px (+24);
  iPhone 390×844 en 932×430 en laptop 1280×800 (zonder touch): ongewijzigd (8 / 12 / 16 px). Logo en inhoud sluiten
  aan (logo op 42 px, inhoud op 40 px).
- [ ] Geert: op de iPad (liggend en staand) kijken of kopbalk/zijbalk nu vrij van de vervaging staan.

## Stand (9 november 2026) – versie 1.42.5
- Nieuw app-icoon (bliksem + vlam). Op de iPhone/iPad blijft het oude icoon op het beginscherm staan tot Geert de
  app daar verwijdert en opnieuw toevoegt via Safari → Deel → Zet op beginscherm.

## Stand (10 november 2026) – versie 1.42.6
- Bugfix Overzicht per maand: kalenderjaar (jan–dec) i.p.v. de laatste 12 maanden; december 2025 staat nu bij
  "Een jaar eerder" naast een (nog lege) december 2026. Termijnbedragen blijven over de laatste 12 maanden.
- Getest: syntaxcontrole en de periodelijst nagerekend (jan 2026 ← jan 2025 … dec 2026 ← dec 2025). Niet in de
  browser met Geerts echte gegevens bekeken.
- [ ] Geert: Overzicht → Maand bekijken op iPhone en laptop. Bevalt het dat december (en nu ook november-vooruit) leeg
  is tot die maand er is? Bij terugbladeren naar een maand in 2025 toont de grafiek heel 2025.

## Stand (10 november 2026) – versie 1.42.7
- Overzicht toont altijd alle vier grafieken (stroom, terug, gas, kosten); keuzeknoppen weg. Indeling "Alles tegelijk"
  vervallen; een opgeslagen keuze daarvoor wordt "Naast elkaar". Gecontroleerd met testgegevens op iPhone- (390 px)
  en laptopbreedte (1500 px): geen fouten, vier kaarten onder elkaar resp. in twee kolommen.

## Stand (10 november 2026) – versie 1.43.0
- Jaarprognose: kostenkolommen opgebouwd uit gas en stroom (zie DECISIONS.md).
- Getest met een testpagina (buiten de repo) met Geerts HomeWizard-exports (P1e/P1g 2025-11-4 t/m 2026-11-4) in headless
  Chrome op 1300 px (licht en donker) en 390 px: gas € 1.822 (55%) + stroom € 1.483 (45%) = € 3.304,81, gelijk aan het
  jaartotaal. Juli 2026: gas € 45 / stroom € 101. Tabel ongewijzigd. Niet met de echte app-gegevens (incl. Excel) bekeken.
- [ ] Geert: Analyse → Jaarprognose bekijken op iPhone en laptop. Ook de bedragen stroom/gas in de tabel zien? (nu alleen in
  de grafiek en de legenda)


## Stand (10 november 2026) – versie 1.43.1
- Analyse op telefoonbreedte (< 700 px): na het tikken op een tegel klapt de keuzekaart in tot één regel en scrollt het
  scherm naar de analyse. Getest in een testbrowser op 390 px (met Geerts HomeWizard-export): inklappen, springen en
  weer openen werken; op 1300 px klapt niets in. Nog nakijken op de echte iPhone.

## Stand (10 november 2026) – versie 1.43.2
- Probleem van Geert: na verwijderen en opnieuw installeren van de web-app (bijv. voor een nieuw icoon) moest hij steeds
  een nieuwe passkey maken. Oorzaak: iOS wist bij verwijderen alle opslag van de web-app, ook het gegeven welke passkey
  bij de app hoort. De passkey zelf blijft in iCloud-sleutelhanger staan.
- Oplossing: passkey-id's staan nu in het kluisbestand (veld `passkeys`, zie DECISIONS.md) en worden hergebruikt.
  Een passkey van vóór 1.43.2 wordt na de eerste ontgrendeling vastgelegd en daarna gesynchroniseerd.
- Kluiscode getest in node (toevoegen, samenvoegen bij sync, herladen). Het hergebruik zelf (Face ID-venster) kon niet
  in de testomgeving; nog testen op de iPhone. Opnieuw koppelen (GitHub-token + wachtwoord) blijft na opnieuw
  installeren nodig: dat wist iOS ook.
- [ ] Geert: na deze update één keer de app openen en ontgrendelen op het apparaat met de passkey, zodat die wordt vastgelegd.
- [ ] Dezelfde wijziging (js/core/biometric.js, vault.js, shell.js) ook in de PWA-template en de andere apps zetten
  (staat op WISHLIST.md).
