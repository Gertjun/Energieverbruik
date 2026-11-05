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

## Openstaande punten
- [ ] Geert: na het inlezen Historie → Controle doorlopen, Maanden naast de Excel leggen en de jaarafrekening
      invullen bij "Vergelijken".
- [ ] Imports van vóór 1.1.0 hebben geen rapport en zijn niet ongedaan te maken (wel gecontroleerd).
- [ ] Geert: kluis aanmaken, sync koppelen (`gertjun/SyncData`, pad `energieverbruik/vault.json`),
      Face ID aan, HomeWizard-bestanden en Excel inlezen.
- [ ] Controleren of temperaturen automatisch verschijnen (Historie → tik op een dag).
- [ ] Tarieven nalopen: de app start met de tarieven van de tariefkaart, geldig vanaf 1-1-2025. De oudere
      tarieven uit Blad1 (linkerkolom) zijn niet ingevoerd; als die voor een eerdere periode gelden,
      een extra contract met de juiste data toevoegen.
- [ ] Saldering met tijdvakken is een aanname (zie DECISIONS.md); vergelijken met de volgende jaarafrekening.

## Bronbestanden in het Claude-project
- `Gasverbruik.xlsx`: blad DATA (per dag), blad Kosten (per maand: termijn €243, SolarEdge-opbrengst),
  blad Blad1 (jaarafrekening-schatting per tijdvak).
- `Energietarieven.png` en `Gastarieven.png`: Vattenfall-tarieven (6 tijdvakken).
- HomeWizard-exports `P1e-…csv` (stroom) en `P1g-…csv` (gas): kolommen `time, Import T1 kWh, Import T2 kWh,
  Export T1 kWh, Export T2 kWh, L1/L2/L3 max W` en `time, Total gas used`; meterstanden per kwartier,
  lokale tijd (bij wintertijd komt 02:00–02:45 twee keer voor).
