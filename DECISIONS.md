# Beslissingen

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
- **Termijnen vs kosten**: over de laatste 12 maanden met een ingevuld termijnbedrag; schatting.
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
