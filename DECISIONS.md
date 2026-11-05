# Beslissingen

## 2026-11-05 – Uitgangspunten
- **Invoer via HomeWizard CSV-export** (hoofdroute), handmatig invoeren als reserve.
  Reden: Geert tikte de dagwaarden over van de Vattenfall-website; de HomeWizard-export
  is nauwkeuriger, sneller en levert kwartierdata.
- **Kwartierdata wordt per dag opgeslagen als 24 uurwaarden** (afname en teruglevering).
  Reden: alle tijdvakgrenzen van het contract vallen op hele uren; 24 waarden per dag
  houdt de kluis klein en kosten kunnen later met een ander contract opnieuw berekend worden.
- **Kosten per tijdvak**: exact bij uurdata, geschat (en als schatting gemarkeerd) bij
  alleen dagtotalen. De dubbele meter (T1/T2) volgt een ander tijdschema dan het contract.
- **Seizoenen**: zomer = 1 april t/m 30 september, winter = 1 oktober t/m 31 maart.
- **Tijdvakken stroom** (Vattenfall):
  - Zomer normaal 00–12 en 16–24; zomer dal week 12–16 (ma–vr); zomer dal weekend 12–16 (za–zo).
  - Winter normaal 06–12 en 16–01; winter dal dag 12–16; winter dal nacht 01–06.
- **Tarieven met geldigheidsperiode**, zodat de wijziging per 1-1-2027 (einde saldering:
  vergoeding en kosten per kWh in plaats van vaste terugleverkosten) correct wordt verwerkt.
- **Temperatuur automatisch** voor Eindhoven via Open-Meteo (gratis, geen sleutel nodig).
  KNMI vraagt een API-sleutel. Graaddagen: basis 18 °C; weging 1,1 (nov–feb), 1,0 (mrt, okt),
  0,8 (apr–sep), zoals in de Excel.
- **Excel-import leest het .xlsx-bestand direct** (eigen lezer, geen externe library,
  conform de template-regels).
- **P1 automatisch uitlezen staat op de wishlist.** De dongle praat via het thuisnetwerk zonder
  geldig https-certificaat; vanaf een https-site (GitHub Pages) blokkeert de browser dat
  waarschijnlijk. Eerst onderzoeken.

## Voorstel datamodel (schema 1, wacht op akkoord)
- `dagen`: { id, datum, afname, terug, gas, afnameUur[24]?, terugUur[24]?, bron
  ('homewizard' | 'excel' | 'handmatig'), opmerking }
- `weer`: { id, datum, tgem, tmax, tmin } (automatisch opgehaald)
- `maanden`: { id, maand (yyyy-mm), zonOpbrengst (kWh), termijn (centen) }
- `contracten`: { id, naam, geldigVan, geldigTot?, stroom per tijdvak (levering, energiebelasting),
  gas per m³, vaste kosten per dag, vermindering energiebelasting per dag, netbeheer per dag,
  teruglevering (vergoeding per kWh, kosten per kWh of vast per jaar) }

## Voorstel schermen
- **Invoer**: HomeWizard-bestand inlezen, handmatige dag, opmerking, maandgegevens (zon, termijn).
- **Overzicht**: kerncijfers en grafieken per dag/week/maand/jaar, vergelijking met vorig jaar,
  gas per graaddag, zelfvoorzienendheid, verwachte eindafrekening.
- **Historie**: tabel per dag met verbruik, temperatuur en opmerkingen; ontbrekende dagen gemarkeerd.
- **Instellingen**: contracten/tarieven, Excel-import, export CSV/JSON, sync (template).
