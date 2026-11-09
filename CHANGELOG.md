# Changelog

## 1.38.1

**Verbeterd**
- **Gas per graaddag in het Overzicht**: perioden met weinig graaddagen (zoals juli 2026) bleven leeg, terwijl Historie ze wel toonde. Ze staan er nu wel, als lichte staaf (en met * in de lijst). Ze tellen niet mee voor de schaal; een te hoge staaf wordt afgekapt met een ↑, aantikken toont de echte waarde.

## 1.38.0

**Toegevoegd**
- **Zonne-opbrengst automatisch van SolarEdge**: GitHub haalt elke nacht de opbrengst per dag op bij de SolarEdge-API en zet die in je privé-repo SyncData; de app leest die vanzelf in (hooguit eens per uur kijken, alleen nieuwe of gewijzigde dagen, als gewone import met rapport en ongedaan maken). De API-sleutel staat alleen als geheim in SyncData. Op Invoer staat tot welke dag de opbrengst binnen is, met een knop "Nu bijwerken", en uitleg om het in te stellen.

## 1.37.0

**Toegevoegd**
- **Tegenover gemiddeld** (Analyse → Vergelijken en CO₂): je stroom (totaal verbruik én afname van het net) en gas over de laatste 365 dagen naast het gemiddelde van huishoudens met hetzelfde aantal personen en hetzelfde soort woning (CBS 2025).

## 1.36.0

**Toegevoegd**
- **CO₂-uitstoot** (Analyse → Vergelijken en CO₂): uitstoot door gas en door stroom van het net, en hoeveel je zonnepanelen vermijden door terug te leveren. Per maand en in totaal. De omrekenfactoren (standaard 0,20 kg per kWh en 1,78 kg per m³) zijn aan te passen.

## 1.35.0

**Toegevoegd**
- **Warmtepomp** (Analyse → Wat als…): wat een hybride of volledig elektrische warmtepomp met jouw gasverbruik had gedaan: minder gas, extra stroom, besparing per jaar en terugverdientijd. Rekent per dag met de buitentemperatuur; keuze tussen gewone radiatoren en vloerverwarming, vermogen en aanschafprijs zijn in te vullen.

## 1.34.0

**Toegevoegd**
- **Dynamisch contract** (Analyse → Wat als…): je verbruik per uur doorgerekend met de uurprijzen van de stroombeurs (via EnergyZero), naast je eigen contract, beide met de regels vanaf 2027. Inkoopvergoeding en opslag op teruglevering zijn in te vullen. Laat ook zien hoeveel je teruglevert terwijl de beursprijs negatief is.
- De beursprijzen worden bij het openen opgehaald en op dit apparaat bewaard.

## 1.33.0

**Toegevoegd**
- **Thuisbatterij** (Analyse → Wat als…): speelt uur voor uur na wat een batterij van 2,5 tot 15 kWh met jouw verbruik had gedaan. Toont de besparing met saldering (nu) en vanaf 2027, hoeveel stroom uit de batterij kwam en de terugverdientijd bij een prijs per kWh die je zelf invult (standaard € 500).

## 1.32.0

**Toegevoegd**
- **Zon tegen weer** (Analyse → Zonnepanelen): je zonne-opbrengst gedeeld door de hoeveelheid zonlicht die er in Eindhoven viel (zoninstraling, Open-Meteo). Elke maand wordt vergeleken met dezelfde maand in andere jaren: 100% = normaal. Maanden onder 85% worden gemarkeerd (vuile panelen, schaduw, een omvormer die uit stond). Met tabellen per jaar en per maand.
- De zoninstraling wordt bij het openen opgehaald en op dit apparaat bewaard (internet nodig de eerste keer).

## 1.31.0

**Toegevoegd**
- **Terugleverschaal** (Analyse → Kosten en tarieven): je teruglevering opgeteld door het jaar, de verwachte teruglevering voor het hele jaar (jaarprognose) en of je binnen de grenzen van je schaal blijft. Met de vaste terugleverkosten van nu naast de terugleverkosten per kWh vanaf 2027. De grenzen van je schaal vul je zelf in (standaard schaal 14: 3.500–4.000 kWh).

## 1.30.0

