// Tijdvakken, contracten en kostenberekening.
//
// Tarieven staan als getal in euro's met 6 decimalen (zoals op de tariefkaart),
// omdat centen hier niet precies genoeg zijn. Berekende kosten zijn ook euro's;
// pas bij het tonen worden ze afgerond naar centen.

import { isZomer, isWeekend } from './tijd.js';

export const TIJDVAKKEN = [
  { key: 'zomerNormaal', label: 'Zomer normaal', uren: '00–12 en 16–24 uur' },
  { key: 'zomerDalWeek', label: 'Zomer dal week', uren: '12–16 uur, ma–vr' },
  { key: 'zomerDalWeekend', label: 'Zomer dal weekend', uren: '12–16 uur, za–zo' },
  { key: 'winterNormaal', label: 'Winter normaal', uren: '06–12 en 16–01 uur' },
  { key: 'winterDalDag', label: 'Winter dal dag', uren: '12–16 uur' },
  { key: 'winterDalNacht', label: 'Winter dal nacht', uren: '01–06 uur' },
];

/** Het tijdvak van een uur (0–23) op een datum. */
export function tijdvak(datum, uur) {
  const dal = uur >= 12 && uur < 16;
  if (isZomer(datum)) {
    if (dal) return isWeekend(datum) ? 'zomerDalWeekend' : 'zomerDalWeek';
    return 'zomerNormaal';
  }
  if (dal) return 'winterDalDag';
  if (uur >= 1 && uur < 6) return 'winterDalNacht';
  return 'winterNormaal';
}

/** Het contract dat op een datum geldt (laatste begindatum wint bij overlap). */
export function contractOp(contracten, datum) {
  let best = null;
  for (const c of contracten) {
    if (c.deleted || !c.van || c.van > datum) continue;
    if (c.tot && c.tot < datum) continue;
    if (!best || c.van > best.van) best = c;
  }
  return best;
}

/** Contract met de Vattenfall-tarieven van de tariefkaart (startpunt; aanpasbaar). */
export function standaardContracten() {
  const basis = {
    stroomLevering: {
      zomerNormaal: 0.172062, zomerDalWeek: 0.067276, zomerDalWeekend: 0,
      winterNormaal: 0.195657, winterDalDag: 0.150282, winterDalNacht: 0.123057,
    },
    stroomEb: 0.110848,
    gasLevering: 0.820501,
    gasEb: 0.726799,
    vastStroom: { levering: 0.295572, netbeheer: 1.303654, verminderingEb: 1.723173 },
    vastGas: { levering: 0.262553, netbeheer: 0.729751 },
  };
  return [
    {
      naam: 'Vattenfall (met saldering)', van: '2025-01-01', tot: '2026-12-31', ...structuredClone(basis),
      terug: { regeling: 'saldering', vergoeding: 0.124, kostenPerKwh: 0, vasteKostenJaar: 462 },
    },
    {
      naam: 'Vattenfall (na saldering)', van: '2027-01-01', tot: '', ...structuredClone(basis),
      terug: { regeling: 'perKwh', vergoeding: 0.0809, kostenPerKwh: 0.066066, vasteKostenJaar: 0 },
    },
  ];
}

// ---------- Verbruiksprofiel (voor dagen zonder uurdata) ----------

const profielSleutel = (datum) => `${isZomer(datum) ? 'z' : 'w'}${isWeekend(datum) ? 'e' : 'd'}`;

/**
 * Gemiddelde verdeling over de 24 uren, per seizoen en week/weekend,
 * berekend uit alle dagen mét uurdata. Zonder uurdata: gelijk verdeeld.
 */
