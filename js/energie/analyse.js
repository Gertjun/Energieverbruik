// Rekenwerk voor het scherm Analyse: een gekozen grootheid over een periode,
// ingedeeld per dag/week/maand/jaar, per uur van de dag of per tijdvak.
// Geen DOM hier, zodat het los te testen is.

import { totaal } from './model.js';
import { TIJDVAKKEN, tijdvak, urenVanDag, contractOp, kostenDag } from './tarief.js';
import {
  addDays, eachDay, daysBetween, weekday, isoWeekKey, mondayOf, monthKey, sameDayLastYear,
  fmtDatumKort, fmtMaand, fmtMaandKort,
} from './tijd.js';

// soort: 'som' (optellen), 'gem' (gemiddelde/verhouding). per: welke indelingen kunnen.
const TIJD = ['dag', 'week', 'maand', 'jaar'];
const UUR = ['uur', 'tijdvak'];
const WD = ['weekdag'];
export const MATEN = {
  afname: { groep: 'Verbruik', naam: 'Stroom afgenomen', eenheid: 'kWh', d: 1, per: [...TIJD, ...WD, ...UUR] },
  terug: { groep: 'Verbruik', naam: 'Stroom teruggeleverd', eenheid: 'kWh', d: 1, per: [...TIJD, ...WD, ...UUR] },
  netto: { groep: 'Verbruik', naam: 'Stroom netto (afname − terug)', eenheid: 'kWh', d: 1, per: [...TIJD, ...WD, ...UUR] },
  gas: { groep: 'Verbruik', naam: 'Gas', eenheid: 'm³', d: 2, per: [...TIJD, ...WD] },
  piek: { groep: 'Verbruik', naam: 'Piekvermogen (hoogste fase)', eenheid: 'W', d: 0, per: [...TIJD, ...WD], agg: 'max' },
  piekSom: { groep: 'Verbruik', naam: 'Piekvermogen (3 fasen samen)', eenheid: 'W', d: 0, per: [...TIJD, ...WD], agg: 'max' },
  basis: { groep: 'Verbruik', naam: 'Sluipverbruik (laagste uur ʼs nachts)', eenheid: 'W', d: 0, per: [...TIJD, ...WD], gem: true },
  kosten: { groep: 'Kosten', naam: 'Kosten totaal', eenheid: '€', d: 2, per: [...TIJD, ...WD] },
  kostenStroom: { groep: 'Kosten', naam: 'Kosten stroom (variabel)', eenheid: '€', d: 2, per: [...TIJD, ...WD] },
  kostenGas: { groep: 'Kosten', naam: 'Kosten gas (variabel)', eenheid: '€', d: 2, per: [...TIJD, ...WD] },
  kostenVast: { groep: 'Kosten', naam: 'Vaste kosten', eenheid: '€', d: 2, per: [...TIJD, ...WD] },
  temp: { groep: 'Weer', naam: 'Temperatuur (gemiddeld)', eenheid: '°C', d: 1, per: [...TIJD, ...WD], gem: true },
  graaddagen: { groep: 'Weer', naam: 'Graaddagen (gewogen)', eenheid: 'gd', d: 1, per: [...TIJD, ...WD] },
  gasPerGd: { groep: 'Weer', naam: 'Gas per graaddag', eenheid: 'm³/gd', d: 3, per: [...TIJD, ...WD], gem: true },
  zon: { groep: 'Zonnepanelen', naam: 'Zonne-opbrengst', eenheid: 'kWh', d: 0, per: ['maand', 'jaar'] },
};