**Toegevoegd**
- **Goedkopere uren** (Analyse → Kosten en tarieven): hoeveel stroom je per tijdvak afneemt, wat je er gemiddeld per kWh voor betaalt, en wat het oplevert als je 10–50% van je verbruik naar het goedkoopste tijdvak van die dag verschuift (bijv. wasmachine of auto met uitgestelde start). Met een besparing per maand.

## 1.29.0

**Toegevoegd**
- **Opvallende dagen** (Analyse → Verbruik en patronen): dagen die flink afwijken van wat je mocht verwachten, hoger én lager.
  - *Stroom, zonder grote verbruikers* (standaard): uren met meer dan 2 kWh afname (zoals de auto laden) tellen niet mee, zodat je ziet of er iets anders aan stond of juist uit. Ook te kiezen: *Stroom, alles*.
  - Stroom wordt vergeleken met dezelfde weekdag in de 8 weken ervoor; een vaste gewoonte valt dus niet op.
  - *Gas*: vergeleken met wat je stooklijn bij de temperatuur van die dag voorspelt.
  - Gevoeligheid laag/normaal/hoog, en alleen hoger, alleen lager of beide. Een opmerking die je in Historie bij een dag zet, staat in de lijst.

**Gewijzigd**
- De tegels van **Wat wil je analyseren?** staan nu in groepen (Verbruik en patronen, Kosten en tarieven, Gas en verwarming, Zonnepanelen, Wat als…, Vergelijken en CO₂).

## 1.28.2

**Verbeterd**
- **Verschillen in kleur in alle tabellen**: groen = gunstig, rood = ongunstig.
  - **Overzicht**, tabellen naast de grafieken (Stroom, Terug, Gas, Kosten, Gas per graaddag): de kolom Verschil met vorig jaar. Bij teruglevering is méér groen.
  - **Analyse → eigen vergelijking**: de kolommen Verschil en %. Lager is groen bij verbruik, piekvermogen, sluipverbruik, kosten en gas per graaddag; hoger is groen bij teruglevering, zonne-opbrengst, zonnestroom zelf gebruikt en zelfvoorzienendheid. Temperatuur en graaddagen blijven wit (het weer is niet goed of slecht).
  - **Analyse → Einde saldering**: een maand die goedkoper uitvalt is nu groen (duurder was al rood).

## 1.28.1

**Verbeterd**
- **Gas weer-gecorrigeerd** (Analyse): in de tabel kleurt een besparing in de kolom Verschil nu groen, net zoals een hoger verbruik rood kleurt. Ook de totaalregel krijgt die kleur.

## 1.28.0

**Toegevoegd**
- **Gas in de heatmap** (Analyse → Heatmap → Wat: Gas): zie per uur van de dag wanneer de verwarming gas gebruikt. Hiervoor bewaart de app voortaan het gasverbruik per uur uit de Vattenfall-gasdownload (per uur) en de HomeWizard-gasexport. **Lees die bestanden één keer opnieuw in** (Invoer → Bestanden inlezen), dan is het gas per uur ook voor je bestaande dagen bekend.

**Gewijzigd**
- **Heatmap in stoplichtkleuren**: groen = gewenst, via geel en oranje naar rood = ongewenst. Bij afname en gas is weinig groen; bij teruglevering is veel groen; bij netto is veel teruglevering groen, gelijk geel en veel afname rood.
- De kleurschaal loopt tot de hoogste 5% van de waarden, zodat een paar uitschieters (zoals de auto laden) niet alle andere vakjes groen maken.

## 1.27.1

**Verbeterd**
- **Termijnen op het Overzicht**: een maand zonder ingevuld termijnbedrag telt nu mee met het laatst bekende bedrag, net als in de jaarprognose. Verandert je termijnbedrag, dan vul je alleen het nieuwe bedrag in bij de maand waarin het ingaat (Invoer → Maandgegevens).

## 1.27.0

**Toegevoegd**
- **Terug in de tijd op het Overzicht**: met de pijltjes ‹ en › bovenaan de kerncijfers ga je een dag, week, maand of jaar terug of vooruit (afhankelijk van wat je kiest bij Dag/Week/Maand/Jaar). De kerncijfers tonen dan die hele periode, vergeleken met dezelfde periode vorig jaar, en alle grafieken eindigen bij die periode. Met **Naar nu** spring je terug naar je laatste gegevens.

## 1.26.0