export function maakProfielen(dagen) {
  const som = {};
  for (const d of dagen) {
    if (!d.uurAfname) continue;
    const k = profielSleutel(d.datum);
    som[k] ??= { afname: new Array(24).fill(0), terug: new Array(24).fill(0) };
    d.uurAfname.forEach((v, i) => { som[k].afname[i] += v; });
    d.uurTerug?.forEach((v, i) => { som[k].terug[i] += v; });
  }
  const norm = (arr) => {
    const t = arr.reduce((a, b) => a + b, 0);
    return t > 0 ? arr.map((v) => v / t) : new Array(24).fill(1 / 24);
  };
  const out = {};
  for (const [k, v] of Object.entries(som)) out[k] = { afname: norm(v.afname), terug: norm(v.terug) };
  return out;
}

function urenVanDag(dag, profielen) {
  if (dag.uurAfname) return { afname: dag.uurAfname, terug: dag.uurTerug || new Array(24).fill(0), geschat: false };
  const p = profielen[profielSleutel(dag.datum)] || { afname: new Array(24).fill(1 / 24), terug: new Array(24).fill(1 / 24) };
  return {
    afname: p.afname.map((f) => f * (dag.afname || 0)),
    terug: p.terug.map((f) => f * (dag.terug || 0)),
    geschat: (dag.afname || 0) + (dag.terug || 0) > 0,
  };
}

/** kWh per tijdvak voor één dag (afname en teruglevering). */
export function perTijdvak(dag, profielen) {
  const u = urenVanDag(dag, profielen);
  const afname = {}; const terug = {};
  for (let h = 0; h < 24; h++) {
    const tv = tijdvak(dag.datum, h);
    afname[tv] = (afname[tv] || 0) + u.afname[h];
    terug[tv] = (terug[tv] || 0) + u.terug[h];
  }
  return { afname, terug, geschat: u.geschat };
}

const n = (v) => (Number.isFinite(v) ? v : 0);

/**
 * Kosten van één dag in euro's.
 * Saldering (tot 2027): teruggeleverde stroom wordt verrekend tegen het tarief
 * van hetzelfde tijdvak (levering + energiebelasting); vaste terugleverkosten
 * per jaar worden per dag verdeeld.
 * Na saldering: afname tegen het tijdvaktarief, teruglevering tegen
 * (kosten − vergoeding) per kWh.
 */
export function kostenDag(dag, contract, profielen) {
  const leeg = { stroom: 0, terug: 0, gas: 0, vast: 0, totaal: 0, geschat: false, contract: false };
  if (!contract) return leeg;
  const tv = perTijdvak(dag, profielen);
  const eb = n(contract.stroomEb);
  let stroom = 0; let terug = 0;
  for (const [k, kwh] of Object.entries(tv.afname)) stroom += kwh * (n(contract.stroomLevering?.[k]) + eb);
  const t = contract.terug || {};
  if (t.regeling === 'saldering') {
    for (const [k, kwh] of Object.entries(tv.terug)) terug -= kwh * (n(contract.stroomLevering?.[k]) + eb);
  } else {
    terug = n(dag.terug) * (n(t.kostenPerKwh) - n(t.vergoeding));
  }
  const gas = n(dag.gas) * (n(contract.gasLevering) + n(contract.gasEb));
  const vs = contract.vastStroom || {}; const vg = contract.vastGas || {};
  const vast = n(vs.levering) + n(vs.netbeheer) - n(vs.verminderingEb) + n(vg.levering) + n(vg.netbeheer)
    + (t.regeling === 'saldering' ? n(t.vasteKostenJaar) / 365 : 0);
  return { stroom, terug, gas, vast, totaal: stroom + terug + gas + vast, geschat: tv.geschat, contract: true };
}

// ---------- Graaddagen ----------

const WEGING = [1.1, 1.1, 1.0, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1.0, 1.1, 1.1];

/** Gewogen graaddag: (18 − gemiddelde temperatuur) × weegfactor van de maand. */
export function graaddag(datum, tgem) {
  if (!Number.isFinite(tgem)) return null;
  const g = Math.max(0, 18 - tgem);
  return g * WEGING[Number(datum.slice(5, 7)) - 1];
}
