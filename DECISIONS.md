# Beslissingen

## 2026-11-09 – Template-restanten opgeruimd (versie 1.38.2)
- **Setup-bestanden weg**: `docs/STARTPROMPT.md`, `docs/CLAUDE-INSTRUCTIES.md` en `tools/setup.mjs` dienden alleen om
  een nieuwe app uit de template te maken. De werkinstructies staan in de projectinstructies; de template-repo houdt
  de originelen.
- **`js/core/` blijft een kopie van de template**, op twee ongebruikte functies na (`findById`, `isSyncing`). Bij
  het overnemen van template-updates die twee niet terugzetten, tenzij er iets is dat ze gebruikt.
- **Settings als venster (`dialog.sheet`) uit de CSS**: de instellingen zijn sinds 1.6.0 een paneel.

## 2026-11-09 – SolarEdge automatisch (versie 1.38.0)
- **Ophalen door een GitHub Action in SyncData, niet door de app zelf.** Eis van Geert: de API-sleutel mag niet in
  de publieke repo of code. In de app (kluis) zou hij wel privé zijn, maar SolarEdge staat browserverkeer vanaf een
  andere site waarschijnlijk niet toe (CORS; niet te testen in de sandbox). De Action draait bij GitHub, heeft daar
  geen last van en de sleutel staat als geheim `SOLAREDGE_API_KEY` (site-ID optioneel via `SOLAREDGE_SITE_ID`;
  anders de eerste site van de sleutel). Elke nacht 04:17 UTC, en met de hand te starten.
- **Onversleuteld CSV-bestand in de private repo** (`energieverbruik/solaredge-dag.csv`), in de opmaak van een
  SolarEdge-dagexport. De Action kent het kluiswachtwoord niet, dus versleutelen kan niet; zonne-opbrengst is weinig
  gevoelig en de repo is privé. Zelfde opmaak = dezelfde inleesroutine (`leesSolarEdge`), en het bestand is ook
  met de hand in te lezen.
- **Per dag, niet per kwartier**: past op wat de app nu bewaart (collectie `zon`). Kwartier blijft op de wishlist.
- **Eerste keer alles vanaf de installatiedatum, daarna de laatste 14 dagen opnieuw** (SolarEdge vult soms later
  aan). Per vraag maximaal een jaar (grens van de API). Alleen een commit als er iets veranderd is.
- **App leest het bestand met het sync-token** (zelfde repo, zelfde rechten), via nieuwe `ctx.leesSyncBestand`
  in shell.js (template-afwijking). Daarvoor eerst een sync, zodat een ander apparaat dat al heeft ingelezen niet
  tot dubbele imports leidt. Hooguit eens per uur per sessie; sha van het verwerkte bestand per apparaat in
  localStorage (`energieverbruik:solaredge-sha`), dus bij geen verandering ook geen werk.
- **Alleen nieuwe of gewijzigde dagen als import** (`zetSolarEdge`, bestandsnaam "SolarEdge (automatisch)"), met
  rapport en ongedaan maken zoals een gewone import. Geen verandering = geen importregel. Meldingen over reeksen
  nullen alleen over die dagen (`nulReeksen` uit import-solaredge.js); "overgeslagen vóór installatie" alleen
  bij de eerste keer.
- **MINOR (1.38.0)**: geen schemawijziging; alleen een nieuwe bestandsnaam bij een bestaande importsoort.

## 2026-11-06 – Negen nieuwe analyses (versies 1.29.0 t/m 1.37.0)
Geert vroeg om alle voorgestelde extra analyses. Zeven van de zestien voorstellen bestonden al (sluipverbruik, einde
saldering, heatmap, stooklijn/weer-gecorrigeerd, eigen verbruik, piekvermogen, controle op afwijkende dagen); de negen
nieuwe zijn elk een eigen soort met een eigen MINOR-versie. Rekenwerk in `analyse-watals.js` (geen DOM, met Node te
testen), schermdeel in `analyse-watals-soorten.js`. Keuzes per soort staan in `WATALS_STANDAARD` en gaan mee in
favorieten (getallen als tekst met komma, zoals in een invoerveld).
- **Tegels in groepen** (`GROEPEN` in analyse-soorten.js, `groep` per soort): met 18 soorten werd één raster te lang.
- **Opgehaalde gegevens alleen op het apparaat** (`extern.js`, localStorage `energieverbruik:straling` en
  `energieverbruik:beursprijzen`): openbare gegevens die altijd opnieuw op te halen zijn, dus niet in de kluis en
  niet gesynchroniseerd (scheelt honderden kB per sync). Pas ophalen bij het openen van de analyse; per sessie één
  keer per maand/dag om een ophaal-lus te voorkomen. Resultaat wordt getekend zodra de gegevens binnen zijn
  (`.analyse-laad` met `display: contents`).
- **EnergyZero voor beursprijzen** (gratis, geen sleutel; ENTSO-E vraagt een sleutel). `connect-src` uitgebreid met
  `https://api.energyzero.nl`. Kwartierprijzen en het dubbele uur bij wintertijd worden gemiddeld tot één uurprijs,
  omdat de app per uur rekent. Niet getest tegen de echte dienst (geblokkeerd in de testomgeving): of EnergyZero
  vanuit de browser (CORS) werkt, moet op de iPhone blijken.
- **Opvallende dagen**: verwacht = mediaan van dezelfde weekdag in de 8 weken ervoor; drempel = max(minimum,
  k × spreiding (MAD), percentage). Standaard "zonder grote verbruikers": uren met > 2 kWh afname tellen niet mee,
  anders bestond de lijst vrijwel alleen uit laaddagen van de auto (77 van 321 dagen bij Geert).
- **Goedkopere uren**: verschuiven binnen dezelfde dag naar het goedkoopste tijdvak; met en zonder saldering gelijk.
- **Terugleverschaal**: grenzen als invoer (standaard 3.500–4.000, schaal 14) omdat de volledige tabel niet bekend is;
  verwacht jaartotaal uit `jaarPrognose`. Bij Geerts data: verwacht ~2.860 kWh in 2026, dus onder schaal 14.
- **Zon tegen weer**: instraling = shortwave_radiation_sum (horizontaal, MJ/m²). De verhouding opbrengst/instraling
  verschilt per seizoen (hellende panelen), dus alleen vergelijken met dezelfde kalendermaand in andere jaren
  (mediaan, minstens 2 jaren); onder 85% = gemarkeerd. Excel-november 2025 (35 kWh) komt er in de test meteen uit.
- **Thuisbatterij**: per uur, laadt alleen met teruglevering, ontlaadt bij afname, vermogen min(5 kW, helft van de
  capaciteit), 90% rendement heen en terug, leeg na een gat. Kosten via `kostenDag` met de uurwaarden, zonder vaste
  kosten, met saldering en met het contract na saldering. Bij Geert (5 kWh): nu −€ 20, vanaf 2027 ~€ 370 per jaar.