**Toegevoegd**
- **Zonne-opbrengst per dag**: de app leest nu ook de SolarEdge-export per dag ("energy-chart-data_….csv") in, via dezelfde knop op Invoer. De app herkent zelf of het een dag- of maandbestand is.
- **Zelfvoorzienendheid per dag en per week**: kies op het Overzicht Dag of Week, dan toont de kaart Zonnepanelen per dag/week de opbrengst, wat je zelf gebruikt hebt en het percentage. Bij Maand en Jaar blijft de bekende vergelijking per kalendermaand.
- In **Analyse** drie nieuwe keuzes bij Zonnepanelen: zonne-opbrengst (nu ook per dag en week), zonnestroom zelf gebruikt en zelfvoorzienendheid.
- In **Historie** staat bij een dag de opbrengst, wat je zelf gebruikt hebt en de zelfvoorzienendheid. De CSV-export heeft een kolom zon_kwh.

**Gewijzigd**
- Is een maand helemaal per dag bekend, dan rekent de app met de dagen (preciezer: zelf gebruikt wordt per dag bepaald). Anders met de maandwaarde, zoals voorheen. Een maand die nog niet compleet per dag bekend is (zoals de lopende maand) telt met de dagen die er zijn, gemarkeerd met "niet elke dag".

**Let op**
- De gegevens hebben een nieuwe versie (5). Open na het bijwerken de app eenmaal op al je apparaten voordat je op een ander apparaat iets wijzigt.

## 1.25.0

**Toegevoegd**
- **Weergave Zwart** naast Automatisch, Licht en Donker (Instellingen → App en sync → Weergave): donker met een echt zwarte achtergrond, voor OLED-schermen zoals die van de iPhone. Zwarte pixels staan dan helemaal uit, wat er strak uitziet en de batterij spaart. Kaarten blijven net iets lichter, zodat je de indeling blijft zien. Werkt met alle kleurthema's.

## 1.24.0

**Toegevoegd**
- **Kleurthema's**: in Instellingen → App en sync → Weergave kies je uit zes thema's (Groenblauw, Blauw, Groen, Paars, Framboos, Grafiet). Het thema bepaalt de accentkleur van knoppen en grafieken en geeft de achtergrond een lichte tint.
- **Licht, Donker of Automatisch**: Automatisch volgt je iPhone/iPad/laptop, of zet de app vast op licht of donker.
- Beide keuzes gelden per apparaat. De statusbalk bovenin kleurt mee.

## 1.23.0

**Verbeterd**
- **Soort analyse staat nu bovenaan Analyse** in een eigen blok "Wat wil je analyseren?", als tegels in plaats van een keuzelijst. Elke tegel heeft een korte uitleg, en de gekozen soort is gemarkeerd. Daaronder staan de keuzes voor die soort.

## 1.22.1

**Gecorrigeerd**
- In de **heatmap** en de **top-10** werden de kleuren en balkjes in de geïnstalleerde app niet getoond, omdat de beveiligingsinstellingen van de app die manier van opmaken blokkeerden. Nu werkt het wel.

## 1.22.0

**Toegevoegd**
- **Uitgesloten perioden** in Analyse (onderaan het blok Samenstellen). Leg perioden vast die niet representatief zijn, zoals augustus–september 2025 toen het huis leeg stond, met een reden erbij. Analyse laat die dagen dan weg, in alle soorten analyse en ook als ze in "vorig jaar" vallen. Met één vinkje zet je het weglaten aan of uit. Onder het resultaat staat hoeveel dagen zijn weggelaten. Historie en Overzicht laten gewoon alles zien.
- De uitgesloten perioden worden gesynchroniseerd tussen je apparaten.

**Let op**
- Nieuwe gegevensversie (voor de uitgesloten perioden). Een apparaat met een oudere versie vraagt na het synchroniseren om bij te werken; open de app daar even zodat hij zich bijwerkt.

## 1.21.0

**Toegevoegd**
- **Gemiddeld per dag** in Zelf samenstellen: bij een indeling per week, maand, jaar of tijdvak kies je bij "Toon" tussen het totaal en het gemiddelde per dag. Dat deelt door het aantal dagen met gegevens, zodat een korte maand (februari), een onvolledige week of een periode met ontbrekende dagen eerlijk naast de rest staat. Ook de vergelijking met vorig jaar gebruikt dan het gemiddelde per dag.

