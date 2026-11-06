// Rekenwerk voor de analyses van versie 1.29–1.37: tijdvakken verschuiven, thuisbatterij, dynamisch
// contract, warmtepomp, CO₂, zon tegenover instraling en opvallende dagen.
// Geen DOM hier, zodat het los te testen is.

import { totaal, zonPeriode, maandenMetZon } from './model.js';
import { TIJDVAKKEN, tijdvak, urenVanDag, contractOp, kostenDag } from './tarief.js';
import { stooklijn, mediaan, contractNaSaldering } from './analyse.js';
import { addDays, eachDay, weekday, monthKey, maandStart, maandEinde, fmtMaand, fmtMaandKort } from './tijd.js';

const n = (v) => (Number.isFinite(v) ? v : 0);
const som = (arr) => arr.reduce((s, x) => s + (x || 0), 0);

/** Maanden (vakjes) tussen van en tot, afgekapt op het bereik. */
export function maandVakjes(van, tot) {
  const out = [];
  for (let mk = monthKey(van); mk <= monthKey(tot);) {
    const v = maandStart(mk) < van ? van : maandStart(mk);
    const t = maandEinde(mk) > tot ? tot : maandEinde(mk);
    out.push({ maand: mk, van: v, tot: t, label: fmtMaand(mk), kort: fmtMaandKort(mk) });
    const [y, m] = mk.split('-').map(Number);
    mk = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  }
  return out;
}

/** Stroomtarief (levering + energiebelasting, € per kWh) in een uur volgens een contract. */
export const uurTarief = (c, datum, uur) => (c ? n(c.stroomLevering?.[tijdvak(datum, uur)]) + n(c.stroomEb) : 0);

/** Gemiddeld tarief over de 24 uren van een dag (alsof je elk uur evenveel verbruikt). */
export function dagTarief(c, datum) {
  if (!c) return null;
  let s = 0; for (let u = 0; u < 24; u++) s += uurTarief(c, datum, u);
  return s / 24;
}

// ---------- Verschuiven naar een goedkoper tijdvak ----------

/**
 * Hoeveel je bespaart als je een deel (`aandeel`, 0–1) van je afname in de duurdere uren van een dag
 * naar het goedkoopste tijdvak van diezelfde dag verplaatst (bijv. de wasmachine van 's avonds naar 12–16 uur).
 * Met én zonder saldering gelijk: het verschil zit alleen in het tarief van de tijdvakken.
 */
export function verschuifTijdvak(a, van, tot, aandeel) {
  const per = Object.fromEntries(TIJDVAKKEN.map((t) => [t.key, { kwh: 0, euro: 0 }]));
  let geschat = false; let dagen = 0;
  const maanden = maandVakjes(van, tot).map((m) => ({ ...m, kwh: 0, besparing: 0, dagen: 0 }));
  let verschuif = 0; let besparing = 0;
  for (const m of maanden) {
    for (const d of eachDay(m.van, m.tot)) {
      const dag = a.perDag.get(d)?.dag;
      const c = contractOp(a.contracten, d);
      if (!dag || dag.afname == null || !c) continue;
      const u = urenVanDag(dag, a.profielen);
      if (u.geschat) geschat = true;
      dagen++; m.dagen++;
      let goedkoopst = Infinity;
      for (let h = 0; h < 24; h++) goedkoopst = Math.min(goedkoopst, uurTarief(c, d, h));
      for (let h = 0; h < 24; h++) {
        const kwh = u.afname[h] || 0; const p = uurTarief(c, d, h);
        const tv = per[tijdvak(d, h)];
        tv.kwh += kwh; tv.euro += kwh * p;
        if (p > goedkoopst + 1e-9) {
          const x = kwh * aandeel;
          verschuif += x; besparing += x * (p - goedkoopst);
          m.kwh += x; m.besparing += x * (p - goedkoopst);
        }
      }
    }
  }
  const kwh = som(Object.values(per).map((t) => t.kwh)); const euro = som(Object.values(per).map((t) => t.euro));
  return { per, kwh, euro, gemPrijs: kwh ? euro / kwh : null, verschuif, besparing, maanden, dagen, geschat };
}

// ---------- Stroomkosten van een dag met aangepaste uurwaarden ----------