- **Dynamisch contract**: afname (beurs + inkoop) × 1,21 + energiebelasting; teruglevering beurs − opslag, zonder btw.
  Vergeleken met het eigen contract na saldering; vaste kosten tellen niet mee (bij beide ongeveer gelijk).
- **Warmtepomp**: vaste deel van de stooklijn = warm water/koken; 8,8 kWh warmte per m³; COP = 3,3 + 0,08 × T
  (−0,6 bij gewone radiatoren, tussen 1,8 en 5); hybride tot vermogen × 20 uur per dag; volledig: ook warm water
  (COP 2,5) en de vaste gaskosten vervallen. Stroom tegen het daggemiddelde van het tarief, zonder saldering.
- **CO₂**: 0,20 kg/kWh (CBS 2024, integrale methode) en 1,78 kg/m³ aardgas, beide aan te passen; teruglevering telt als
  vermeden.
- **Gemiddeld huishouden**: CBS 2025 (voorlopig) per aantal personen en per woningtype, woningen met gasaansluiting;
  vast in de code (`CBS_PERSONEN`, `CBS_WONING`). Bij Geert zowel afname van het net als totaal verbruik (met eigen
  zonnestroom), omdat het CBS naar levering via het net kijkt.

## 2026-11-06 – Heatmap stoplichtkleuren en gas (versie 1.28.0)
- **Stoplichtkleuren** (keuze Geert): vaste schaal groen → lichtgroen → geel → oranje → rood (ColorBrewer RdYlGn),
  in grafiek.js berekend, los van het kleurthema. Richting per grootheid: afname en gas laag = groen; teruglevering
  hoog = groen; netto loopt symmetrisch van teruglevering (groen) via 0 (geel) naar afname (rood). De legenda loopt
  altijd van groen (links) naar rood (rechts).
- **Schaal tot het 95e percentiel** in plaats van het maximum: één uur auto laden zou anders alles groen maken.
  Lineair in plaats van de wortelschaal van eerst; met het percentiel is die niet meer nodig.
- **`uurGas` op de dag** (24 waarden, m³), in groep `g`. Zelfde aanpak als `uurAfname`: hogere bron met alleen een
  dagtotaal krijgt de uurverdeling van de lagere bron geschaald; handmatig gas wijzigen wist `uurGas`. Excel zet
  geen `uurGas` (zetGroep wist het bij overschrijven). Geen schemawijziging: oudere versies laten het veld staan
  (zoals `piek`), dus MINOR.

## 2026-11-06 – Zonne-opbrengst per dag (versie 1.26.0)
- **Dagwaarden in een eigen collectie `zon`** (`{ id: 'z:yyyy-mm-dd', datum, zon, imp }`), niet als veld op `dagen`.
  Een dag in `dagen` is een meetdag: hij krijgt vaste kosten, telt mee voor "ontbrekende dagen" en de eerste dag
  bepaalt het begin van alle overzichten. Een dag met alleen zon (bijv. een SolarEdge-export vanaf 2020) zou dat
  allemaal verstoren. **Schema 5**, MINOR (zoals 1.6.0 en 1.22.0): niets opnieuw koppelen, wel eerst andere
  apparaten bijwerken voordat je daar iets wijzigt.
- **Dag gaat voor maand** (keuze Geert): per maand rekent de app met de dagen als élke dag van die maand bekend is;
  anders met de maandwaarde (SolarEdge-maandexport, Excel, handmatig); zonder maandwaarde met de dagen die er zijn
  (gemarkeerd "niet elke dag"). De maandwaarde wordt niet overschreven, zodat ongedaan maken eenvoudig blijft en een
  latere maandexport gewoon werkt. Alles zit in `zonPeriode()` in model.js; Overzicht, Analyse en Historie gebruiken die.
- **Zelf gebruikt per dag**: max(0, opbrengst − teruglevering) per dag, dan opgeteld. Iets preciezer dan per maand
  (een dag met meer teruglevering dan opbrengst kan niet negatief tellen). Bij Geert in oktober 2026: 124,4 kWh per dag
  tegen 124,4 per maand, dus in de praktijk gelijk. Alleen dagen waarvan ook de stroom bekend is tellen voor zelf
  gebruikt en het percentage.
- **Per dag/week in Analyse alleen uit dagwaarden**: een maandtotaal is niet eerlijk over dagen te verdelen.
  Per maand/jaar telt een maandwaarde voor de hele maand mee, ook als de maand maar deels in de periode valt (zoals
  voorheen). Zelfvoorzienendheid in Analyse is alleen per dag/week/maand/jaar (een gemiddelde per weekdag van
  percentages zou misleidend zijn).
- **Herkennen**: kop met Meettijd/Time en een kolom Energy, Energie, Productie of Production. Dag- of maandbestand
  aan de eerste tijdcel ("1 okt. 2026 00:00" tegenover "okt. 2026"). Datums ook Engels ("Oct 1, 2026"), ISO en
  dd-mm-jjjj. Kleinere stappen (uur/kwartier) worden per dag opgeteld; de kolom Verbruik wordt genegeerd (0 zonder
  verbruiksmeter bij de omvormer).
- **Overslaan**: vandaag en later (onvolledig). Nullen aan het begin alleen bij minstens 7 dagen (vóór de
  installatie); één sombere dag kan echt 0 zijn. Melding bij 3 of meer dagen 0 achter elkaar.
- **Overzicht**: bij Dag/Week een kaart "Zonnepanelen · per dag/week" (zelfde kolomgrafiek met één reeks) zodra er
  in die dagen/weken dagwaarden zijn; anders de vergelijking per kalendermaand.

## 2026-11-05 – Weergave Zwart voor OLED (versie 1.25.0)
- **Vierde keuze naast Automatisch/Licht/Donker**, geen apart thema: zo werkt Zwart met elk kleurthema.
  `data-modus="zwart"` zet color-scheme op dark (alle donkere kleuren) en overschrijft daarna alleen de vlakken.
- Achtergrond echt **#000** zonder tint van de accentkleur (een tint zou de pixels weer aanzetten). Kaarten #0b0b0d,
  vlakken #17181b met 4% accent, randen #24262b: net genoeg verschil om kaarten en knoppen te zien.
- Automatisch kiest nooit Zwart: het systeem kent alleen licht en donker.

## 2026-11-05 – Kleurthema's en licht/donker (versie 1.24.0)
- **Zes thema's** (Groenblauw = standaard, Blauw, Groen, Paars, Framboos, Grafiet). Een thema zet de accentkleur en
  geeft achtergrond, randen en vlakken 4–6% van die kleur. Geen oranje of rood thema: oranje is de kleur van
  "vorig jaar" en van lijnen (--warn), rood van fouten (--danger). Waar een jaarkleur op de accentkleur lijkt,
  krijgt dat thema een andere jaarkleur (groenblauw bij Blauw/Paars voor jaar 2, bij Framboos voor jaar 3).