## 1.20.0

**Toegevoegd**
- **Top-10: hoogste en laagste** als soort analyse. Kies wat (bijv. stroom, gas, kosten, sluipverbruik of piekvermogen) en of je dagen, weken of maanden wilt zien; je krijgt de 10 hoogste en 10 laagste in de gekozen periode, met een balkje voor de grootte. Handig om uitschieters te vinden die je in Historie kunt nakijken.

## 1.19.0

**Toegevoegd**
- **Jaarprognose tot 31 december** als soort analyse. Wat je dit jaar al verbruikt hebt plus een schatting voor de rest van het jaar: stroom zoals dezelfde dagen vorig jaar, gas met je stooklijn bij het weer van vorig jaar. Je ziet het verwachte jaarverbruik van stroom, teruglevering en gas, de verwachte kosten inclusief vaste kosten, je termijnen en wat je naar verwachting terugkrijgt of moet bijbetalen. Per maand in een grafiek en tabel; geschatte maanden zijn lichter en cursief.

## 1.18.0

**Toegevoegd**
- **Opgeteld verloop door het jaar** als soort analyse. Een lijn per jaar die optelt vanaf 1 januari, dit jaar naast vorig jaar (of de laatste 3 of 4 jaar), voor stroom, teruglevering, gas of kosten. Beweeg of tik in de grafiek voor de stand op een dag. Bovenaan staat hoe dit jaar er tot vandaag voor staat tegenover vorig jaar, en een tabel geeft de stand aan het eind van elke maand.

## 1.17.0

**Toegevoegd**
- **Gas weer-gecorrigeerd vergelijken** als soort analyse. De app bepaalt je stooklijn in de vergelijkingsperiode (standaard dezelfde periode vorig jaar, of een periode die je zelf kiest) en rekent uit hoeveel gas je met dat stookgedrag bij het weer van nu verbruikt zou hebben. Het verschil met wat je echt verbruikte laat zien of je zuiniger stookt, los van een koude of warme winter. Per maand in een grafiek en tabel, met graaddagen en het ongecorrigeerde verbruik van vorig jaar ernaast.
- Dagen met een temperatuur die in de vergelijkingsperiode niet voorkwam tellen niet mee; dat staat er dan bij.

## 1.16.0

**Toegevoegd**
- **Stooklijn: gas tegen buitentemperatuur** als soort analyse. Elke dag is een stip (gasverbruik tegen de gemiddelde temperatuur), met de best passende lijn erdoor. Daaruit volgen drie kerncijfers: je vaste gasverbruik per dag (warm water, koken), de stookgrens (boven die temperatuur stookt de verwarming niet) en hoeveel m³ per dag er bij elke graad kouder bijkomt. Vergelijk twee stookseizoenen door de periode te wisselen.

## 1.15.0

**Toegevoegd**
- **Eigen verbruik: afname in de zonuren** als soort analyse. Een grafiek per uur van de dag toont je gemiddelde afname naast je teruglevering, zodat je ziet hoe ver die uit elkaar liggen.
- Drie kerncijfers: hoeveel stroom je afnam in uren dat je ook terugleverde, hoeveel kWh je per dag met je eigen zonnestroom had kunnen dekken door verbruik naar de zonuren te verschuiven (bijv. wasmachine, vaatwasser of de auto), en wat dat waard is na het einde van de saldering (en nu).
- Per maand in een tabel.

## 1.14.0

**Toegevoegd**
- **Wat als de saldering stopt (2027)** als soort analyse. Je echte verbruik over de gekozen periode wordt twee keer doorgerekend: met de huidige saldering en met de regeling vanaf 1-1-2027 (terugleververgoeding € 0,081 en terugleverkosten € 0,066 per kWh, geen vaste terugleverkosten meer). Je ziet het verschil in totaal, gemiddeld per maand, en per maand in een grafiek en tabel.
- Onder de tabel staat waar het verschil vandaan komt: wat je afname kost, wat je teruglevering oplevert, de terugleverkosten en de vaste terugleverkosten die vervallen.

## 1.13.0