/** De terugleverregels met saldering (van het contract op die dag, of het laatste met saldering). */
function salderingRegels(a, c) {
  if (c?.terug?.regeling === 'saldering') return c.terug;
  return a.contracten.filter((k) => k.terug?.regeling === 'saldering').sort((p, q) => (p.van < q.van ? 1 : -1))[0]?.terug || null;
}

/**
 * Variabele stroomkosten (afname + teruglevering, zonder vaste kosten) van een dag met eigen uurwaarden,
 * met saldering (`met`) en na saldering (`na`). Levering en energiebelasting van het contract op die dag.
 */
export function stroomKosten(a, datum, uurAfname, uurTerug, na = contractNaSaldering(a)) {
  const c = contractOp(a.contracten, datum);
  if (!c) return null;
  const dag = { datum, uurAfname, uurTerug, afname: som(uurAfname), terug: som(uurTerug), gas: 0 };
  const metR = salderingRegels(a, c);
  const k = (terug) => { const x = kostenDag(dag, { ...c, terug, vastStroom: {}, vastGas: {} }, a.profielen); return x.stroom + x.terug; };
  return {
    met: metR ? k({ ...metR, vasteKostenJaar: 0 }) : null,
    na: na ? k(na.terug) : null,
  };
}

// ---------- Thuisbatterij ----------

/**
 * Simuleert een thuisbatterij per uur over de dagen met echte uurgegevens (in volgorde; bij een gat begint
 * de batterij leeg). Laadt met teruglevering, ontlaadt bij afname. `rendement` is heen-en-terug (bijv. 0,9).
 */
export function batterij(a, van, tot, { kwh: cap, kw, rendement }) {
  const eta = Math.sqrt(rendement);
  const na = contractNaSaldering(a);
  let soc = 0; let vorige = null;
  const maanden = maandVakjes(van, tot).map((m) => ({ ...m, geladen: 0, ontladen: 0, metVoor: 0, metNa: 0, naVoor: 0, naNa: 0, dagen: 0 }));
  for (const m of maanden) {
    for (const d of eachDay(m.van, m.tot)) {
      const dag = a.perDag.get(d)?.dag;
      if (!dag?.uurAfname) { soc = 0; vorige = null; continue; }
      if (vorige && addDays(vorige, 1) !== d) soc = 0;
      vorige = d;
      const af = []; const te = [];
      for (let h = 0; h < 24; h++) {
        const afH = dag.uurAfname[h] || 0; const teH = dag.uurTerug?.[h] || 0;
        const lad = Math.max(0, Math.min(teH, kw, (cap - soc) / eta));
        soc += lad * eta;
        const ont = Math.max(0, Math.min(afH, kw, soc * eta));
        soc -= ont / eta;
        af.push(afH - ont); te.push(teH - lad);
        m.geladen += lad; m.ontladen += ont;
      }
      const voor = stroomKosten(a, d, dag.uurAfname, dag.uurTerug || new Array(24).fill(0), na);
      const met = stroomKosten(a, d, af, te, na);
      if (!voor || !met) continue;
      m.dagen++;
      m.metVoor += n(voor.met); m.metNa += n(met.met); m.naVoor += n(voor.na); m.naNa += n(met.na);
    }
  }
  const t = Object.fromEntries(['geladen', 'ontladen', 'metVoor', 'metNa', 'naVoor', 'naNa', 'dagen'].map((k) => [k, som(maanden.map((m) => m[k]))]));
  return { maanden, totaal: t, na, cycli: cap ? t.ontladen / cap : 0 };
}

// ---------- Dynamisch contract ----------

/** Sleutel voor een uurprijs: "2026-10-01T05" (lokale tijd, het uur dat om 05:00 begint). */
export const prijsSleutel = (datum, uur) => `${datum}T${String(uur).padStart(2, '0')}`;

/**
 * Stroomkosten met een dynamisch contract (uurprijs van de stroombeurs) tegenover je eigen contract,
 * beide met de regels van na de saldering (afname en teruglevering apart). Alleen dagen met echte
 * uurgegevens én 24 uurprijzen.
 * Afname: (beursprijs + inkoopvergoeding) × btw + energiebelasting. Teruglevering: beursprijs − terugleveropslag (zonder btw).
 */