- **Licht/donker via `light-dark()`** in de CSS-variabelen in plaats van `@media (prefers-color-scheme: dark)`.
  Zo werkt "vast licht/donker" door alleen `color-scheme` om te zetten (data-modus op `<html>`), zonder alle donkere
  kleuren dubbel te hoeven schrijven. Vereist Safari 17.5+ / Chrome 123+ (iPhone met iOS 17.5 of nieuwer).
  Template-afwijking: base.css (de basiskleuren) is hierop aangepast.
- **Per apparaat** (localStorage `energieverbruik:weergave`), niet in de kluis: op de iPhone wil je misschien donker
  en op de laptop licht. Zelfde aanpak als de ingeklapte zijbalk en de indeling van het Overzicht.
- **js/thema.js is een gewoon script in `<head>`** (geen module), zodat het thema er staat vóór de pagina getekend
  wordt (geen flits van de standaardkleur). Inline scripts mogen niet door de Content-Security-Policy.
- Thema-regels gebruiken `[data-thema=…]` zonder `:root`, zodat de voorbeeldtegels in Instellingen met hetzelfde
  attribuut hun eigen kleuren tonen.
- Statusbalkkleur (`meta theme-color`) wordt gelijk gezet aan de achtergrond, omgezet naar rgb via een canvas
  van 1 pixel (de browser geeft de berekende kleur als oklab(), wat niet elke browser in die meta-tag begrijpt).

## 2026-11-05 – Soort analyse als tegels (versie 1.23.0)
- **Eigen kaart bovenaan ("Wat wil je analyseren?") met tegels** in plaats van een keuzelijst in het blok Samenstellen
  (verzoek Geert: het is de eerste keuze). Elke tegel heeft een korte naam en een regel uitleg, zodat je ziet wat er
  is zonder de lijst open te klappen. 2 kolommen op de iPhone, 3 op de iPad, 5 op de laptop.
- **Altijd zichtbaar**, ook na het kiezen (geen inklappen): wisselen blijft één tik. Kost op de iPhone ~5 rijen hoogte.
- Het blok met de overige keuzes heet "Samenstellen" bij Zelf samenstellen en "Keuzes" bij de andere soorten, zodat
  de titel niet dubbel staat met die van het resultaat.

## 2026-11-05 – Uitbreiding Analyse (versies 1.10.0 t/m 1.22.1)
Geert vroeg om 13 uitbreidingen, elk met een eigen versie.

