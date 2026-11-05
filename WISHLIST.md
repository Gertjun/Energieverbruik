# Wishlist

Voorgestelde functies. Zodra iets gebouwd is, verdwijnt het hier en staat het in CHANGELOG.md.

- **HomeWizard P1 automatisch uitlezen**: eerst onderzoeken of dit vanaf GitHub Pages kan
  (https-site ↔ dongle op het thuisnetwerk zonder geldig certificaat).
- **SolarEdge-opbrengst automatisch ophalen** in plaats van per maand invoeren.
- **Historie → Dagen: maandtotaal even nauwkeurig als Maanden**: de regel boven de dagtabel toont nu
  afgeronde getallen (658 kWh, 187 kWh, 32,3 m³), terwijl Maanden 658,4 / 186,6 / 32,31 toont. Zelfde
  afronding gebruiken (kWh 1 decimaal, m³ 2 decimalen), zodat beide weergaven exact overeenkomen.
- **SolarEdge-opbrengst importeren uit een bestand**: export uit het SolarEdge-monitoringportaal inlezen
  (per dag of kwartier), zodat de opbrengst niet meer per maand ingetypt hoeft te worden. Nodig: een
  voorbeeldexport van Geert om het formaat te kennen.
- **Nieuw hoofdscherm Analyse** (naast Overzicht, Invoer, Historie, Instellingen): zelf grafieken en tabellen
  samenstellen door keuzes te maken, bijv. welke gegevens (stroom, terug, gas, kosten, temperatuur, m³/gd,
  opbrengst), welke periode, per dag/week/maand/jaar, en vergelijken met vorig jaar. Eerst samen de
  gewenste keuzes uitwerken.
- **Eén plek voor Instellingen**: nu zijn er twee (tab Instellingen voor tarieven e.d., en het tandwiel voor
  sync/GitHub/kluis). Samenvoegen tot één scherm Instellingen met secties, op laptop, iPad en iPhone op
  dezelfde plek. Raakt het template-deel (shell.js); nagaan hoe Vaste Lasten/Crypto Portfolio dit doen.
- **Kleuren kiezen**: accentkleur (en eventueel licht/donker/automatisch) instelbaar in Instellingen, bewaard
  per apparaat.
