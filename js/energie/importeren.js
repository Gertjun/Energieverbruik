// Ingelezen gegevens in de kluis zetten (muteert de draft binnen ctx.update).
//
// Voorrang: HomeWizard-gegevens zijn het nauwkeurigst en overschrijven waarden
// uit Excel. Excel vult alleen aan wat er nog niet is. Opmerkingen blijven staan.

import { upsert, dagId, weerId, maandId } from './model.js';

/** HomeWizard-resultaat (uit leesHomeWizard) verwerken. Geeft het aantal dagen terug. */
export function zetHomeWizard(data, res) {
  let n = 0;
  for (const d of res.dagen) {
    if (res.soort === 'stroom') {
      upsert(data.dagen, dagId(d.datum), {
        datum: d.datum, afname: d.afname, terug: d.terug, uurAfname: d.uurAfname, uurTerug: d.uurTerug, bron: 'homewizard',
      });
    } else {
      const rec = upsert(data.dagen, dagId(d.datum), { datum: d.datum, gas: d.gas, bronGas: 'homewizard' });
      rec.bron ??= 'homewizard';
    }
    n++;
  }
  return n;
}

/** Excel-resultaat (uit leesExcel) verwerken. */
export function zetExcel(data, res) {
  const bestaand = new Map(data.dagen.filter((r) => !r.deleted).map((r) => [r.datum, r]));
  let dagen = 0;
  for (const d of res.dagen) {
    const oud = bestaand.get(d.datum);
    const velden = { datum: d.datum };
    if (d.afname != null && (oud?.afname == null || oud.bron !== 'homewizard')) {
      Object.assign(velden, { afname: d.afname, terug: d.terug ?? 0 });
    }
    if (d.gas != null && (oud?.gas == null || oud.bronGas !== 'homewizard')) velden.gas = d.gas;
    if (d.opmerking && !oud?.opmerking) velden.opmerking = d.opmerking;
    if (Object.keys(velden).length === 1) continue;
    const rec = upsert(data.dagen, dagId(d.datum), velden);
    rec.bron ??= 'excel';
    dagen++;
  }
  const weerBestaand = new Set(data.weer.filter((r) => !r.deleted).map((r) => r.datum));
  let weer = 0;
  for (const w of res.weer) {
    if (weerBestaand.has(w.datum)) continue;
    upsert(data.weer, weerId(w.datum), w);
    weer++;
  }
  const maandBestaand = new Map(data.maanden.filter((r) => !r.deleted).map((r) => [r.maand, r]));
  let maanden = 0;
  for (const m of res.maanden) {
    const oud = maandBestaand.get(m.maand);
    const velden = { maand: m.maand };
    if (m.termijn != null && oud?.termijn == null) velden.termijn = m.termijn;
    if (m.zon != null && oud?.zon == null) velden.zon = m.zon;
    if (Object.keys(velden).length === 1) continue;
    upsert(data.maanden, maandId(m.maand), velden);
    maanden++;
  }
  return { dagen, weer, maanden };
}