### 1.10.0 Sluipverbruik
- Laagste uur tussen 00:00 en 05:00 (kWh × 1000 = W): dan geen zon, dus de netto meterwaarde is echt verbruik. Uurdata is de fijnste resolutie die bewaard wordt.
- Per week/maand/jaar de mediaan van de dagen, niet het gemiddelde: in Geerts data trekken nachten met de auto aan de lader (bijv. 8-5-2026: 1.857 W) het gemiddelde omhoog (mei 252 W gemiddeld vs 172 W mediaan).
- Omrekening naar euro's tegen het "vlakke" stroomtarief: gemiddelde van alle uren van het laatste jaar (levering + EB), omdat sluipverbruik elk uur even groot is.
### 1.11.0 Piekvermogen
- Nieuwe groep `p` (veld `piek` op de dag: `{ f: [L1, L2, L3] W, t: 'hh:mm', som }`), alleen uit HomeWizard. Staat los van de voorrang bij stroom: Vattenfall heeft geen pieken. Geen schemawijziging: oudere versies laten het veld staan.
- Negatieve waarden (teruglevering op een fase, bij Geert L3) tellen als 0. `som` = hoogste som van de drie fasepieken binnen één kwartier: een bovengrens, want de pieken kunnen binnen het kwartier op verschillende momenten vallen.
- Grens 3×25 A × 230 V = 5.750 W per fase als constante in analyse.js (Enexis 3x25 van de tariefkaart). Bij Geert kwam L2 in 10 weken boven de 5.750 W (hoogste 6.463 W op 8-1-2026 19:15).
- Bestaande dagen krijgen pas pieken na het opnieuw inlezen van de HomeWizard-export.
### 1.12.0 Per dag van de week
- Gemiddelde per dag over de dagen van die weekdag die gegevens hebben (sluipverbruik: mediaan, piek: hoogste, gas per graaddag: som gas ÷ som graaddagen). Werkdagen en weekend als extra regels onder het totaal, niet in de grafiek (die blijft ma–zo).
- Feestdagen niet apart: dat vraagt een feestdagenlijst die per jaar verandert; het effect op een jaargemiddelde is klein.
### 1.13.0 Heatmap en "Soort analyse"
- Analyse heeft nu een keuze **Soort analyse**: "Zelf samenstellen" (de bestaande bouwer) plus vaste analyses die niet in het schema grootheid × indeling passen. Nieuwe soorten staan in `analyse-soorten.js` (eigen keuzes + resultaat); hun keuzes gaan mee in favorieten via `SOORT_STANDAARD`. Oude favorieten openen als "Zelf samenstellen".
- Heatmap alleen uit dagen met echte uurgegevens: het geschatte profiel zou voor Excel-dagen een nep-patroon tekenen.
- Rijen per dag tot 62 dagen, per week tot 400 dagen, anders per maand: zo blijft het op de iPhone leesbaar (max. ~560 px hoog).
- Kleur: één kleur licht→donker (accent) voor afname of teruglevering; netto twee kleuren met een neutraal midden (oranje = afname, accent = terug). Wortelschaal, zodat ook kleine waarden zichtbaar zijn naast een paar uitschieters.
### 1.14.0 Wat als de saldering stopt
- Zelfde verbruik, twee regelingen. Levering en energiebelasting zijn in beide gevallen die van het contract op die dag; alleen de terugleverregeling wisselt (die van het nieuwste contract met `perKwh`). Zo is het verschil zuiver het effect van het einde van de saldering, ook als Geert later nieuwe tarieven invoert.
- Met saldering tellen de vaste terugleverkosten (€ 462/jaar) mee, want die vervallen in 2027. Vaste kosten en gas tellen niet mee.
- Uitkomst met Geerts data (1-12-2025 t/m 4-11-2026): met saldering € 1.397, na einde € 1.600, verschil +€ 203 (≈ € 18 per maand). In de wintermaanden is het na 2027 zelfs goedkoper (geen vaste terugleverkosten).
### 1.15.0 Eigen verbruik in de zonuren
- Zonuur = uur met > 0,05 kWh teruglevering op die dag (per dag bepaald, dus seizoen en bewolking tellen vanzelf mee).
- "Te verschuiven" = per dag min(afname buiten de zonuren, teruglevering): een bovengrens, want niet alle verbruik is verplaatsbaar. Bewust per dag, niet over de hele periode: zonnestroom van vandaag kan niet de afname van morgen dekken.
- Waarde na 2027 = verschoven kWh × (gewogen afnametarief van de uren waar het vandaan komt − vergoeding + terugleverkosten). Met saldering alleen het verschil tussen de tijdvaktarieven van die uren en de zonuren.
- Met Geerts data: 1.957 kWh te verschuiven, € 526 per jaar waard na 2027 (nu € 87).
### 1.16.0 Stooklijn
- Model per dag: gas = vast + k × max(0, stookgrens − Tgem), kleinste kwadraten; stookgrens gezocht tussen 10 en 20 °C in stappen van 0,5. Gewone (ongewogen) temperatuur, want de weegfactoren van graaddagen zouden de lijn per maand verschuiven.
- Minimaal 14 dagen; geen stooklijn als k ≤ 0 (bijv. alleen zomer).
- Met Geerts data (12 maanden, deels nagemaakte temperaturen in de test): vast 0,46 m³/dag, stookgrens 12,5 °C, 0,64 m³ per graad kouder, R² 79%.
- Puntenwolk zonder tweede as; de lijn heeft dezelfde as als de punten.
### 1.17.0 Gas weer-gecorrigeerd
- Stooklijn van de vergelijkingsperiode (standaard dezelfde periode vorig jaar, of een eigen periode) toegepast op de temperaturen van deze periode = "verwacht bij dit weer". Werkelijk − verwacht = verschil los van het weer.
- Alleen dagen binnen het temperatuurbereik van de vergelijkingsperiode (± 1 °C) tellen mee. Zonder die grens gaf een vergelijking met alleen herfstdagen (Geerts gas begint op 11-10-2025) een onzinnige verwachting voor zomerdagen (vast deel ~2 m³/dag geëxtrapoleerd).
- Een stooklijn uit alleen winterdagen heeft een onbetrouwbaar vast deel (geen warme dagen), maar binnen het eigen temperatuurbereik voorspelt hij wel goed; daarom de bereikgrens in plaats van een vaste aanname voor het vaste deel.
- Test feb–mrt 2026 tegen nov 2025–jan 2026 (echte temperaturen): werkelijk 234 m³, verwacht 299 m³ (−22%).
### 1.18.0 Opgeteld verloop
- x-as = raster van 366 dagen (schrikkeljaar), zodat 1 maart in elk jaar op dezelfde plek staat; in gewone jaren neemt 29 februari de stand van 28 februari over.
- Een lijn begint pas bij de eerste dag met gegevens van dat jaar; ontbrekende dagen daarna tellen als 0. De kernzin vergelijkt alleen het stuk van het jaar waarin beide jaren gegevens hebben (bij Geert: gas 2025 begint op 11 oktober).
- Geen periodekeuze: altijd hele kalenderjaren (2, 3 of 4).
### 1.19.0 Jaarprognose
- Kalenderjaar van de laatste dag met gegevens. Onbekende dagen (rest van het jaar en gaten): stroom = dezelfde dag vorig jaar → daggemiddelde van die kalendermaand (alle jaren, min. 7 dagen) → laatste 4 weken; gas = stooklijn van de laatste 365 dagen bij de temperatuur van dezelfde dag vorig jaar ("normaal" weer = vorig jaar), anders als stroom. Kosten met kostenDag en het contract van die dag (schatting).
- Termijnen per kalendermaand van dit jaar; maanden zonder bedrag krijgen het laatst bekende bedrag. Verwachte eindafrekening = termijnen − verwachte kosten. Het Overzicht rekent over de laatste 12 maanden; deze prognose over het kalenderjaar (staat erbij).
- Vergelijking met vorig jaar alleen als dat jaar voor die grootheid ≥ 360 dagen heeft.
- Met Geerts data: verwachte kosten 2026 € 3.200, termijnen € 2.916 → ~€ 284 bijbetalen.
### 1.20.0 Top-10
- Alleen volledige dagen/weken/maanden binnen de periode met gegevens; anders staat een halve week bovenaan bij "laagste". Bij weinig perioden toont hij er minder (hoogstens de helft per lijst), zodat hoogste en laagste niet overlappen.
- Lijst met balkjes in plaats van een grafiek: leest beter op de iPhone en de volgorde is het punt.
### 1.21.0 Gemiddeld per dag
- Keuze "Toon: totaal / gemiddeld per dag" in Zelf samenstellen, alleen bij optellende grootheden en indeling week/maand/jaar/tijdvak (per dag is het al per dag; per uur en per weekdag zijn al gemiddelden; temperatuur, sluipverbruik en piek tellen niet op).
- Gedeeld door het aantal dagen **met gegevens** van die grootheid in het vakje (stroom: dagen met afname, gas: dagen met gas, kosten: alle dagen met een record; zon: dagen van de maand). Zo maakt een ontbrekende dag het gemiddelde niet lager. Geldt ook voor de vergelijkingsreeks, zodat "vorig jaar" eerlijk vergelijkt als dat jaar maar deels gegevens heeft.
### 1.22.0 Uitgesloten perioden
- Eigen collectie `uitgesloten` (schema 4) in plaats van een veld in `instellingen`: instellingen worden als geheel samengevoegd op `updatedAt` en het opslaan van de temperatuurlocatie vervangt het hele object. Een collectie voegt per record samen. MINOR (zoals 1.6.0): niets opnieuw koppelen, wel eerst andere apparaten bijwerken voordat je daar iets wijzigt.
- Werkt als filter op de afgeleide gegevens (`zonderUitgesloten`): dagen en temperaturen in een uitgesloten periode vallen weg, alsof er niets gemeten is; zonne-opbrengst van een maand vervalt als minstens de helft van de maand is uitgesloten; termijnen blijven staan. Daardoor geldt het vanzelf voor alle soorten analyse, ook voor "vorig jaar" in vergelijkingen. In de jaarprognose worden uitgesloten dagen geschat.
- Alleen in Analyse (keuze "weglaten", standaard aan en onderdeel van een favoriet). Historie, Overzicht en Controle tonen de echte gegevens.
### 1.22.1 Inline stijlen
- De Content-Security-Policy (`style-src 'self'`) blokkeert style-attributen. Kleuren in de heatmap en breedtes van de top-10-balkjes worden daarom via CSSOM (`el.style.x = …`) gezet; dat is wel toegestaan. De testpagina draait nu met dezelfde CSP.

## 2026-11-05 – Kleuren per jaar (versie 1.9.4)
- **Vaste jaarpalet in CSS** (`--jaar-0` t/m `--jaar-3` in app.css): accent, oranje, indigo, magenta, met een eigen
  donkere variant. Alle vier hebben minstens 3:1 contrast met de achtergrond (licht en donker), en de tinten liggen ver
  uit elkaar, ook voor wie rood/groen slecht onderscheidt.
- **Vorig jaar = `--jaar-1` (oranje)** in de gewone staafgrafieken, dezelfde kleur als het op één na nieuwste jaar bij
  Zonnepanelen. Zo betekent een kleur overal hetzelfde: "het jaar ervoor". Grijs (vroeger) leek op "geen gegevens".
- **Kleur hangt nog af van de plek (nieuwste = accent)**, niet van het kalenderjaar zelf. Zo is "dit jaar" altijd de
  accentkleur. Nadeel: 2025 is oranje als 2026 ook gekozen is, anders accent.
