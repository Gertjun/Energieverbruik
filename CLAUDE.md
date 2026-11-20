# CLAUDE.md – werkafspraken voor Claude

Dezelfde afspraken gelden voor al Geerts apps en projecten (Cryptotracker, Vaste Lasten, Energieverbruik, Games Backlog, MW4 Camo Tracker en de PWA-template).

## Aan het begin van een sessie
1. Lees het blok **Stand** in **`README.md`**, **`ROADMAP.md`** (wat er nog moet), **`DECISIONS.md`** (eerdere besluiten) en alleen de bovenste paar versies van **`CHANGELOG.md`**. Lees niet de volledige chatgeschiedenis.
2. Lees daarna `js/config.js` en `js/app.js`, en `js/core/` alleen als je het nodig hebt. De volledige werkwijze staat in `docs/CLAUDE-INSTRUCTIES.md` van de PWA-template (`Gertjun/PWA-Template`).
3. Koppel de GitHub-repository met schrijfrechten en haal de laatste versie op (`git fetch origin main`).

## Tijdens het werk
- **Taal en uitleg:** Nederlands, kort en zonder vakjargon. Alle teksten in de app zijn ook Nederlands.
- **"Hoe zou je…" of "nog niet bouwen":** eerst uitleggen en wachten op akkoord.
- **Elke wijziging is een eigen versie** (`MAJOR.MINOR.PATCH`):
  - MAJOR als Geert iets moet doen (opnieuw koppelen, alle apparaten tegelijk bijwerken);
  - MINOR voor een nieuwe functie;
  - PATCH voor een kleine verbetering of foutoplossing.
  - **Versie** in `js/config.js` (`version`) én `sw.js` (`VERSION`) gelijk ophogen.
  - **`CHANGELOG.md`** bijwerken in gewone taal, met de nummers van de roadmappunten die erin zijn gebouwd. Die punten haal je weg uit **`ROADMAP.md`**.
- **Testen vóór elke push**, daarna rechtstreeks naar `main` (geen force-push, geschiedenis niet herschrijven). Gaat er iets mis: `git revert` en pushen.
- **`js/core/` en `css/base.css` zijn gedeeld** met al Geerts template-apps (PWA-template, MW4 Camo Tracker, Games Backlog, Energieverbruik). Wijzig ze alleen generiek, en zet de wijziging daarna ook in de template en de andere apps, zodat de kern overal gelijk blijft.
- Ga je in tegen een besluit uit `DECISIONS.md`? Zeg dat en vraag het eerst.
- Nooit iets doen met de data-repository of tokens.
- `DECISIONS.md` heeft in deze app een eigen opbouw (per datum, nieuwste bovenaan). Voeg nieuwe besluiten bovenaan toe in dezelfde stijl.

## Aan het eind van een sessie (altijd)
1. Het blok **Stand** in **`README.md`** overschrijven met de stand van nu (versie, wat is getest, bekende problemen). Geen sessielog: de geschiedenis staat in `CHANGELOG.md`. Nieuwe taken en open vragen met een nummer in **`ROADMAP.md`**, klare punten eruit.
2. **`DECISIONS.md`**: een nieuw `D<n>`-besluit voor elke keuze die een volgende sessie moet kennen. Oude besluiten pas je niet aan; een nieuw besluit vervangt een oud ("vervangt D3").
3. Push naar `main`.
