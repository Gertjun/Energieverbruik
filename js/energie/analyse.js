// Rekenwerk voor het scherm Analyse: een gekozen grootheid over een periode,
// ingedeeld per dag/week/maand/jaar, per uur van de dag of per tijdvak.
// Geen DOM hier, zodat het los te testen is.

import { totaal } from './model.js';
import { TIJDVAKKEN, tijdvak, urenVanDag } from './tarief.js';
import {
  addDays, eachDay, daysBetween, isoWeekKey, mondayOf, monthKey, sameDayLastYear,
  fmtDatumKort, fmtMaand, fmtMaandKort,
} from './tijd.js';

// soort: 'som' (optellen), 'gem' (gemiddelde/verhouding). per: welke indelingen kunnen.
const TIJD = ['dag', 'week', 'maand', 'jaar'];
const UUR = ['uur', 'tijdvak'];
export const MATEN = {
  afname: { groep: 'Verbruik', naam: 'Stroom afgenomen', eenheid: 'kWh', d: 1, per: [...TIJD, ...UUR] },
  terug: { groep: 'Verbruik', naam: 'Stroom teruggeleverd', eenheid: 'kWh', d: 1, per: [...TIJD, ...UUR] },
  netto: { groep: 'Verbruik', naam: 'Stroom netto (afname − terug)', eenheid: 'kWh', d: 1, per: [...TIJD, ...UUR] },
  gas: { groep: 'Verbruik', naam: 'Gas', eenheid: 'm³', d: 2, per: TIJD },
  kosten: { groep: 'Kosten', naam: 'Kosten totaal', eenheid: '€', d: 2, per: TIJD },
  kostenStroom: { groep: 'Kosten', naam: 'Kosten stroom (variabel)', eenheid: '€', d: 2, per: TIJD },
  kostenGas: { groep: 'Kosten', naam: 'Kosten gas (variabel)', eenheid: '€', d: 2, per: TIJD },
  kostenVast: { groep: 'Kosten', naam: 'Vaste kosten', eenheid: '€', d: 2, per: TIJD },
  temp: { groep: 'Weer', naam: 'Temperatuur (gemiddeld)', eenheid: '°C', d: 1, per: TIJD, gem: true },
  graaddagen: { groep: 'Weer', naam: 'Graaddagen (gewogen)', eenheid: 'gd', d: 1, per: TIJD },
  gasPerGd: { groep: 'Weer', naam: 'Gas per graaddag', eenheid: 'm³/gd', d: 3, per: TIJD, gem: true },
  zon: { groep: 'Zonnepanelen', naam: 'Zonne-opbrengst', eenheid: 'kWh', d: 0, per: ['maand', 'jaar'] },
};

export const INDELINGEN = [
  ['dag', 'Per dag'], ['week', 'Per week'], ['maand', 'Per maand'], ['jaar', 'Per jaar'],
  ['uur', 'Per uur van de dag (gemiddeld)'], ['tijdvak', 'Per tijdvak'],
];

export const MAX_DAGEN_PER_DAG = 400;

const KORT_TIJDVAK = {
  zomerNormaal: 'Z norm', zomerDalWeek: 'Z dal wk', zomerDalWeekend: 'Z dal wknd',
  winterNormaal: 'W norm', winterDalDag: 'W dal dag', winterDalNacht: 'W nacht',
};

// Minimaal aantal graaddagen om gas per graaddag te tonen (zoals in het Overzicht).
const GD_MINIMUM = { dag: 1, week: 3, maand: 5, jaar: 5 };

export const past = (maat, indeling) => !!MATEN[maat]?.per.includes(indeling);

// ---------- Vakjes (buckets) ----------