**Toegevoegd**
- **Soort analyse** bovenaan Analyse: naast "Zelf samenstellen" kun je nu kant-en-klare analyses kiezen. Ook die kun je als favoriet bewaren.
- **Heatmap: uur van de dag × datum.** Elke rij is een dag, week of maand (afhankelijk van de lengte van de periode), elke kolom een uur van de dag. Hoe donkerder het vakje, hoe meer stroom je in dat uur afnam of terugleverde. Bij "netto" zie je in twee kleuren wanneer je per saldo afnam (oranje) en wanneer je terugleverde. Tik op een vakje voor de waarde.

## 1.12.0

**Toegevoegd**
- **Per dag van de week** als indeling in Analyse: het gemiddelde verbruik (of de gemiddelde kosten) per maandag, dinsdag, … zondag over de gekozen periode. In de tabel staan daarnaast Werkdagen en Weekend, zodat je direct ziet of je in het weekend meer of minder gebruikt. Werkt met alle grootheden behalve zonne-opbrengst (die is alleen per maand bekend), ook in combinatie met vorig jaar of een tweede grootheid.

**Verbeterd**
- Grafieken met weinig staven (zoals de 7 dagen van de week) tonen nu onder elke staaf een label, ook op de iPhone.

## 1.11.0

**Toegevoegd**
- **Piekvermogen** in Analyse (Wat → Verbruik), in twee varianten: de zwaarst belaste fase, en de drie fasen samen. Per week, maand of jaar zie je de hoogste piek in die periode, met een rode stippellijn voor wat je aansluiting (3×25 A) continu aankan: 5.750 W per fase. Onder de tabel staat wanneer de hoogste piek was.
- De pieken komen uit de HomeWizard-export (kolommen L1/L2/L3 max W). **Lees je HomeWizard-export opnieuw in** om de pieken van eerdere dagen te krijgen; de rest van je gegevens verandert daardoor niet.
- In Historie staat bij een dag het piekvermogen per fase en het tijdstip van de hoogste piek.
- Het importrapport toont hoeveel dagen piekvermogen zijn ingelezen.

## 1.10.0

**Toegevoegd**
- **Sluipverbruik** in Analyse (Wat → Verbruik): het "altijd-aan" verbruik van je huis in watt. Per dag is dat het laagste uurverbruik tussen 00:00 en 05:00, als de zon zeker niet schijnt. Per week, maand of jaar is het de mediaan van de dagen, zodat één nacht met bijvoorbeeld de auto aan de lader het getal niet omhoog trekt.
- Onder de tabel staat wat dat sluipverbruik per jaar betekent in kWh en in euro's (tegen het gemiddelde stroomtarief inclusief energiebelasting).
- Alleen dagen met uurgegevens (Vattenfall of HomeWizard) tellen mee; dagen uit de Excel hebben geen uren.

## 1.9.4

**Verbeterd**
- **Duidelijkere kleuren per jaar** in alle grafieken. Vorig jaar is nu oranje in plaats van lichtgrijs, naast dit jaar in de accentkleur (groenblauw). Bij Zonnepanelen hebben de jaren vier goed te onderscheiden kleuren: nieuwste groenblauw, dan oranje, indigo en magenta. Het lichte deel van de zon-kolommen is iets voller, zodat ook daar de kleur van het jaar herkenbaar blijft.

## 1.9.3

**Gecorrigeerd**
- **Vaste terugleverkosten per dag** worden nu verdeeld zoals Vattenfall dat doet: per maand een twaalfde van het jaarbedrag, gedeeld door het aantal dagen van die maand. In oktober is dat € 1,24 per dag (was € 1,27), in februari € 1,38. Over een heel jaar blijft het totaal gelijk (€ 462).

## 1.9.2

**Verbeterd**
- Bij **Naast elkaar** en **Alles tegelijk** zijn kaarten in dezelfde rij nu even hoog, en titels, grafieken en toelichtingen staan naast elkaar op één lijn (ook als één kaart extra knoppen heeft, zoals de jaren bij Zonnepanelen).
- Alle grafieken in twee kolommen zijn even hoog.
- Een kaart die alleen in de laatste rij staat (bijv. Zonnepanelen bij Naast elkaar) loopt over de hele breedte, met een grafiek op die breedte in plaats van een uitgerekte.
- Termijnen en werkelijke kosten staat altijd over de hele breedte onderaan.

## 1.9.1

