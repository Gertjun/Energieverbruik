# Roadmap – wat moet of kan er nog gebeuren

> **Dit bestand (toekomst):** alles wat nog moet of kan gebeuren: wensen, acties en controles voor Geert, en technische aandachtspunten. Het is de enige takenlijst.
> **Niet hier:** wat al gebouwd is → [`CHANGELOG.md`](CHANGELOG.md); waarom → [`DECISIONS.md`](DECISIONS.md); de stand van nu → [`README.md`](README.md); hoe het in elkaar zit → [`ARCHITECTUUR.md`](ARCHITECTUUR.md).

Bijgewerkt: 20 november 2026 · versie 1.45.5

Elk punt houdt zijn vaste W-nummer (W1, W2, …); een nummer wordt nooit opnieuw gebruikt. Is een punt klaar, dan haal je het hier weg (bij een nieuwe functie zet je het nummer in de changelog bij de versie).

## Wensen
- W1 **HomeWizard P1 automatisch uitlezen** — Eerst onderzoeken of dit vanaf GitHub Pages kan (https-site ↔ dongle op het thuisnetwerk zonder geldig certificaat).
- W2 **Zonne-opbrengst per kwartier** — De SolarEdge-export per kwartier bewaren (nu per dag opgeteld), zodat zelf gebruikt per kwartier exact is en "Eigen verbruik in de zonuren" de echte opbrengst kan gebruiken.
- W3 **Batterij slim laden** — In de simulatie Thuisbatterij ook laden met goedkope nachtstroom of op lage beursprijzen (nu alleen laden met eigen zonnestroom).
- W4 **Dynamisch contract met verschuiven** — Uitrekenen wat een dynamisch contract oplevert als je verschuifbaar verbruik (auto, was) naar de goedkoopste uren van de dag zet.
- W5 **Aansluiting instelbaar** — Nu vast 3×25 A in `analyse.js` (`AANSLUITING`); handig als er een laadpaal of warmtepomp bij komt.
- W6 **Passkey-hergebruik naar de template en andere apps** — De aanpassing van 1.43.2 (js/core) ook in de PWA-template, Crypto Portfolio, Vaste Lasten, MW4 Camo Tracker en Games Backlog zetten.

## Acties en controles voor Geert
Overgenomen uit de oude notities (5 tot en met 19 november 2026). Een deel is waarschijnlijk al gedaan; wat klaar is, mag weg.

- W7 Geert heeft geen beheerdersaccount bij SolarEdge (nodig voor de API-sleutel). Installateur vragen om zijn account beheerder te maken of de sleutel aan te maken. Tot die tijd doet de Action niets (geen foutmail).
- W8 Geert: SolarEdge-API-sleutel aanmaken, als geheim `SOLAREDGE_API_KEY` in SyncData zetten en de Action één keer met de hand starten (uitleg op Invoer). Daarna in de app kijken of de opbrengst binnenkomt en of het importrapport klopt met eerdere SolarEdge-exports.
- W9 Geert: pijltjes op het Overzicht bekijken op iPhone/iPad; stap van één periode prettig, of liever een heel scherm tegelijk?
- W10 Geert: na het bijwerken alle apparaten eenmaal openen (gegevensversie 5, opbrengst per dag).
- W11 Geert: SolarEdge-export per dag inlezen voor de periode die hij wil (bijv. vanaf november 2025, gelijk met de HomeWizard-data); per maand of per jaar exporteren kan allebei. Precieze menunaam doorgeven voor de uitleg.
- W12 Geert: kaart Zonnepanelen bij Dag en Week bekijken op iPhone/iPad.
- W13 Geert: Zwart bekijken op de iPhone; kaarten genoeg te onderscheiden van de achtergrond?
- W14 Geert: thema's bekijken op iPhone/iPad/laptop; kleuren naar wens? Kleurt de statusbalk mee?
- W15 Geert: tegels voor Soort analyse bekijken op iPhone/iPad; prominent genoeg, niet te veel ruimte?
- W16 Geert: HomeWizard-export (stroom) opnieuw inlezen, zodat ook eerdere dagen piekvermogen krijgen (1.11.0).
- W17 Geert: na het bijwerken alle apparaten eenmaal openen (gegevensversie 4, uitgesloten perioden).
- W18 Geert: aug–sep 2025 (huis leeg) toevoegen bij Analyse → Uitgesloten perioden.
- W19 Geert: nieuwe analyses bekijken op iPhone, iPad en laptop; vooral heatmap (leesbaar?) en jaarprognose (klopt de verwachte eindafrekening met wat hij verwacht?).
- W20 Geert: nieuwe jaarkleuren bekijken op iPhone en laptop; bevallen ze?
- W21 Geert stuurt Vattenfall-dagkosten van een paar doordeweekse dagen (zonnig en somber, bijv. 26, 27, 29, 30 okt, 2 en 3 nov) om het verschil op 28-10 (€ 0,46 stroom) te verklaren.
- W22 Geert: de vier indelingen op de laptop bekijken en er één kiezen; de andere eventueel later weer weghalen.
- W23 Geert: Overzicht op iPhone/iPad bekijken; past de lijst (4 kolommen) en is de zon-grafiek leesbaar?
- W24 Geert: Analyse en Instellingen bekijken op iPhone en iPad. Na het bijwerken eenmaal alle apparaten openen (gegevensversie 3).
- W25 Geert: Historie op de iPhone bekijken; past de dagtabel met de kolom m³/gd? (°C valt daar al weg.)
- W26 Geert: Vattenfall-bestanden inlezen (kwartier/uur). Daarna HomeWizard alleen nog voor de laatste dagen.
- W27 Geert: na het inlezen Historie → Controle doorlopen, Maanden naast de Excel leggen en de jaarafrekening invullen bij "Vergelijken".
- W28 Geert: kluis aanmaken, sync koppelen (`gertjun/SyncData`, pad `energieverbruik/vault.json`), Face ID aan, HomeWizard-bestanden en Excel inlezen.
- W29 Geert: SolarEdge-export inlezen (Invoer → Bestanden inlezen); maandelijks herhalen na de 1e.

## Technische aandachtspunten
- W30 Als de Action faalt met 403: sleutel of site-ID controleren; eventueel `SOLAREDGE_SITE_ID` als geheim toevoegen.
- W31 Stooklijn en gas weer-gecorrigeerd nakijken met echte temperaturen (in de test nagemaakt na 5-7-2026).
- W33 HomeWizard-export per dag (in plaats van kwartier) wordt nu als "gat" gelezen en vlak over de uren verdeeld. Nagaan of dat voorkomt; zo ja, als dagbestand behandelen zoals bij Vattenfall.
- W34 Imports van vóór 1.1.0 hebben geen rapport en zijn niet ongedaan te maken (wel gecontroleerd).
- W35 Controleren of temperaturen automatisch verschijnen (Historie → tik op een dag).
- W36 Tarieven nalopen: de app start met de tarieven van de tariefkaart, geldig vanaf 1-1-2025. De oudere tarieven uit Blad1 (linkerkolom) zijn niet ingevoerd; als die voor een eerdere periode gelden, een extra contract met de juiste data toevoegen.
- W37 Saldering met tijdvakken is een aanname (zie DECISIONS.md); vergelijken met de volgende jaarafrekening.

Volgende vrije nummer: W38.