/** Vakjes voor een tijdindeling: [{ van, tot, label, kort }], afgekapt op het bereik. */
function tijdVakjes(indeling, van, tot) {
  const out = [];
  let d = van;
  while (d <= tot) {
    let eind;
    if (indeling === 'dag') eind = d;
    else if (indeling === 'week') eind = addDays(mondayOf(d), 6);
    else if (indeling === 'maand') { const [y, m] = d.split('-').map(Number); eind = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
    else eind = `${d.slice(0, 4)}-12-31`;
    if (eind > tot) eind = tot;
    out.push({ van: d, tot: eind, ...vakNaam(indeling, d, van, tot) });
    d = addDays(eind, 1);
  }
  return out;
}

function vakNaam(indeling, d, van, tot) {
  const meerJaren = van.slice(0, 4) !== tot.slice(0, 4);
  if (indeling === 'dag') return { label: `${fmtDatumKort(d)}${meerJaren ? ` ${d.slice(0, 4)}` : ''}`, kort: String(Number(d.slice(8))) };
  if (indeling === 'week') {
    const wk = isoWeekKey(d);
    return { label: `Week ${Number(wk.slice(6))} ${wk.slice(0, 4)} (${fmtDatumKort(mondayOf(d))})`, kort: String(Number(wk.slice(6))) };
  }
  if (indeling === 'maand') {
    const mk = monthKey(d);
    // Over meer jaren: bij januari het jaartal, zodat de as kort blijft.
    return { label: fmtMaand(mk), kort: meerJaren && mk.endsWith('-01') ? mk.slice(0, 4) : fmtMaandKort(mk) };
  }
  return { label: d.slice(0, 4), kort: d.slice(0, 4) };
}

// ---------- Waarden ----------

/** Waarde van een tijdgrootheid over de dagen van..tot. Geeft { v, geschat }. */
function tijdWaarde(a, maat, van, tot, indeling) {
  if (maat === 'zon') {
    let som = 0; let gevonden = false;
    for (const [mk, m] of a.maanden) {
      if (m.zon == null || mk < monthKey(van) || mk > monthKey(tot)) continue;
      som += m.zon; gevonden = true;
    }
    return { v: gevonden ? som : null };
  }
  if (maat === 'temp' || maat === 'graaddagen') {
    let som = 0; let n = 0; let gd = 0;
    for (const d of eachDay(van, tot)) {
      const x = a.perDag.get(d);
      const w = x?.weer ?? a.weer.get(d);
      if (w?.tgem == null) continue;
      som += w.tgem; n++;
      if (x?.graaddag != null) gd += x.graaddag;
    }
    if (!n) return { v: null };
    return { v: maat === 'temp' ? som / n : gd };
  }
  const t = totaal(a, van, tot);
  switch (maat) {
    case 'afname': return { v: t.dagenAfname ? t.afname : null };
    case 'terug': return { v: t.dagenAfname ? t.terug : null };
    case 'netto': return { v: t.dagenAfname ? t.afname - t.terug : null };
    case 'gas': return { v: t.dagenGas ? t.gas : null };
    case 'gasPerGd': return { v: t.graaddagen >= (GD_MINIMUM[indeling] ?? 1) ? t.gasStookdagen / t.graaddagen : null };
    default: {
      if (!t.dagen || t.zonderContract) return { v: null };
      const v = { kosten: t.kosten, kostenStroom: t.kostenStroom, kostenGas: t.kostenGas, kostenVast: t.kostenVast }[maat];
      return { v, geschat: t.geschat && maat !== 'kostenVast' && maat !== 'kostenGas' };
    }
  }
}

/** Per uur (gemiddeld per dag) of per tijdvak (totaal) voor afname/terug/netto. */
function uurWaarden(a, maat, van, tot, indeling) {
  const sleutels = indeling === 'uur' ? [...Array(24).keys()] : TIJDVAKKEN.map((t) => t.key);
  const som = new Map(sleutels.map((k) => [k, 0]));
  let dagen = 0; let geschat = false;
  for (const d of eachDay(van, tot)) {
    const dag = a.perDag.get(d)?.dag;
    if (!dag || dag.afname == null) continue;
    const u = urenVanDag(dag, a.profielen);
    if (u.geschat) geschat = true;
    dagen++;
    for (let h = 0; h < 24; h++) {
      const v = maat === 'afname' ? u.afname[h] : maat === 'terug' ? u.terug[h] : u.afname[h] - u.terug[h];
      const k = indeling === 'uur' ? h : tijdvak(d, h);
      som.set(k, som.get(k) + (v || 0));
    }
  }
  const vakjes = sleutels.map((k) => {
    const v = dagen ? (indeling === 'uur' ? som.get(k) / dagen : som.get(k)) : null;
    if (indeling === 'uur') {
      const hh = String(k).padStart(2, '0');
      return { label: `${hh}:00–${String((k + 1) % 24).padStart(2, '0')}:00`, kort: String(k), v, geschat };
    }
    const tv = TIJDVAKKEN.find((t) => t.key === k);
    return { label: `${tv.label} (${tv.uren})`, kort: KORT_TIJDVAK[k], v, geschat };
  });
  // Bij tijdvakken die in deze periode niet voorkomen (bijv. zomer in januari) geen 0 maar leeg.
  if (indeling === 'tijdvak' && dagen) {
    const voorkomend = new Set();
    for (const d of eachDay(van, tot)) for (let h = 0; h < 24; h += 1) voorkomend.add(tijdvak(d, h));
    for (const vk of vakjes) if (!voorkomend.has(TIJDVAKKEN[vakjes.indexOf(vk)].key)) vk.v = null;
  }
  const totaalV = dagen ? vakjes.reduce((s, vk) => s + (vk.v || 0), 0) : null;
  return { vakjes, totaal: { label: indeling === 'uur' ? 'Hele dag (gemiddeld)' : 'Totaal', v: totaalV, geschat }, dagen };
}

/** Reeks voor één grootheid: { vakjes: [{label,kort,v,geschat}], totaal, dagen }. */
export function reeks(a, maat, indeling, van, tot) {
  if (UUR.includes(indeling)) return uurWaarden(a, maat, van, tot, indeling);
  const vakjes = tijdVakjes(indeling, van, tot).map((vk) => ({ ...vk, ...tijdWaarde(a, maat, vk.van, vk.tot, indeling) }));
  const t = tijdWaarde(a, maat, van, tot, 'jaar');
  return { vakjes, totaal: { label: MATEN[maat].gem ? 'Hele periode' : 'Totaal', ...t }, dagen: daysBetween(van, tot) + 1 };
}

// ---------- Perioden ----------

/** Vaste periode-keuzes (relatief, zodat een favoriet meegaat in de tijd). */
export const SNEL = [['laatste12', 'Laatste 12 maanden'], ['ditjaar', 'Dit jaar'], ['vorigjaar', 'Vorig jaar'], ['alles', 'Alles']];

export function snelPeriode(soort, a) {
  const laatste = a.laatste; const eerste = a.eerste;
  const y = Number(laatste.slice(0, 4));
  if (soort === 'ditjaar') return { van: `${y}-01-01`, tot: laatste };
  if (soort === 'vorigjaar') return { van: `${y - 1}-01-01`, tot: `${y - 1}-12-31` };
  if (soort === 'alles') return { van: eerste, tot: laatste };
  const m = monthKey(laatste); const [jy, jm] = m.split('-').map(Number);
  const start = new Date(Date.UTC(jy, jm - 12, 1)).toISOString().slice(0, 10);
  return { van: start, tot: laatste };
}

/** Dezelfde periode een jaar eerder. Weken schuiven 364 dagen, zodat maandag maandag blijft. */
export function vorigJaar(indeling, van, tot) {
  if (indeling === 'week' || indeling === 'dag') return { van: addDays(van, -364), tot: addDays(tot, -364) };
  return { van: sameDayLastYear(van), tot: sameDayLastYear(tot) };
}

/** Andere periode met dezelfde lengte, beginnend op `van2`. */
export function anderePeriode(van, tot, van2) {
  return { van: van2, tot: addDays(van2, daysBetween(van, tot)) };
}