export function dynamisch(a, van, tot, prijzen, { opslag, terugOpslag, btw = 0.21 }) {
  const na = contractNaSaldering(a);
  let geenPrijs = 0;
  const maanden = maandVakjes(van, tot).map((m) => ({ ...m, vast: 0, dyn: 0, afname: 0, terug: 0, afEuro: 0, teEuro: 0, beurs: 0, dagen: 0, negatief: 0 }));
  for (const m of maanden) {
    for (const d of eachDay(m.van, m.tot)) {
      const dag = a.perDag.get(d)?.dag;
      const c = contractOp(a.contracten, d);
      if (!dag?.uurAfname || !c) continue;
      const p = []; for (let h = 0; h < 24; h++) p.push(prijzen.get(prijsSleutel(d, h)));
      if (p.some((x) => x == null)) { geenPrijs++; continue; }
      const eigen = stroomKosten(a, d, dag.uurAfname, dag.uurTerug || new Array(24).fill(0), na);
      if (eigen?.na == null) continue;
      let dyn = 0;
      for (let h = 0; h < 24; h++) {
        const af = dag.uurAfname[h] || 0; const te = dag.uurTerug?.[h] || 0;
        const afE = af * ((p[h] + opslag) * (1 + btw) + n(c.stroomEb));
        const teE = te * (p[h] - terugOpslag);
        dyn += afE - teE;
        m.afname += af; m.terug += te; m.afEuro += afE; m.teEuro += teE; m.beurs += p[h] / 24;
        if (p[h] < 0 && te > 0.01) m.negatief += te;
      }
      m.vast += eigen.na; m.dyn += dyn; m.dagen++;
    }
  }
  const t = Object.fromEntries(['vast', 'dyn', 'afname', 'terug', 'afEuro', 'teEuro', 'beurs', 'dagen', 'negatief'].map((k) => [k, som(maanden.map((m) => m[k]))]));
  return { maanden, totaal: t, na, geenPrijs };
}

// ---------- Warmtepomp ----------

/** kWh warmte die de cv-ketel per m³ gas aan het huis levert (9,77 kWh per m³ × rendement ~90%). */
export const WARMTE_PER_M3 = 8.8;
/** Rendement (COP) van een lucht-water warmtepomp bij een buitentemperatuur, voor lage of hoge watertemperatuur. */
export const cop = (t, afgifte) => Math.min(5, Math.max(1.8, 3.3 + 0.08 * t - (afgifte === 'radiatoren' ? 0.6 : 0)));
/** COP voor warm water (60 °C): lager dan voor verwarming. */
export const COP_WARM_WATER = 2.5;

/**
 * Wat een warmtepomp met jouw gasverbruik had gedaan. Het vaste deel van de stooklijn is warm water en koken,
 * de rest is verwarming. Hybride: de warmtepomp doet de verwarming tot zijn vermogen (`kw`, max. 20 uur per dag),
 * de ketel de rest en het warm water. Volledig (all-electric): alle warmte en warm water elektrisch; de vaste
 * gaskosten vervallen. Stroom tegen het daggemiddelde van je tarief (zonder saldering: zoals vanaf 2027).
 */
export function warmtepomp(a, van, tot, { type, kw, afgifte }) {
  // Stooklijn uit de gekozen periode; te weinig stookdagen → het laatste jaar met gegevens.
  let fit = stooklijn(a, van, tot).fit;
  if (!fit) fit = stooklijn(a, addDays(a.laatste, -364), a.laatste).fit;
  const maanden = maandVakjes(van, tot).map((m) => ({ ...m, gas: 0, gasWeg: 0, gasEuro: 0, kwh: 0, stroomEuro: 0, vastGas: 0, warmte: 0, wpWarmte: 0, dagen: 0, copSom: 0 }));
  if (!fit) return { fit: null, maanden, totaal: null };
  for (const m of maanden) {
    for (const d of eachDay(m.van, m.tot)) {
      const x = a.perDag.get(d);
      const t = (x?.weer ?? a.weer.get(d))?.tgem;
      const c = contractOp(a.contracten, d);
      if (x?.dag?.gas == null || t == null || !c) continue;
      const gas = x.dag.gas;
      const ww = Math.min(gas, fit.vast); const stook = gas - ww;
      const warmte = stook * WARMTE_PER_M3;
      const wp = type === 'volledig' ? warmte : Math.min(warmte, kw * 20);
      const k = cop(t, afgifte);
      let kwh = wp / k; let gasWeg = wp / WARMTE_PER_M3;
      if (type === 'volledig') { kwh += (ww * WARMTE_PER_M3) / COP_WARM_WATER; gasWeg = gas; m.vastGas += n(c.vastGas?.levering) + n(c.vastGas?.netbeheer); }
      m.gas += gas; m.gasWeg += gasWeg; m.gasEuro += gasWeg * (n(c.gasLevering) + n(c.gasEb));
      m.kwh += kwh; m.stroomEuro += kwh * dagTarief(c, d);
      m.warmte += warmte; m.wpWarmte += wp; m.dagen++; m.copSom += k * wp;
    }
  }
  const tt = Object.fromEntries(['gas', 'gasWeg', 'gasEuro', 'kwh', 'stroomEuro', 'vastGas', 'warmte', 'wpWarmte', 'dagen', 'copSom'].map((k) => [k, som(maanden.map((m) => m[k]))]));
  tt.besparing = tt.gasEuro + tt.vastGas - tt.stroomEuro;
  tt.scop = tt.wpWarmte ? tt.copSom / tt.wpWarmte : null;
  for (const m of maanden) m.besparing = m.gasEuro + m.vastGas - m.stroomEuro;
  return { fit, maanden, totaal: tt };
}

