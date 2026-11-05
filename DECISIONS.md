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