**Gewijzigd**
- De **indeling kies je nu op het Overzicht zelf**: rechts naast de titel staat "Indeling" met Eén kolom, Naast elkaar, Grafiek en lijst en Alles tegelijk. De keuze is weg uit Instellingen.
- Die knoppen verschijnen alleen op een breed scherm (vanaf 1200 pixels); op iPhone en iPad zie je ze niet.

## 1.9.0

**Toegevoegd**
- **Indeling van het Overzicht op de laptop** kiezen (in 1.9.1 verplaatst naar het Overzicht zelf):
  - **Eén kolom**: zoals voorheen (en zoals op de iPhone).
  - **Naast elkaar**: kaarten in twee kolommen over de volle breedte.
  - **Grafiek en lijst**: in elke kaart de grafiek met de lijst met getallen ernaast (de knop Grafiek/Lijst vervalt).
  - **Alles tegelijk**: Stroom, Terug, Gas en Kosten als vier grafieken in twee kolommen; de keuze Stroom/Terug/Gas/Kosten vervalt.
- De keuze geldt per apparaat en alleen bij een venster vanaf 1200 pixels breed; op iPhone en iPad in staande stand verandert niets. Bij een brede indeling mag de inhoud breder worden (tot 1640 pixels).
## 1.8.0

**Gewijzigd**
- **Grafiek Zonnepanelen vernieuwd**: per maand één kolom voor de opbrengst, met daarin (fel gekleurd, onderin) wat je zelf gebruikt hebt. Het percentage zelfvoorzienendheid staat klein boven de kolom; de oranje lijn en de tweede as zijn weg.
- De grafiek loopt nu van januari t/m december.

**Toegevoegd**
- **Jaren vergelijken bij Zonnepanelen**: tik op de jaartallen boven de grafiek om jaren aan of uit te zetten (hoogstens 4 tegelijk, standaard de laatste twee). Elk jaar heeft een eigen kleur; het nieuwste jaar de accentkleur. Ook de Lijst toont de gekozen jaren.
- Bij oudere jaren zonder stroomgegevens zie je alleen de opbrengst.

## 1.7.0

**Toegevoegd**
- Elke grafiekkaart in het **Overzicht** (verbruik/kosten, gas per graaddag, zonnepanelen) heeft rechtsboven een knop **Grafiek | Lijst**. De keuze wordt per kaart onthouden op dit apparaat.
- **Zonnepanelen als grafiek**: staven voor opbrengst en zelf gebruikt per maand, met zelfvoorzienendheid als lijn (percentage op de as rechts). De tabel blijft beschikbaar via Lijst.
- In de lijst van verbruik en gas per graaddag staan vorig jaar en het verschil in procenten; de lopende periode krijgt "loopt nog" en geen verschil (een halve maand tegen een hele maand vergelijken zegt niets).

**Gewijzigd**
- Op de iPhone staat onder grafieken minder labels (om de week/maand), zodat ze niet meer tegen elkaar aan staan.

## 1.6.0

**Toegevoegd**
- Nieuw scherm **Analyse**: stel zelf een grafiek en tabel samen.
  - Kies wat je wilt zien: stroom (afname, teruglevering, netto), gas, kosten (totaal, stroom, gas, vast), temperatuur, graaddagen, gas per graaddag of zonne-opbrengst.
  - Indeling per dag, week, maand of jaar, per uur van de dag (gemiddeld) of per tijdvak (zomer/winter, normaal/dal, nacht).
  - Periode met snelknoppen (laatste 12 maanden, dit jaar, vorig jaar, alles) of eigen datums.
  - Vergelijken met dezelfde periode vorig jaar, een andere periode, of een tweede grootheid als lijn met een eigen as (bijv. gas en temperatuur).
  - Tabel met totaalregel, verschil en percentage; te downloaden als CSV voor Excel.
  - Bewaar een analyse als favoriet; favorieten worden gesynchroniseerd tussen je apparaten.

**Gewijzigd**
- **Eén plek voor Instellingen**: het tandwiel rechtsboven is weg. Alles staat onder Instellingen, verdeeld over Tarieven, Gegevens (export, temperatuurlocatie, back-up) en App en sync (GitHub-koppeling, Face ID, wachtwoord, versie, apparaat wissen). Op laptop, iPad en iPhone op dezelfde plek.
- Tikken op het wolkje zonder koppeling opent nu Instellingen → App en sync.