- **Oranje lijn (tweede grootheid in Analyse) en oranje vorig-jaarstaaf** komen nooit samen voor (één vergelijking
  tegelijk), dus geen verwarring.

## 2026-11-05 – Vaste terugleverkosten per maand verdelen (versie 1.9.3)
- **Zoals Vattenfall**: jaarbedrag ÷ 12 ÷ dagen in de maand, in plaats van ÷ 365. Zo komen de dagkosten overeen met
  wat Geert in Mijn Vattenfall ziet; het jaartotaal blijft € 462 (ook in schrikkeljaren).
- **Wintertijd-afwijking van Vattenfall niet nagebootst**: de app deelt kwartieren in op de kloktijd, wat volgens het
  contract juist is. Verschil is enkele centen op één dag per jaar.
- **PATCH**: bugfix in de berekening, geen schemawijziging.

## 2026-11-05 – Kaarten uitlijnen in twee kolommen (versie 1.9.2)
- **CSS subgrid**: elke kaart heeft vier vaste vakken (kop, extra knoppen, inhoud, toelichting; `vakKaart`) en deelt
  die rijen met de kaart ernaast. Daardoor gelijke hoogte en uitlijning zonder vaste pixelhoogtes. Een leeg vak is een
  lege `div.kaart-leeg` (bij één kolom verborgen). Subgrid werkt in Safari 16+ en Chrome 117+.
- **Rijafstand via marge, niet via row-gap** van het raster: in Chrome viel die afstand anders ook tussen de vakken
  binnen een kaart.
- **`.grafiek` met align-content: start**: anders rekte de regel boven de grafiek uit als de kaart ernaast hoger was
  (bijv. door een legenda) en zakte de grafiek een stukje.
- **Grafieken even hoog** in twee kolommen (`hoogte`-optie, 260 px; 220 px bij een smalle kolom).
- **Losse laatste kaart** op volle breedte krijgt ook een grafiek op volle breedte. **Termijnen** (losse getallen)
  staan buiten het raster, altijd over de hele breedte: naast een grafiek zou er veel lege ruimte in komen.
- **PATCH**: verbetering van een bestaande weergave.

## 2026-11-05 – Indelingskeuze op het Overzicht (versie 1.9.1)
- **Op verzoek van Geert op het Overzicht zelf**, niet in Instellingen: je ziet direct het effect van je keuze. Uit
  Instellingen verwijderd, zodat er één plek is.
- **Rechts naast de schermtitel**: app.js zet de titel in `.scherm-kop`; een scherm kan via `staat.titelExtra` iets
  rechts naast de titel plaatsen (wordt bij elke render leeggemaakt). Zo staat de keuze niet tussen de andere knoppen
  (Dag/Week… en Stroom/Terug…), die over de gegevens gaan in plaats van over de opmaak.
- **Alleen vanaf 1200 px zichtbaar**: daaronder heeft de keuze geen effect.
- **PATCH**: bestaande functie op een andere plek.

## 2026-11-05 – Indeling Overzicht op de laptop (versie 1.9.0)
- **Op verzoek van Geert drie brede varianten naast de bestaande**, te kiezen in Instellingen → App en sync (sinds 1.9.1 op het Overzicht), zodat hij
  ze in de praktijk kan vergelijken. Weergavevoorkeur in localStorage (`energieverbruik.overzichtIndeling`), dus per
  apparaat en niet gesynchroniseerd: op de iPhone heeft de keuze geen zin.
- **Alleen vanaf 1200 px vensterbreedte** (`BREED_SCHERM`): daaronder past een tweede kolom niet goed naast de zijbalk
  (256 px). Daaronder altijd één kolom. Bij het passeren van de grens tekent app.js het Overzicht opnieuw.
- **Inhoud breder (max. 1640 px)** alleen bij een brede indeling en alleen op het Overzicht (`body[data-indeling]`);
  de andere schermen houden 1040 px (tabellen en formulieren worden te breed niet beter leesbaar).
- **Grafiekbreedte doorgeven** (`breedte` bij `staafGrafiek`/`zonGrafiek`), berekend uit vensterbreedte, zijbalk en
  de vaste maten in app.css. Zo blijft de tekst in een halve kolom even groot als in een hele.
- **Grafiek en lijst**: lijst vast 380 px rechts, met eigen scrollbalk (max. 320 px hoog) en vaste kop, zodat de kaart
  niet hoger wordt dan de grafiek. De knop Grafiek/Lijst vervalt daar.
- **Alles tegelijk** bouwt op Naast elkaar: vier aparte kaarten (elk met eigen Grafiek/Lijst-keuze, ids `alles-<soort>`),
  daarna gas per graaddag, zonnepanelen en termijnen in hetzelfde raster. Een losse laatste kaart beslaat de hele breedte.
- **MINOR**: nieuwe functie, geen schemawijziging.

## 2026-11-05 – Analyse en één plek voor Instellingen (versie 1.6.0)
- **Instellingen als paneel, niet als venster**: de secties van de schil (sync, beveiliging, back-up, over, wissen)
  verhuizen in index.html van `<dialog>` naar `#settings-panel` onder de app-inhoud. Ze blijven dus altijd in het
  document, zodat shell.js ze gewoon kan vinden en vullen. Het scherm Instellingen toont via
  `ctx.toonSchilInstellingen(groep)` alleen de secties van het gekozen onderdeel (`data-groep`). Alternatief (de
  elementen telkens in het scherm verplaatsen) viel af: bij opnieuw tekenen zouden ze uit het document verdwijnen.
- **Drie onderdelen**: Tarieven (vaakst gebruikt), Gegevens (export, temperatuur, back-up: alles rond je data) en
  App en sync (koppeling en beveiliging). Tandwiel verwijderd; de sync-knop opent bij geen koppeling App en sync
  (`app.openSettings`).
- **Wijziging in core** (shell.js, index.html): bewust, omdat het verzoek juist over de template-instellingen gaat.
  Klein gehouden: `openSettings` delegeert naar de app als die `app.openSettings` heeft, anders toont hij alles.
- **Analyse-keuzes** volgens Geerts antwoorden: verbruik, kosten, weer en tijdvakken/uur; vergelijken met vorig jaar,
  een andere periode (zelfde lengte, eigen startdatum) of een tweede grootheid (lijn, as rechts); favorieten; CSV.
- **Eén vergelijking tegelijk** (vorig jaar óf andere periode óf tweede grootheid): een grafiek met staven, grijze
  staven én een lijn wordt op de iPhone onleesbaar.
- **Per uur/tijdvak alleen stroom** (afname, terug, netto): gas en kosten zijn niet per uur opgeslagen. Per uur =
  gemiddeld per dag; dagen zonder uurdata volgen het uurprofiel en zijn als geschat gemarkeerd. Zonne-opbrengst alleen
  per maand/jaar (SolarEdge levert maanden).
