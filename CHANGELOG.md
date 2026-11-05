# Changelog

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