**Let op**
- Nieuwe gegevensversie (voor de favorieten). Een apparaat met een oudere versie vraagt na het synchroniseren om bij te werken; open de app daar even zodat hij zich bijwerkt.

## 1.5.0

**Gewijzigd**
- Eén plek om bestanden in te lezen: Invoer → Bestanden inlezen. Kies een of meer bestanden van Vattenfall, HomeWizard of SolarEdge, of je oude Excel; de app herkent zelf welk bestand het is.
- Bij verschillen gaat Vattenfall voor, dan HomeWizard, dan Excel, dan wat je zelf invult. De zonne-opbrengst komt alleen uit SolarEdge en gaat voor Excel en handmatig. Dit staat uitgelegd onder "Welke gegevens gaan voor bij verschillen?".
- De aparte SolarEdge-knop onder Maandgegevens en de Excel-knop in Instellingen zijn weg; alles gaat via de ene knop.

## 1.4.1

**Gewijzigd**
- Uitleg "Hoe exporteer ik uit SolarEdge?" noemt nu het SolarEdge Monitoring platform bij naam.

## 1.4.0

**Toegevoegd**
- Zonne-opbrengst inlezen uit de SolarEdge-export (monitoringportaal, CSV met de opbrengst per maand). Bij Invoer → Maandgegevens staat een knop met uitleg; het bestand kan ook via "Export inlezen" gekozen worden.
- SolarEdge gaat voor: een eerder ingevulde opbrengst (uit Excel of met de hand) wordt overschreven. Het importrapport toont per jaar de opbrengst, welke maanden zijn overgeslagen (vóór de installatie, en de lopende maand die nog niet compleet is), maanden met 0 kWh, en de maanden waar de oude waarde afweek.
- De SolarEdge-import staat in Historie → Controle bij de imports en is ongedaan te maken; dan komen de eerdere waarden terug.

**Opgelost**
- Het Vattenfall-importbestand ontbrak in de offline-opslag, waardoor de app zonder internet niet kon starten.

## 1.3.4

**Gewijzigd**
- Historie → Dagen: het maandtotaal staat nu als vetgedrukte eerste regel in de tabel, net als de jaartotalen in Maanden, met dezelfde afronding (kWh 1 decimaal, m³ 2 decimalen). De lichte regel boven de tabel is weg. Onder m³/gd staat de maandwaarde (totaal gas ÷ totaal graaddagen), onder °C het maandgemiddelde.

## 1.3.3

**Opgelost**
- In Historie → Dagen stond het woord "null" boven de tabel als er geen dag was aangetikt. Lege onderdelen worden nu overgeslagen (geldt voor alle schermen).

## 1.3.2

**Toegevoegd**
- Logo, app-naam en versienummer bovenin de zijbalk op de laptop, zoals in Vaste Lasten. Bij een ingeklapte zijbalk blijft alleen het logo staan.
- Op iPhone en iPad staan logo, naam en versienummer links in de kopbalk.

**Gewijzigd**
- De zijbalk op de laptop is iets breder (256 px), zodat de naam "Energieverbruik" er helemaal in past.

## 1.3.1

**Gewijzigd**
- De grafiek Gas per graaddag in het Overzicht volgt nu de gekozen periode (Dag, Week, Maand of Jaar), net als de andere grafiek. Eerst was die altijd per maand. Vergelijking met vorig jaar zoals bij de andere grafiek.
- Een periode met te weinig graaddagen wordt overgeslagen (dag: minder dan 1, week: minder dan 3, maand en jaar: minder dan 5), omdat delen door een heel kleine graaddag grote uitschieters geeft.

## 1.3.0

Gas per graaddag per dag.

**Toegevoegd**
- Historie → Dagen heeft een kolom m³/gd: het gasverbruik gedeeld door de gewogen graaddag van die dag, zoals de kolom m3/graaddag in de Excel. Op dagen zonder graaddag (te warm om te stoken) staat er –.
- Bij het openen van een dag staat gas per graaddag achter de temperatuur en graaddag.
- Boven de dagtabel staat ook het gas per graaddag van de hele maand.
- De CSV-export heeft een extra kolom `gas_per_graaddag`.

## 1.2.0

Vattenfall-download inlezen.