- **Vorig jaar bij dag/week = 364 dagen eerder**, zodat weekdagen gelijk blijven; bij maand/jaar dezelfde datum.
- **Per dag maximaal 400 dagen**: meer staven zijn niet meer te lezen.
- **Favorieten bewaren relatieve perioden** ("laatste 12 maanden"), zodat ze meegaan in de tijd; eigen datums worden
  vast bewaard.
- **Favorieten in de kluis** (collectie `analyses`, schema 3), zodat ze synchroniseren. Schema-ophoging zoals bij
  1.1.0 als MINOR: de app werkt zich bij openen zelf bij, Geert hoeft niets te koppelen.

## 2026-11-05 – Eén plek voor alle bestanden (versie 1.5.0)
- **Op verzoek van Geert**: één knop (Invoer → Bestanden inlezen) voor alle bronnen; de app herkent het bestand aan de
  inhoud (kopregel bij CSV, zip-kop of .xlsx bij Excel), niet aan de bestandsnaam.
- **Excel ook via deze knop**, zodat er echt één plek is; de Excel-kaart in Instellingen is weg.
- **Voorrang ongewijzigd** (Vattenfall > HomeWizard > Excel > handmatig voor stroom en gas; SolarEdge voor de
  opbrengst). Vattenfall is bepalend, ongeacht de volgorde van inlezen. Bij meerdere bestanden tegelijk wordt
  verwerkt in de volgorde Vattenfall → HomeWizard → Excel → SolarEdge.
- **MINOR**: andere indeling van bestaande functies, geen schemawijziging.

## 2026-11-05 – Uitleg SolarEdge (versie 1.4.1)
- **Naam van het portaal overgenomen van Geert** ("SolarEdge Monitoring platform"), zodat de uitleg aansluit bij wat hij
  op zijn scherm ziet. **PATCH**: alleen tekst.
- **Melding over 0 kWh blijft**: aug 2025 klopt (panelen uit), maar bij een volgende import is zo'n melding nog steeds
  nuttig om een echte storing op te merken.

## 2026-11-05 – SolarEdge-import (versie 1.4.0)
- **Maandbestand** (de export die Geert aanleverde: alle maanden van alle jaren in één bestand). Dagbestanden
  worden geweigerd met een duidelijke melding; per dag staat op de wishlist.
- **SolarEdge gaat voor de opbrengst**: een bestaande waarde (Excel of handmatig) wordt overschreven, het verschil
  staat in het rapport (afwijkend bij > 1 kWh én > 2%). Reden: de Excel had maanden die halverwege waren overgetikt
  (nov 2025: 35 i.p.v. 139). Handmatig invullen blijft mogelijk en wist de import-merker, zodat ongedaan maken
  een handmatige correctie laat staan.
- **Overslaan**: maanden met 0 vóór de eerste opbrengst (vóór de installatie) en de lopende/toekomstige maanden
  (onvolledig, zelfde gedachte als de onvolledige dag bij meterbestanden). Een 0 tussen andere maanden wordt wel
  ingelezen, met een melding.
- **Herkennen aan de kopregel** (Meettijd/Time + Energy), zodat het bestand ook via "Export inlezen" kan. Maandnamen
  Nederlands én Engels; eenheid uit de kop (Wh/kWh/MWh); punt als decimaalteken, komma's met groepjes van drie
  als duizendtallen.
- **Ongedaan maken herstelt de oude waarde**: `herstel.maanden[m].oud` bewaart waarde en import-merker. Oude
  Excel-imports hebben geen `oud` en zetten zoals voorheen terug naar leeg.
- **Geen schemawijziging**; alleen een nieuwe importsoort `solaredge`. **MINOR (1.4.0)**: nieuwe functie. Een apparaat
  met een oudere versie toont deze import als "solaredge" in de lijst tot het is bijgewerkt.

## 2026-11-05 – Maandtotaal als tabelregel (versie 1.3.4)
- **Zelfde vorm als Maanden** (klasse `jaar-rij`), op Geerts verzoek: totalen onder de kolommen in plaats van een
  tekstregel erboven.
- **m³/gd = totaal gas ÷ totaal graaddagen** (zoals eerder besloten), **°C = gemiddelde** van de dagen met een
  temperatuur. Kosten cursief als er geschatte dagen in zitten.
- **Totaalregel niet aantikbaar**; alleen dagregels openen het bewerkvak.
- **PATCH**: verbetering van een bestaande weergave.

## 2026-11-05 – "null" in Historie (versie 1.3.3)
- **Centraal opgelost in app.js** (`inhoud.filter(Boolean)`) in plaats van alleen in scherm-historie.js, zodat
  geen enkel scherm dit probleem nog kan krijgen. Core-bestanden niet aangepast.
- **PATCH**: bugfix.

## 2026-11-05 – Logo en versienummer (versie 1.3.2)
- **Zelfde opbouw als Vaste Lasten**: logo + naam + versie bovenin de zijbalk, inklapknop rechts ernaast.
  Ingeklapt: alleen logo met de knop eronder.
- **Logo = het app-icoon** (`icons/icon-192.png`), zodat het overeenkomt met het icoon op het beginscherm en al
  offline in de cache staat.
- **iPhone/iPad**: geen zijbalk, dus logo, naam en versie in de kopbalk. Op de laptop wordt dat deel van de kopbalk
  verborgen (staat al in de zijbalk); de knoppen rechts blijven.
- **Versie via `data-app-version`**, ingevuld vanuit `APP.version` in app.js; zo blijft config.js de enige plek
  waar het nummer staat. Core-bestanden (shell.js) niet aangepast.
- **Zijbalk 216 → 256 px**: anders werd "Energieverbruik" afgekapt.
- **PATCH**: kleine verbetering, geen nieuwe functie.

## 2026-11-06 – Terug in de tijd op het Overzicht (versie 1.27.0)
- **Eén stap = één dag/week/maand/jaar** (de gekozen periode), niet een heel scherm (31 dagen, 13 weken …): zo
  horen de kerncijfers bij één duidelijke periode en is die altijd de laatste staaf in de grafieken.
- **Gekozen datum blijft bij wisselen van periode**: van september naar Week toont de week waarin die datum valt.
  Valt de datum in de lopende periode, dan gedraagt het Overzicht zich als zonder pijltjes ("Deze week" t/m de
  laatste dag met gegevens).
- **Kerncijfers van een afgelopen periode = de hele periode**, vergeleken met dezelfde dagen vorig jaar.
- **Grenzen**: niet verder terug dan de periode met de eerste gegevens, niet verder vooruit dan de laatste.
- **Niet verschoven**: de kaart Termijnen (gaat over de verwachte eindafrekening, dus altijd de laatste 12 maanden)
  en de zonnepanelen per kalendermaand (heeft eigen jaarkeuze).
- **Niet bewaard**: na herladen staat het Overzicht weer op nu.
- **Zelfde vormgeving als de maandkeuze in Historie** (‹ titel ›), met "Naar nu" onder de titel.
- **MINOR**: nieuwe functie, geen schemawijziging.

