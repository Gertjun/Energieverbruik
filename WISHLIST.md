# Wishlist

Voorgestelde functies. Zodra iets gebouwd is, verdwijnt het hier en staat het in CHANGELOG.md.

- **HomeWizard P1 automatisch uitlezen**: eerst onderzoeken of dit vanaf GitHub Pages kan
  (https-site ↔ dongle op het thuisnetwerk zonder geldig certificaat).
- **SolarEdge-opbrengst automatisch ophalen** in plaats van het bestand zelf te downloaden en in te lezen
  (SolarEdge heeft een API met sleutel; nagaan of dat vanaf GitHub Pages kan).
- **Zonne-opbrengst per dag**: een SolarEdge-export per dag inlezen, voor zelfvoorzienendheid per dag/week.
  Nodig: een voorbeeldexport per dag van Geert (hij zoekt uit of het SolarEdge Monitoring platform dit kan).
- **Nieuw hoofdscherm Analyse** (naast Overzicht, Invoer, Historie, Instellingen): zelf grafieken en tabellen
  samenstellen door keuzes te maken, bijv. welke gegevens (stroom, terug, gas, kosten, temperatuur, m³/gd,
  opbrengst), welke periode, per dag/week/maand/jaar, en vergelijken met vorig jaar. Eerst samen de
  gewenste keuzes uitwerken.
- **Eén plek voor Instellingen**: nu zijn er twee (tab Instellingen voor tarieven e.d., en het tandwiel voor
  sync/GitHub/kluis). Samenvoegen tot één scherm Instellingen met secties, op laptop, iPad en iPhone op
  dezelfde plek. Raakt het template-deel (shell.js); nagaan hoe Vaste Lasten/Crypto Portfolio dit doen.
- **Kleuren kiezen**: accentkleur (en eventueel licht/donker/automatisch) instelbaar in Instellingen, bewaard
  per apparaat.
- **Leveringscontract met start- en einddatum** (Instellingen): één contract als "map" boven de tarieven.
  Nu zijn er alleen tariefperiodes (geldig van/tot); dit voegt het contract zelf toe. Gegevens per contract:
  - Algemeen: leverancier, productnaam, vast of variabel, startdatum, einddatum (of onbepaalde tijd),
    opzegtermijn.
  - Aansluiting: EAN-code stroom en gas, netbeheerder, aansluitwaarde stroom (3x25) en gas (G6).
  - Betalen: termijnbedrag + vanaf wanneer, datum jaarafrekening (afrekenmoment).
  - Tarieven: één of meer tariefperiodes binnen het contract (bij variabel wijzigen die tussentijds), zoals nu.
  - Teruglevering: regeling (saldering / per kWh), vergoeding, terugleverkosten, ingangsdatum wijziging.
  - Eenmalig: welkomstbonus/cashback (wanneer verrekend).
  Gebruik in de app: melding X weken voor einddatum/opzegtermijn, termijnen vs kosten en verwachte
  eindafrekening per contractjaar, controle dat er geen dagen zonder tarief zijn. Eerst met Geert afstemmen
  welke velden hij echt wil.
