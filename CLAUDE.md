# CLAUDE.md – werkafspraken voor Claude (Energieverbruik)

Deze afspraken horen bij de projectinstructies van het Claude-project "Energieverbruik" en gelden in dezelfde vorm voor al Geerts apps. Zeggen de projectinstructies iets anders dan dit bestand of `DECISIONS.md`: meld het en vraag welke geldt.

## Begin van een sessie
1. Lees het blok **Stand** in `README.md`, `ARCHITECTUUR.md`, `ROADMAP.md` en `DECISIONS.md`, en van `CHANGELOG.md` alleen de bovenste versies. Lees niet de oude chats.
2. Lees daarna alleen de code die je voor de vraag nodig hebt (meestal `js/config.js`, `js/app.js` en de betrokken bestanden in `js/energie/`).
3. `git fetch origin main` en maak vanaf `main` een branch `claude/<korte-naam>`.

## Tijdens het werk
- **Taal:** Nederlands, kort en in gewone taal. Alle teksten in de app zijn Nederlands.
- **"Hoe zou je…" of "nog niet bouwen":** eerst uitleggen en wachten op akkoord.
- **Eerst vragen** als een wijziging bestaande gegevens raakt, het datamodel verandert, de gedeelde kern raakt of ingaat tegen een besluit in `DECISIONS.md`.
- **PWA-Core:** bestanden uit `core-manifest.json` (`js/core/*`, `css/base.css`) pas je hier niet aan. Een fix hoort in `Gertjun/PWA-Core`; meld het.
- **Vaste regels** (datamodel en grafstenen, gegevensversie, CSP en externe diensten, service worker, bestanden aanbieden, stijl): zie `ARCHITECTUUR.md`.
- Ideeën buiten de taak: voorstellen en op `ROADMAP.md` zetten met het volgende vrije W-nummer, niet ongevraagd bouwen.
- Nooit: force-pushen, de geschiedenis herschrijven, branches verwijderen, of iets doen met de data-repository (`gertjun/SyncData`) of tokens.

## Testen (vóór elke push, nooit iets pushen wat niet groen is)
```bash
npm install
npm run test:unit          # unit- en contracttests
npm run test:e2e           # Playwright: de app start zonder fouten
node tools/pin.mjs verify  # PWA-Core-kopie klopt met de pin
node tools/precache.mjs    # service worker bevat de kernbestanden
```
- Geen automatische test voor het onderdeel: open de app in een headless browser op telefoon- (390 × 844) en laptopformaat (1440 × 900), in licht en donker, en controleer dat hij start, dat de console geen fouten toont en dat de wijziging werkt.
- Raakt de wijziging gegevens of synchronisatie: test ook vergrendelen en ontgrendelen, synchroniseren tussen twee apparaten (ook een gelijktijdige wijziging), twee tabbladen tegelijk, en gegevens van de vorige versie laden.
- Groene tests zijn geen apparaattest: noem in de pull request wat Geert op zijn telefoon moet controleren.

## Pull request en akkoord
1. Push de branch (`git push -u origin claude/…`), open een pull request naar `main` en controleer dat de tests op GitHub groen zijn.
2. Meld Geert in gewone taal wat er verandert en wacht op zijn akkoord. Nooit mergen of een versie uitbrengen zonder dat akkoord.
3. Alleen documenten gewijzigd: geen nieuwe appversie, wel via een pull request.

## Versie uitbrengen (na akkoord)
- Versienummer `MAJOR.MINOR.PATCH`: MAJOR als Geert iets moet doen (alle apparaten bijwerken, opnieuw koppelen), MINOR voor een nieuwe functie, PATCH voor een verbetering of foutoplossing.
- Verhoog `version` in `js/config.js` en `VERSION` in `sw.js` gelijk. Nieuwe bestanden staan in `PRECACHE` in `sw.js`.
- Zet de versie bovenaan in `CHANGELOG.md`, in gewone taal en met de W-nummers die erin zijn gebouwd; haal die punten weg uit `ROADMAP.md`.
- Eén commit per versie met een korte Nederlandse boodschap die zegt wat er voor Geert verandert, bijvoorbeeld "Volglijst sorteren via kolomkoppen (3.17.0)". Merge daarna naar `main`.
- Na het mergen: meld wat er veranderd is, het nieuwe versienummer, nieuwe bestanden of mappen, en wat Geert op zijn telefoon kan controleren ("open de app, tik op 'update beschikbaar' en kijk of …").
- Gaat er na het mergen iets mis (ook rode tests op GitHub): meld het meteen, zet een `git revert` klaar als pull request en zoek daarna rustig de oorzaak.

## Einde van een sessie (altijd)
1. Overschrijf het blok **Stand** in `README.md` (datum, versie, wat is getest, bekende problemen). Geen sessielog: de geschiedenis staat in `CHANGELOG.md`.
2. `ROADMAP.md`: nieuwe taken en open vragen met een vast W-nummer, klare punten eruit.
3. `DECISIONS.md`: onderaan een nieuw besluit `D<n>` voor elke keuze die een volgende sessie moet kennen. Oude besluiten pas je niet aan; een nieuw besluit kan een oud vervangen ("vervangt D12").
4. `ARCHITECTUUR.md` bijwerken als opbouw, datamodel, conventies of stijl veranderen.
5. Zet dezelfde versies van README, ARCHITECTUUR, ROADMAP en DECISIONS in de projectkennis van het Claude-project (`claude/README.md`, `claude/ARCHITECTUUR.md`, `claude/ROADMAP.md`, `claude/DECISIONS.md`).