## 2026-11-09 – Gas per graaddag: weinig graaddagen toch tonen (versie 1.38.1)
- **Aanleiding**: juli 2026 was leeg in het Overzicht maar had wel een waarde in Historie; dat verwarde.
- **Keuze (Geert)**: tonen maar markeren. Onder het minimum (dag 1, week 3, maand/jaar 5 graaddagen) een lichte staaf
  en * in de lijst. De schaal volgt alleen de gewone perioden, zodat zomeruitschieters de rest niet platdrukken;
  wat erboven uitkomt wordt afgekapt met een ↑ en de echte waarde staat in de info bij aantikken.
- **PATCH**: verbetering van een bestaande grafiek.

## 2026-11-05 – Gas per graaddag volgt de periode (versie 1.3.1)
- **Zelfde perioden als de hoofdgrafiek** (31 dagen, 13 weken, 12 maanden, 5 jaar), met vorig jaar ter vergelijking.
- **Minimum graaddagen per periode**: dag 1, week 3, maand en jaar 5. In de grafiek zouden zachte dagen met een
  graaddag van bijv. 0,1 enorme staven geven en de rest platdrukken. In de dagtabel van Historie staat de
  waarde wel bij elke graaddag boven 0 (zoals de Excel).
- **PATCH**: verbetering van een bestaande grafiek.

## 2026-11-05 – Gas per graaddag per dag (versie 1.3.0)
- **Zelf berekend, niet uit de Excel**: gas ÷ gewogen graaddag, alleen als er gas is en de graaddag boven 0 ligt
  (anders –; de Excel toont dan 0). Zelfde uitkomst als kolom O voor alle 268 vergeleken dagen.
- **Afwijking van de Excel bij precies 0,0 °C**: de Excel laat de graaddag dan leeg (`IF(G=0,"",…)`); de app rekent
  gewoon (18 × weegfactor). Komt voor op 18-1-2025.
- **Maandwaarde = totaal gas ÷ totaal graaddagen** (alleen stookdagen), niet het gemiddelde van de dagwaarden:
  zachte dagen met een kleine graaddag geven per dag grote uitschieters die een gemiddelde scheeftrekken.
- **Kolom ook op de iPhone zichtbaar** (niet `verberg-smal`), omdat Geert dit dagelijks wil zien.
- **MINOR**: nieuwe weergave, geen schemawijziging; de waarde wordt berekend, niet opgeslagen.

## 2026-11-05 – Uitgangspunten (versie 1.0.0)
- **Invoer via HomeWizard CSV-export** (hoofdroute), handmatig als reserve. Geert tikte de dagwaarden
  eerst over van de Vattenfall-website; de export is nauwkeuriger en levert kwartierdata.
- **Per dag 24 uurwaarden** (afname en teruglevering) opslaan. Alle tijdvakgrenzen vallen op hele uren;
  zo blijft de kluis klein (~110 kB per jaar) en kunnen kosten met een ander contract opnieuw berekend worden.
  Een dag = 00:00 tot 00:00 lokale tijd. Gaten in de metingen worden gelijk over de uren verdeeld.
- **Vaste id's per datum** (`d:yyyy-mm-dd`, `w:…`, `m:yyyy-mm`), zodat dezelfde dag op twee apparaten
  bij het synchroniseren één record wordt.
- **Voorrang bij import**: HomeWizard overschrijft Excel; Excel vult alleen aan. Opmerkingen blijven staan.
- **Kosten per tijdvak**: exact met uurdata; zonder uurdata verdeeld volgens het gemiddelde uurprofiel
  (seizoen × week/weekend) en gemarkeerd als schatting.
- **Seizoenen**: zomer 1 april t/m 30 september, winter 1 oktober t/m 31 maart.
- **Tijdvakken stroom** (Vattenfall): zomer normaal 00–12 en 16–24; zomer dal week/weekend 12–16;
  winter normaal 06–12 en 16–01; winter dal dag 12–16; winter dal nacht 01–06.
- **Saldering (aanname)**: teruggeleverde kWh worden verrekend tegen levering + energiebelasting van
  hetzelfde tijdvak; vaste terugleverkosten (€462/jaar) per dag verdeeld. Een jaaroverschot (meer terug dan
  afgenomen) wordt nog niet apart tegen de terugleververgoeding verrekend — bij Geert niet aan de orde.
- **Na saldering (vanaf 1-1-2027)**: teruglevering × (terugleverkosten − vergoeding) per kWh.
- **Energiebelasting-staffels** worden niet apart berekend: het tarief is gelijk tot 10.000 kWh / 170.000 m³.
- **Tarieven als getal in euro's met 6 decimalen** (centen zijn niet precies genoeg); kosten worden pas bij
  het tonen afgerond. Termijnbedragen staan wel in centen (template-regel).
- **Temperatuur via Open-Meteo** (geen sleutel nodig; KNMI vereist een API-sleutel). Temperaturen uit de
  Excel (KNMI) blijven staan. Graaddag: (18 − Tgem) × weging 1,1 (nov–feb) / 1,0 (mrt, okt) / 0,8 (apr–sep).
- **Excel-import zonder library**: eigen .xlsx-lezer (zip via DecompressionStream), conform de template-regel
  "geen externe scripts".
- **Termijnen vs kosten**: over de laatste 12 maanden; schatting. Sinds 1.27.1 krijgt een maand zonder bedrag
  het laatst bekende bedrag (een termijn geldt tot hij verandert; bij een tussentijdse aanpassing hoeft Geert
  alleen de maand van de wijziging in te vullen). Maanden vóór het eerste bekende bedrag tellen niet mee.
  Zo rekenen Overzicht en jaarprognose op dezelfde manier.
- **Zelfvoorzienendheid**: zelf gebruikt = zonne-opbrengst − teruglevering; aandeel = zelf gebruikt /
  (afname + zelf gebruikt).
- **Ingeklapte zijbalk** wordt als weergavevoorkeur in localStorage bewaard (geen gegevens).
- **P1 automatisch uitlezen staat op de wishlist**: vanaf een https-site blokkeert de browser
  waarschijnlijk het contact met de dongle op het thuisnetwerk.

## 2026-11-05 – Zonnepanelen per jaar vergelijken (versie 1.8.0)
- **Overlappende kolommen** (keuze Geert): zelf gebruikt kan nooit hoger zijn dan de opbrengst, dus past het als
  gevuld deel binnen de opbrengst-kolom. Percentage als bijschrift; geen tweede as. Vervangt de lijn uit 1.7.0.
- **Kalenderjaar als x-as (jan–dec)** met de gekozen jaren naast elkaar, in plaats van de laatste 12 maanden; zo is
  elke maand direct met dezelfde maand in andere jaren te vergelijken.
- **Jaarkeuze als weergavevoorkeur** in localStorage (niet gesynchroniseerd). Standaard de laatste twee jaren met
  opbrengst; hoogstens 4 (anders worden kolommen te smal en zijn de kleuren niet meer uit elkaar te houden).