// ---------- CO₂ ----------

/** CO₂ per maand: gas en stroom afname tellen, teruggeleverde stroom vermijdt uitstoot elders. */
export function co2(a, van, tot, { stroom, gas }) {
  const maanden = maandVakjes(van, tot).map((m) => {
    const t = totaal(a, m.van, m.tot);
    const g = t.dagenGas ? t.gas * gas : 0; const af = t.dagenAfname ? t.afname * stroom : 0; const te = t.dagenAfname ? t.terug * stroom : 0;
    return { ...m, gas: g, afname: af, terug: te, netto: g + af - te, dagen: t.dagen, m3: t.gas, kwhAf: t.afname, kwhTe: t.terug };
  });
  const tt = Object.fromEntries(['gas', 'afname', 'terug', 'netto', 'dagen', 'm3', 'kwhAf', 'kwhTe'].map((k) => [k, som(maanden.map((m) => m[k]))]));
  return { maanden, totaal: tt };
}

// ---------- Zonne-opbrengst tegenover instraling ----------

/**
 * Per maand met zonne-opbrengst: de instraling (kWh per m², uit `straling`: MJ/m² per dag) en de verhouding
 * opbrengst / instraling. De prestatie-index vergelijkt die verhouding met de mediaan van dezelfde kalendermaand
 * in alle jaren (de zon staat in december anders dan in juni, dus alleen maand met maand).
 */
export function zonPrestatie(a, straling, vandaag) {
  const rijen = [];
  for (const mk of maandenMetZon(a)) {
    const me = maandEinde(mk) < vandaag ? maandEinde(mk) : addDays(vandaag, -1);
    if (me < maandStart(mk)) continue;
    const z = zonPeriode(a, maandStart(mk), me, { heleMaanden: true });
    if (!z || !z.zon) continue;
    let mj = 0; let mis = 0; let dagen = 0;
    for (const d of eachDay(maandStart(mk), me)) { const s = straling.get(d); dagen++; if (s == null) mis++; else mj += s; }
    if (mis > 2) { rijen.push({ maand: mk, zon: z.zon, instraling: null, ratio: null, onvolledig: z.onvolledig }); continue; }
    const kwhM2 = (mj / 3.6) * (dagen / (dagen - mis));
    rijen.push({ maand: mk, zon: z.zon, instraling: kwhM2, ratio: kwhM2 > 0 ? z.zon / kwhM2 : null, onvolledig: z.onvolledig || me < maandEinde(mk) });
  }
  const perKalender = {};
  for (const r of rijen) if (r.ratio != null && !r.onvolledig) (perKalender[r.maand.slice(5)] ??= []).push(r.ratio);
  for (const r of rijen) {
    const lijst = perKalender[r.maand.slice(5)] || [];
    const med = lijst.length >= 2 ? mediaan(lijst) : null;
    r.index = r.ratio != null && med ? r.ratio / med : null;
    r.vergelijkbaar = lijst.length;
  }
  const jaren = {};
  for (const r of rijen) {
    if (r.instraling == null) continue;
    const j = (jaren[r.maand.slice(0, 4)] ??= { jaar: r.maand.slice(0, 4), zon: 0, instraling: 0, maanden: 0 });
    j.zon += r.zon; j.instraling += r.instraling; j.maanden++;
  }
  return { rijen, jaren: Object.values(jaren).map((j) => ({ ...j, ratio: j.instraling ? j.zon / j.instraling : null })) };
}