export const INDELINGEN = [
  ['dag', 'Per dag'], ['week', 'Per week'], ['maand', 'Per maand'], ['jaar', 'Per jaar'],
  ['weekdag', 'Per dag van de week (gemiddeld)'], ['uur', 'Per uur van de dag (gemiddeld)'], ['tijdvak', 'Per tijdvak'],
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

export function mediaan(lijst) {
  if (!lijst.length) return null;
  const s = [...lijst].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Hoofdzekering per fase (Enexis 3x25 A) en de spanning: daarmee de grens in watt. */
export const AANSLUITING = { fasen: 3, ampere: 25, volt: 230 };
export const GRENS_FASE = AANSLUITING.ampere * AANSLUITING.volt;

/** Uren waarover het sluipverbruik bepaald wordt: 00:00–05:00, dan schijnt de zon zeker niet. */
export const BASIS_UREN = [0, 1, 2, 3, 4];

/**
 * Sluipverbruik van één dag in watt: het laagste uurverbruik tussen 00:00 en 05:00
 * (kWh in dat uur × 1000 = gemiddeld vermogen). Alleen voor dagen met echte uurdata.
 */
export function basisDag(dag) {
  if (!dag?.uurAfname) return null;
  const w = BASIS_UREN.map((h) => dag.uurAfname[h]).filter(Number.isFinite);
  return w.length ? Math.min(...w) * 1000 : null;
}

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
  if (maat === 'piek' || maat === 'piekSom') {
    let max = null; let wanneer = null;
    for (const d of eachDay(van, tot)) {
      const p = a.perDag.get(d)?.dag?.piek;
      if (!p) continue;
      const w = maat === 'piek' ? Math.max(...p.f) : p.som;
      if (max == null || w > max) { max = w; wanneer = d; }
    }
    return { v: max, wanneer };
  }
  if (maat === 'basis') {
    // Mediaan van de dagen: één nacht met bijvoorbeeld de auto aan de lader trekt het getal dan niet omhoog.
    const w = [];
    for (const d of eachDay(van, tot)) { const x = basisDag(a.perDag.get(d)?.dag); if (x != null) w.push(x); }
    return { v: mediaan(w) };
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
function uurWaarden(a, maat, van, tot, indeling, alleenEcht = false) {
  const sleutels = indeling === 'uur' ? [...Array(24).keys()] : TIJDVAKKEN.map((t) => t.key);
  const som = new Map(sleutels.map((k) => [k, 0]));
  let dagen = 0; let geschat = false;
  for (const d of eachDay(van, tot)) {
    const dag = a.perDag.get(d)?.dag;
    if (!dag || dag.afname == null || (alleenEcht && !dag.uurAfname)) continue;
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

const WEEKDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

/**
 * Per dag van de week: gemiddelde per dag (sluipverbruik: mediaan, piek: hoogste).
 * Met extra regels voor werkdagen en weekend.
 */
function weekdagWaarden(a, maat, van, tot) {
  const m = MATEN[maat];
  const per = WEEKDAGEN.map(() => ({ w: [], gas: 0, gd: 0, geschat: false }));
  for (const d of eachDay(van, tot)) {
    const i = (weekday(d) + 6) % 7;
    if (maat === 'gasPerGd') {
      const x = a.perDag.get(d);
      if (x?.dag?.gas != null && x.graaddag > 0) { per[i].gas += x.dag.gas; per[i].gd += x.graaddag; }
      continue;
    }
    const t = tijdWaarde(a, maat, d, d, 'dag');
    if (t.v == null) continue;
    per[i].w.push(t.v);
    if (t.geschat) per[i].geschat = true;
  }
  const samen = (groepen) => {
    if (maat === 'gasPerGd') {
      const gas = groepen.reduce((s, g) => s + g.gas, 0); const gd = groepen.reduce((s, g) => s + g.gd, 0);
      return { v: gd >= GD_MINIMUM.week ? gas / gd : null };
    }
    const w = groepen.flatMap((g) => g.w);
    const geschat = groepen.some((g) => g.geschat);
    if (!w.length) return { v: null };
    if (maat === 'basis') return { v: mediaan(w) };
    if (m.agg === 'max') return { v: Math.max(...w) };
    return { v: w.reduce((s, x) => s + x, 0) / w.length, geschat };
  };
  const vakjes = WEEKDAGEN.map((naam, i) => ({ label: naam, kort: naam.slice(0, 2), ...samen([per[i]]), n: per[i].w.length }));
  return {
    vakjes,
    totaal: { label: m.agg === 'max' ? 'Hoogste' : 'Alle dagen', ...samen(per) },
    extra: [{ label: 'Werkdagen', ...samen(per.slice(0, 5)) }, { label: 'Weekend', ...samen(per.slice(5)) }],
    dagen: daysBetween(van, tot) + 1,
  };
}

/** Reeks voor één grootheid: { vakjes: [{label,kort,v,geschat}], totaal, dagen }. */
export function reeks(a, maat, indeling, van, tot) {
  if (UUR.includes(indeling)) return uurWaarden(a, maat, van, tot, indeling);
  if (indeling === 'weekdag') return weekdagWaarden(a, maat, van, tot);
  const vakjes = tijdVakjes(indeling, van, tot).map((vk) => ({ ...vk, ...tijdWaarde(a, maat, vk.van, vk.tot, indeling) }));
  const t = tijdWaarde(a, maat, van, tot, 'jaar');
  const label = MATEN[maat].agg === 'max' ? 'Hoogste' : MATEN[maat].gem ? 'Hele periode' : 'Totaal';
  return { vakjes, totaal: { label, ...t }, dagen: daysBetween(van, tot) + 1 };
}

/**
 * Gemiddeld stroomtarief (levering + energiebelasting, € per kWh) over de 365 dagen tot en met `datum`,
 * als je elk uur evenveel verbruikt. Voor het omrekenen van een constant vermogen (sluipverbruik) naar euro's.
 */
export function vlakStroomTarief(a, datum) {
  let som = 0; let n = 0;
  for (const d of eachDay(addDays(datum, -364), datum)) {
    const c = contractOp(a.contracten, d);
    if (!c) continue;
    for (let h = 0; h < 24; h++) { som += (c.stroomLevering?.[tijdvak(d, h)] || 0) + (c.stroomEb || 0); n++; }
  }
  return n ? som / n : null;
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

// ---------- Heatmap: uur van de dag × datum ----------

/** Rijindeling voor de heatmap: per dag tot 2 maanden, per week tot 13 maanden, anders per maand. */
export function heatmapIndeling(van, tot) {
  const n = daysBetween(van, tot) + 1;
  return n <= 62 ? 'dag' : n <= 400 ? 'week' : 'maand';
}

/**
 * Rijen voor de heatmap: per dag/week/maand de gemiddelde kWh per uur (24 waarden),
 * alleen uit dagen met echte uurgegevens (geen geschatte profielen).
 * maat: 'afname', 'terug' of 'netto'.
 */
export function heatmapRijen(a, maat, van, tot) {
  const indeling = heatmapIndeling(van, tot);
  return tijdVakjes(indeling, van, tot).map((vk) => {
    const som = new Array(24).fill(0); let dagen = 0;
    for (const d of eachDay(vk.van, vk.tot)) {
      const dag = a.perDag.get(d)?.dag;
      if (!dag?.uurAfname) continue;
      dagen++;
      for (let h = 0; h < 24; h++) {
        const af = dag.uurAfname[h] || 0; const te = dag.uurTerug?.[h] || 0;
        som[h] += maat === 'afname' ? af : maat === 'terug' ? te : af - te;
      }
    }
    return { label: vk.label, kort: vk.kort, van: vk.van, dagen, waarden: dagen ? som.map((x) => x / dagen) : null };
  });
}

// ---------- Wat-als: einde saldering ----------

/** Het contract met de regeling na saldering (per kWh) met de laatste begindatum. */
export function contractNaSaldering(a) {
  return a.contracten.filter((c) => c.terug?.regeling === 'perKwh').sort((x, y) => (x.van < y.van ? 1 : -1))[0] || null;
}

const dagenVanMaand = (iso) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();

/**
 * Stroomkosten van één dag met saldering en na saldering, met dezelfde leverings- en belastingtarieven
 * (die van het contract op die dag). Alleen de regeling voor teruglevering verschilt, zodat het verschil
 * precies het effect van het einde van de saldering is. Vaste terugleverkosten tellen mee bij saldering.
 */
export function salderingDag(a, datum, na) {
  const x = a.perDag.get(datum);
  if (!x?.dag || x.dag.afname == null) return null;
  const c = contractOp(a.contracten, datum);
  if (!c) return null;
  const metRegels = c.terug?.regeling === 'saldering' ? c.terug
    : (a.contracten.filter((k) => k.terug?.regeling === 'saldering').sort((p, q) => (p.van < q.van ? 1 : -1))[0]?.terug);
  if (!metRegels || !na) return null;
  const dag = { ...x.dag, gas: 0 };
  const met = kostenDag(dag, { ...c, terug: metRegels }, a.profielen);
  const zonder = kostenDag(dag, { ...c, terug: na.terug }, a.profielen);
  const vastTerug = (metRegels.vasteKostenJaar || 0) / 12 / dagenVanMaand(datum);
  return {
    afname: x.dag.afname, terug: x.dag.terug || 0,
    met: met.stroom + met.terug + vastTerug, vastTerug,
    na: zonder.stroom + zonder.terug,
    afnameKosten: zonder.stroom,
    vergoeding: (x.dag.terug || 0) * (na.terug.vergoeding || 0),
    terugKosten: (x.dag.terug || 0) * (na.terug.kostenPerKwh || 0),
    geschat: met.geschat,
  };
}

/** Per maand (of per jaar) de som van salderingDag over de periode. */
export function salderingReeks(a, van, tot, indeling = 'maand') {
  const na = contractNaSaldering(a);
  const leeg = () => ({ afname: 0, terug: 0, met: 0, na: 0, vastTerug: 0, afnameKosten: 0, vergoeding: 0, terugKosten: 0, dagen: 0, geschat: false });
  const tel = (t, d) => { for (const k of Object.keys(t)) if (k !== 'dagen' && typeof d[k] === 'number') t[k] += d[k]; t.dagen++; if (d.geschat) t.geschat = true; };
  const totaalT = leeg();
  const vakjes = tijdVakjes(indeling, van, tot).map((vk) => {
    const t = leeg();
    for (const d of eachDay(vk.van, vk.tot)) {
      const r = salderingDag(a, d, na);
      if (r) { tel(t, r); tel(totaalT, r); }
    }
    return { ...vk, ...t };
  });
  totaalT.dagen = vakjes.reduce((s, v) => s + v.dagen, 0);
  return { vakjes, totaal: totaalT, na };
}

// ---------- Eigen verbruik: afname in de zonuren en wat er te verschuiven is ----------

/** Een uur telt als "zonuur" als er in dat uur meer dan 0,05 kWh is teruggeleverd. */
export const ZONUUR_KWH = 0.05;

/**
 * Per dag met echte uurgegevens: afname in en buiten de zonuren, en hoeveel kWh je had kunnen
 * verschuiven naar de zonuren (het kleinste van: afname buiten de zonuren, teruglevering die dag).
 * `waardeNa`: wat dat verschuiven per jaar oplevert na de saldering (afnametarief − vergoeding + terugleverkosten);
 * `waardeNu`: met saldering (alleen het verschil tussen de tijdvaktarieven, meestal klein).
 */
export function zonurenDag(a, datum, na) {
  const dag = a.perDag.get(datum)?.dag;
  if (!dag?.uurAfname) return null;
  const c = contractOp(a.contracten, datum);
  const tarief = (h) => (c ? (c.stroomLevering?.[tijdvak(datum, h)] || 0) + (c.stroomEb || 0) : null);
  let inZon = 0; let buiten = 0; let buitenEuro = 0; let terug = 0; let zonEuro = 0; let zonKwh = 0;
  for (let h = 0; h < 24; h++) {
    const af = dag.uurAfname[h] || 0; const te = dag.uurTerug?.[h] || 0;
    terug += te;
    if (te > ZONUUR_KWH) { inZon += af; zonEuro += te * (tarief(h) || 0); zonKwh += te; } else { buiten += af; buitenEuro += af * (tarief(h) || 0); }
  }
  const verschuifbaar = Math.min(buiten, terug);
  const prijsBuiten = buiten > 0 ? buitenEuro / buiten : 0;
  const prijsZon = zonKwh > 0 ? zonEuro / zonKwh : 0;
  const nt = na?.terug || {};
  return {
    afname: dag.afname || 0, terug, inZon, buiten, verschuifbaar,
    waardeNa: c ? verschuifbaar * (prijsBuiten - (nt.vergoeding || 0) + (nt.kostenPerKwh || 0)) : null,
    waardeNu: c ? verschuifbaar * (prijsBuiten - prijsZon) : null,
  };
}

export function zonurenReeks(a, van, tot, indeling = 'maand') {
  const na = contractNaSaldering(a);
  const velden = ['afname', 'terug', 'inZon', 'buiten', 'verschuifbaar', 'waardeNa', 'waardeNu'];
  const leeg = () => Object.fromEntries([...velden.map((k) => [k, 0]), ['dagen', 0]]);
  const totaalT = leeg();
  const vakjes = tijdVakjes(indeling, van, tot).map((vk) => {
    const t = leeg();
    for (const d of eachDay(vk.van, vk.tot)) {
      const r = zonurenDag(a, d, na);
      if (!r) continue;
      for (const k of velden) { t[k] += r[k] || 0; totaalT[k] += r[k] || 0; }
      t.dagen++; totaalT.dagen++;
    }
    return { ...vk, ...t };
  });
  return { vakjes, totaal: totaalT, na, perUur: { afname: uurWaarden(a, 'afname', van, tot, 'uur', true), terug: uurWaarden(a, 'terug', van, tot, 'uur', true) } };
}

// ---------- Stooklijn: gas tegen buitentemperatuur ----------

/**
 * Past per dag gas = vast + k × max(0, stookgrens − temperatuur) aan de punten (kleinste kwadraten).
 * De stookgrens wordt gezocht tussen 10 en 20 °C in stappen van 0,5. Geeft null bij te weinig punten.
 */
export function stooklijnFit(punten) {
  if (punten.length < 14) return null;
  let best = null;
  for (let ts = 10; ts <= 20.001; ts += 0.5) {
    const xs = punten.map((p) => Math.max(0, ts - p.t));
    const n = xs.length;
    const mx = xs.reduce((s, x) => s + x, 0) / n; const my = punten.reduce((s, p) => s + p.gas, 0) / n;
    let sxy = 0; let sxx = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (punten[i].gas - my); sxx += (x - mx) ** 2; });
    if (sxx === 0) continue;
    const k = sxy / sxx; const vast = my - k * mx;
    if (k <= 0) continue;
    const sse = xs.reduce((s, x, i) => s + (punten[i].gas - (vast + k * x)) ** 2, 0);
    if (!best || sse < best.sse) best = { stookgrens: ts, k, vast: Math.max(0, vast), sse };
  }
  if (!best) return null;
  const my = punten.reduce((s, p) => s + p.gas, 0) / punten.length;
  const sst = punten.reduce((s, p) => s + (p.gas - my) ** 2, 0);
  best.r2 = sst > 0 ? 1 - best.sse / sst : null;
  best.voorspel = (t) => best.vast + best.k * Math.max(0, best.stookgrens - t);
  return best;
}

/** Punten (dagen met gas en temperatuur) en de stooklijn over een periode. */
export function stooklijn(a, van, tot) {
  const punten = [];
  for (const d of eachDay(van, tot)) {
    const x = a.perDag.get(d);
    const w = x?.weer ?? a.weer.get(d);
    if (x?.dag?.gas == null || w?.tgem == null) continue;
    punten.push({ datum: d, t: w.tgem, gas: x.dag.gas });
  }
  return { punten, fit: stooklijnFit(punten) };
}

// ---------- Weer-gecorrigeerd vergelijken (gas) ----------

/**
 * Gas in de periode tegenover wat je met de stooklijn van de vergelijkingsperiode bij het weer van
 * deze periode verbruikt zou hebben. Per maand. Alleen dagen met gas en temperatuur.
 */
export function weerGecorrigeerd(a, van, tot, refVan, refTot) {
  const ref = stooklijn(a, refVan, refTot);
  const eigen = stooklijn(a, van, tot);
  const fit = ref.fit;
  // Alleen dagen binnen het temperatuurbereik van de vergelijkingsperiode (± 1 °C): daarbuiten is de
  // stooklijn een gok (bijv. een winter vergelijken met een periode die alleen herfstdagen heeft).
  const tMin = Math.min(...ref.punten.map((p) => p.t)) - 1; const tMax = Math.max(...ref.punten.map((p) => p.t)) + 1;
  let buiten = 0;
  const perMaand = tijdVakjes('maand', van, tot).map((vk) => {
    let gas = 0; let verwacht = 0; let dagen = 0; let gd = 0;
    for (const p of eigen.punten) {
      if (p.datum < vk.van || p.datum > vk.tot) continue;
      if (p.t < tMin || p.t > tMax) { buiten++; continue; }
      gas += p.gas; dagen++; gd += graaddagVan(a, p.datum) || 0;
      if (fit) verwacht += fit.voorspel(p.t);
    }
    // Vorig jaar werkelijk, zelfde maand (ongecorrigeerd), ter vergelijking.
    const vj = totaal(a, sameDayLastYear(vk.van), sameDayLastYear(vk.tot));
    return { ...vk, gas, verwacht: fit && dagen ? verwacht : null, dagen, gd, vorigJaar: vj.dagenGas ? vj.gas : null };
  });
  const som = (k) => perMaand.reduce((s, m) => s + (m[k] || 0), 0);
  return {
    ref, eigen, fit, perMaand, buiten, bereik: ref.punten.length ? [tMin + 1, tMax - 1] : null,
    totaal: { gas: som('gas'), verwacht: fit ? som('verwacht') : null, dagen: som('dagen'), gd: som('gd') },
  };
}

function graaddagVan(a, datum) { return a.perDag.get(datum)?.graaddag ?? null; }