- **Kleuren per jaar**: nieuwste accent, dan grijs, oranje, paars. Percentage liggend als de kolom ≥18 px breed is,
  staand vanaf 7 px, anders alleen in de tekst bij aantikken.

## 2026-11-05 – Grafiek of lijst per kaart (versie 1.7.0)
- **Keuze per kaart, niet één knop voor alles**: bij zonnepanelen wil je misschien de tabel en bij verbruik de
  grafiek. Bewaard in localStorage (weergavevoorkeur, geen gegevens; niet gesynchroniseerd), standaard Grafiek.
- **Zonnepanelen in één grafiek**: opbrengst en zelf gebruikt als staven (kWh), zelfvoorzienendheid als lijn met
  eigen as rechts, met de bestaande `lijn`-optie van `staafGrafiek`. Altijd per maand (opbrengst is alleen per
  maand bekend), los van de periodekeuze.
- **Lopende periode in de lijst**: geen verschilpercentage, omdat de vergelijking met de hele periode vorig jaar
  een vertekend beeld geeft. De Kerncijfers vergelijken wel netjes dezelfde dagen.

## 2026-11-05 – Vattenfall-import (versie 1.2.0)
- **Vattenfall is leidend** (keuze Geert): dat zijn de officiële meetgegevens waarop de rekening gebaseerd is.
  Rangorde Vattenfall > HomeWizard > Excel > handmatig. Een import overschrijft alleen waarden van een bron met
  gelijke of lagere rang; anders alleen vergelijken (`behouden: true` in het overlap-overzicht). Vervangt de
  regel "HomeWizard overschrijft Excel" uit 1.0.0.
- **Zelfde omrekening als HomeWizard**: kwartier- en uurbestanden worden omgezet naar de stand aan het begin van elk
  uur en gaan door `standenNaarDagen`. Zo worden zomer-/wintertijd en gaten precies zo behandeld.
  Getest met Geerts bestanden (5-5 t/m 4-11-2026): alle 33 stroomdagen en 62 gasdagen gelijk aan de Excel.
- **Herkennen aan de kopregel** (`Datum;Tijd;…Meterstand levering…`), niet aan de bestandsnaam. Het gasbestand is
  Windows-1252 (m³); alleen de kop raakt daardoor verminkt en die wordt niet op ³ gecontroleerd.
- **Dagbestanden**: geen uurverdeling. Bestaat er al een HomeWizard-uurverdeling (of komt die later), dan wordt die
  geschaald naar het Vattenfall-dagtotaal; de bron blijft `vattenfall`. Bij een keuze van meerdere bestanden
  worden Vattenfall-bestanden eerst verwerkt. Maandbestanden worden geweigerd.
- **MINOR (1.2.0)**: geen schemawijziging; alleen een nieuwe bronwaarde `vattenfall` en nieuwe importsoorten
  `vattenfall-stroom`/`vattenfall-gas`. Een apparaat met 1.1.0 toont die als "onbekend" tot het is bijgewerkt.

## 2026-11-05 – Importcontrole (versie 1.1.0)
- **Schema 2**: nieuwe collectie `importen` (logboek met rapport en herstelgegevens), op dagen `imp`
  (per groep stroom `s`, gas `g`, opmerking `o`: welke import de waarde het laatst zette) en `gecontroleerd`.
  Migratie voegt alleen een lege lijst toe. Gekozen voor MINOR (1.1.0): er hoeft niets opnieuw gekoppeld te
  worden; een ander apparaat moet alleen bijgewerkt worden voordat daar iets gewijzigd kan worden.
- **Ongedaan maken per groep velden**: een import bewaart hoe elke groep er vóór de import uitzag. Terugzetten
  gebeurt alleen als `imp` nog naar deze import wijst, zodat latere imports en handmatige correcties blijven staan.
  Handmatig wijzigen wist de `imp`-merker van die groep.
- **Alleen de laatste 10 imports terug te draaien**: oudere herstelgegevens worden gewist, zodat de kluis klein blijft.
  Ongewijzigde waarden worden niet opgeslagen, dus een overlappende export kost bijna niets.
- **Overlap vergelijken**: bestaande waarde tegenover de nieuwe; afwijkend bij meer dan 0,1 kWh / 0,05 m³ én meer
  dan 2%. Bij Excel na HomeWizard blijft de HomeWizard-waarde staan, maar het verschil wordt wel getoond.
- **Controles worden berekend, niet opgeslagen**: "normaal" = mediaan van ±15 dagen (minimaal 7 waarden);
  uitschieter bij meer dan 3× normaal én een minimaal verschil (stroom 5 kWh, teruglevering 10 kWh, gas 3 m³);
  ≥300× wijst op komma/punt of eenheid. Gas per graaddag tegenover de mediaan van ±30 dagen. Teruglevering
  tussen 23 en 05 uur > 0,1 kWh. Reeksen nullen: gas ≥3 dagen in okt–mrt, teruglevering ≥3 dagen in apr–sep.
- **Afvinken met vingerafdruk** (`afname|terug|gas`): verandert een waarde, dan komt de melding vanzelf terug.
- **Vergelijking met de jaarafrekening wordt niet bewaard**: alleen voor dat moment.

## Kleur verschilkolom gasanalyse (1.28.1)
- Besparing groen, meerverbruik rood, ook in de totaalregel, zodat de tabel dezelfde betekenis heeft als de kerncijfer 'Zuiniger/Minder zuinig' erboven. Gebruikt de bestaande class `min` (var(--ok)).

## Kleur van verschillen in tabellen (1.28.2)
- Elke maat heeft een richting (`beter: 'lager'` of `'hoger'`); de verschilkolom kleurt groen als het gunstig is, rood als het ongunstig is. Temperatuur en graaddagen hebben geen richting en blijven wit: aan het weer kun je niets doen.
- Niet gekleurd: het scherm Controle (daar betekent de kleur klopt/klopt niet) en de lopende tekst bij Cumulatief verloop (kleur in een zin leest onrustig).

## Knoppen synchroniseren/vergrendelen op de titelregel (1.38.3)
- Op de laptop kostte de kopbalk een hele strook hoogte voor alleen twee pictogrammen (logo en naam staan al in de
  zijbalk). Daarom verbergt de CSS de kopbalk vanaf 900 px en verplaatst app.js het element `.header-actions`
  naar rechts op de titelregel (`.scherm-kop-rechts`, na de keuze Indeling).
- Het element wordt verplaatst, niet nagemaakt: de schil (core/shell.js) koppelt de klikken en de syncstatus aan
  `#btn-sync`/`#btn-lock`. app.js houdt een vaste verwijzing bij, omdat het oude scherm bij opnieuw tekenen wordt
  weggegooid. Onder 900 px gaat het terug in de kopbalk.
- Bewust geaccepteerd: de knoppen scrollen op de laptop mee weg.
