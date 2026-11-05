# Changelog

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