**Toegevoegd**
- De CSV-bestanden uit Mijn Vattenfall zijn in te lezen: stroom per kwartier, gas per uur, of beide per dag. De app herkent zelf of een bestand van Vattenfall of HomeWizard komt; je kunt ze door elkaar kiezen.
- Uitleg in Invoer: hoe download ik bij Vattenfall?

**Gewijzigd**
- Voorrang tussen bronnen: Vattenfall gaat voor HomeWizard, HomeWizard gaat voor Excel. Een bestand overschrijft nooit een dag uit een betere bron; het verschil wordt wel getoond in het importrapport.
- Bij een Vattenfall-dagbestand (zonder uurverdeling) neemt de app de uurverdeling van HomeWizard over, geschaald naar het Vattenfall-dagtotaal, zodat de kosten per tijdvak exact blijven.
- Het importrapport toont bij verschillen met een ✓ welke waarde is aangehouden, en hoe vaak een betere bron voorging.

## 1.1.0

Controle van ingelezen gegevens.

**Toegevoegd**
- Importrapport direct na het inlezen van een HomeWizard-export of het Excel-bestand: hoeveel dagen nieuw, bijgewerkt of gelijk zijn, wat er is overgeslagen en waarom (met voorbeelden), totalen per jaar, en hoeveel controlemeldingen er in die periode zijn.
- Bij dagen die al gegevens hadden, vergelijkt de app de oude en nieuwe waarde (bijvoorbeeld Excel tegenover HomeWizard) en toont de verschillen.
- Historie heeft nu drie weergaven: Dagen, Maanden en Controle.
- Maanden: totalen per maand en per jaar, om naast een SOM in je Excel te leggen, met het aantal dagen dat er gegevens zijn.
- Controle: verdachte waarden (negatief, veel hoger dan de dagen eromheen, veel gas voor de temperatuur, teruglevering 's nachts, reeksen nullen, uurwaarden die niet optellen), ontbrekende dagen per soort, een steekproef om met de hand te vergelijken en een vergelijking met je jaarafrekening of meterstanden.
- Meldingen afvinken met "Klopt, niet meer melden". Verandert de waarde later, dan komt de melding terug.
- In de dagtabel staat ⚠ bij dagen met een melding; bij de dag zelf staat de uitleg.
- Elke import staat in een logboek en de laatste 10 zijn ongedaan te maken. Waarden die je daarna zelf hebt aangepast of opnieuw hebt ingelezen, blijven dan staan.

**Gewijzigd**
- Per dag is zichtbaar uit welke bron stroom en gas komen (HomeWizard, Excel of handmatig).
- Het Excel-bestand meldt nu ook regels zonder geldige datum, cellen met tekst in plaats van een getal en dubbele datums.

## 1.0.0

Eerste versie van Energieverbruik.

**Toegevoegd**
- Vier schermen: Overzicht, Invoer, Historie en Instellingen. Op iPhone en iPad een tabbalk onderin, op de laptop een inklapbare zijbalk links.
- HomeWizard-export inlezen (stroom en gas, per kwartier). De app rekent de meterstanden om naar verbruik per uur en per dag. Ontbrekende metingen worden over de tussenliggende uren verdeeld; een onvolledige laatste dag wordt overgeslagen.
- Eenmalige import van het Excel-bestand: dagverbruik, opmerkingen, temperaturen, termijnbedragen en zonne-opbrengst. HomeWizard-gegevens gaan voor.
- Dag handmatig invullen, met opmerking. Maandgegevens: zonne-opbrengst en termijnbedrag.
- Kostenberekening met de 6 tijdvakken van het Vattenfall-contract, vaste kosten per dag, saldering tot 1-1-2027 en teruglevering per kWh daarna. Tarieven per contract met geldigheidsperiode.
- Overzicht met kerncijfers en grafieken per dag, week, maand en jaar, vergeleken met vorig jaar.
- Gas per graaddag (18 °C, gewogen per seizoen), met automatisch opgehaalde temperaturen (Open-Meteo).
- Zelfvoorzienendheid per maand en verwachte eindafrekening (termijnen tegenover berekende kosten).
- Historie per dag met ontbrekende dagen gemarkeerd; tik op een dag om te corrigeren of een opmerking toe te voegen.
- Export als CSV (Excel) en JSON.
