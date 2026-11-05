# Notities – stand van zaken

## Stand (5 november 2026)
- Repo ingesteld vanuit de PWA-template: naam "Energieverbruik", korte naam "Energie",
  kleur #0f766e, icoonletter E, storagePrefix `energieverbruik`, versie 1.0.0.
- De automatische setup-workflow ontbrak (map `.github` niet meegekomen); setup is
  handmatig gedraaid met `tools/setup.mjs`.
- `js/app.js` en `css/app.css` bevatten nog de demo van de template.
- GitHub Pages staat nog **uit** (Geert zet dit zelf aan).
- Voorstel voor datamodel, schermen en versie 1.0 is aan Geert voorgelegd; wacht op akkoord.

## Openstaande punten
- [ ] GitHub Pages aanzetten (Geert).
- [ ] Voorbeeld van een HomeWizard CSV-export ontvangen (kwartier, stroom én gas),
      zodat de import op het echte bestandsformaat gebouwd wordt.
- [ ] Akkoord op het voorstel in DECISIONS.md, daarna 1.0.0 bouwen.
- [ ] Sync instellen met data-repo `gertjun/SyncData`, pad `energieverbruik/vault.json`.

## Bronbestanden in het Claude-project
- `Gasverbruik.xlsx`: blad DATA (per dag: datum, E verbruik, E terug, gas, Tgem/Tmax/Tmin,
  graaddag, wegingsfactor, opmerking; gas vanaf 11-10-2025, stroom vanaf 3-6-2026),
  blad Kosten (per maand: kosten stroom/gas, termijn €243, SolarEdge-opbrengst,
  zelfvoorzienendheid), blad Blad1 (jaarafrekening-schatting per tijdvak).
- `Energietarieven.png` en `Gastarieven.png`: Vattenfall-tarieven (6 tijdvakken).