// ---------- Opvallende dagen ----------

/** Gevoeligheid: hoeveel keer de gewone spreiding en hoeveel procent een dag minstens moet afwijken. */
/** Bij "zonder grote verbruikers" tellen uren met meer afname dan dit (kWh) niet mee, zoals de auto laden. */
export const UUR_MAX = 2;

export const GEVOELIGHEID = { laag: { k: 3.5, rel: 0.6 }, normaal: { k: 2.5, rel: 0.4 }, hoog: { k: 1.8, rel: 0.25 } };

/**
 * Dagen die flink afwijken van wat je mocht verwachten.
 * Stroom: verwacht = mediaan van dezelfde weekdag in de 8 weken ervoor (minstens 4 dagen nodig);
 *   de gewone spreiding = de mediane afwijking van die dagen (zo valt een vaste gewoonte, zoals elke
 *   dinsdag de auto laden, niet op, maar een dinsdag zonder of een zaterdag mét wel).
 * Gas: verwacht = je stooklijn (laatste 365 dagen tot het eind van de periode) bij de temperatuur van die dag;
 *   de gewone spreiding = hoe ver dagen gemiddeld van die lijn liggen.
 * Opvallend = de afwijking is groter dan k × de spreiding, groter dan `rel` × verwacht en groter dan een
 * vast minimum (2 kWh of 1 m³).
 */
export function opvallend(a, van, tot, { maat, gevoeligheid = 'normaal' }) {
  const g = GEVOELIGHEID[gevoeligheid] || GEVOELIGHEID.normaal;
  const gas = maat === 'gas';
  // 'basis': stroom zonder grote verbruikers; uren met meer dan UUR_MAX kWh tellen niet mee (alleen dagen met uurgegevens).
  const waardeVan = (dag) => {
    if (gas) return dag?.gas;
    if (maat === 'basis') return dag?.uurAfname ? som(dag.uurAfname.map((x) => ((x || 0) > UUR_MAX ? 0 : x || 0))) : null;
    return dag?.afname;
  };
  const sl = gas ? stooklijn(a, addDays(tot, -364), tot) : null;
  const fit = gas ? (sl.fit || stooklijn(a, a.eerste, a.laatste).fit) : null;
  const rmse = fit ? Math.sqrt(fit.sse / Math.max(1, (sl.fit ? sl.punten.length : 14))) : null;
  const minimum = gas ? 1 : maat === 'basis' ? 1.5 : 2;
  const dagen = [];
  let bekeken = 0;
  const WD = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  for (const d of eachDay(van, tot)) {
    const x = a.perDag.get(d);
    const v = waardeVan(x?.dag);
    if (v == null) continue;
    let verwacht = null; let spreiding = 0; let hoe = '';
    if (gas) {
      const t = (x.weer ?? a.weer.get(d))?.tgem;
      if (!fit || t == null) continue;
      verwacht = fit.voorspel(t); spreiding = rmse; hoe = `stooklijn bij ${String(t).replace('.', ',')} °C`;
    } else {
      const ref = [];
      for (let w = 1; w <= 8; w++) { const r = waardeVan(a.perDag.get(addDays(d, -7 * w))?.dag); if (r != null) ref.push(r); }
      if (ref.length < 4) continue;
      verwacht = mediaan(ref);
      spreiding = 1.4826 * mediaan(ref.map((r) => Math.abs(r - verwacht)));
      hoe = `${ref.length} vorige ${WD[weekday(d)]}en`;
    }
    bekeken++;
    const verschil = v - verwacht;
    const rel = verwacht > 0.1 ? verschil / verwacht : null;
    if (Math.abs(verschil) >= Math.max(minimum, g.k * spreiding, g.rel * Math.abs(verwacht))) {
      dagen.push({ datum: d, waarde: v, verwacht, verschil, rel, hoe, opmerking: x.dag.opmerking || '' });
    }
  }
  dagen.sort((p, q) => Math.abs(q.verschil) - Math.abs(p.verschil));
  return { dagen, bekeken, fit };
}
