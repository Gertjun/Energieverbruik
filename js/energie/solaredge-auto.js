// Zonne-opbrengst automatisch inlezen uit de data-repo.
//
// Een GitHub Action in de PRIVATE data-repo (SyncData) haalt elke nacht de opbrengst per dag op bij de
// SolarEdge-API en zet die in `energieverbruik/solaredge-dag.csv`, in dezelfde opmaak als een
// SolarEdge-dagexport. De API-sleutel staat alleen als geheim in die repo, nooit in deze (publieke) code.
// De app leest dat bestand met het GitHub-token dat hij al heeft voor de synchronisatie.
//
// - Hooguit eens per uur kijken (per sessie), en alleen als synchroniseren is ingesteld.
// - Is het bestand niet veranderd sinds de vorige keer (sha), dan niets doen.
// - Alleen dagen die nieuw of anders zijn, worden als import verwerkt (gewone import, dus met rapport
//   en ongedaan maken). Zo komt er geen import bij als er niets nieuws is.

import { APP } from '../config.js';
import { today } from '../core/dom.js';
import { leesSolarEdge, nulReeksen } from './import-solaredge.js';
import { zetSolarEdge } from './importeren.js';
import { zonId } from './model.js';
import { fmtDatumKort } from './tijd.js';

export const SOLAREDGE_PAD = 'energieverbruik/solaredge-dag.csv';
export const SOLAREDGE_BESTANDSNAAM = 'SolarEdge (automatisch)';
const SHA_KEY = `${APP.storagePrefix}:solaredge-sha`;
const INTERVAL = 60 * 60_000;

let bezig = false;
let laatstePoging = 0;
/** Toestand voor het scherm: { bestand: bool, tot, gekeken, fout, nieuw } */
let status = null;
export const solarEdgeStatus = () => status;

const leesSha = () => { try { return localStorage.getItem(SHA_KEY); } catch { return null; } };
const bewaarSha = (sha) => { try { localStorage.setItem(SHA_KEY, sha); } catch { /* geen opslag */ } };

/**
 * Kijkt of er nieuwe opbrengst klaarstaat en leest die in. `opnieuw` tekent het scherm opnieuw.
 * `nu: true` negeert de wachttijd (knop "Nu bijwerken").
 */
export function zorgVoorSolarEdge(ctx, opnieuw, { nu = false } = {}) {
  if (bezig || !ctx.syncIngesteld || !navigator.onLine) return;
  if (!nu && Date.now() - laatstePoging < INTERVAL) return;
  bezig = true; laatstePoging = Date.now();
  haalEnLees(ctx, nu)
    .then((s) => { status = s; if (s.nieuw || nu) opnieuw(); })
    .catch((err) => {
      status = { ...(status || {}), gekeken: Date.now(), fout: err.message === 'Failed to fetch' ? 'geen verbinding met GitHub' : err.message };
      opnieuw();
    })
    .finally(() => { bezig = false; });
}

async function haalEnLees(ctx, nu) {
  const bestand = await ctx.leesSyncBestand(SOLAREDGE_PAD);
  if (!bestand) return { bestand: false, gekeken: Date.now() };
  const res = leesSolarEdge(bestand.tekst, today());
  const basis = { bestand: true, tot: res.tot, gekeken: Date.now(), nieuw: 0 };
  if (!nu && bestand.sha === leesSha()) return basis;

  const zon = new Map((ctx.data.zon || []).filter((z) => !z.deleted).map((z) => [z.id, z.zon]));
  const anders = res.dagen.filter((d) => zon.get(zonId(d.datum)) !== d.zon);
  if (anders.length) {
    const deel = {
      ...res,
      dagen: anders,
      vanaf: anders[0].datum,
      tot: anders[anders.length - 1].datum,
      regels: anders.length,
      ontbrekend: (res.ontbrekend || []).filter((d) => d >= anders[0].datum && d <= anders[anders.length - 1].datum),
      // Overgeslagen regels (vóór de installatie) alleen de eerste keer melden; "vandaag" komt elke keer
      // terug en zegt niets.
      overgeslagen: zon.size ? [] : res.overgeslagen.filter((o) => !/^Vandaag/.test(o.reden)),
      meldingen: [],
    };
    const reeksen = nulReeksen(anders);
    if (reeksen.length) deel.meldingen.push(`Meerdere dagen achter elkaar geen opbrengst (0 kWh): ${reeksen.join('; ')}. Storing of omvormer uit? De nullen zijn wel ingelezen.`);
    await ctx.update((data) => { zetSolarEdge(data, deel, SOLAREDGE_BESTANDSNAAM); });
    ctx.toast(`Zonne-opbrengst bijgewerkt tot en met ${fmtDatumKort(res.tot)}`, 'ok');
  }
  bewaarSha(bestand.sha);
  return { ...basis, nieuw: anders.length };
}
