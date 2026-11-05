# Beslissingen

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
