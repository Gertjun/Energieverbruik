# Changelog

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
