// Gasprognose: hoeveel gas je de rest van de maand (of de komende dagen) nog gaat gebruiken,
// met je stooklijn en de weersvoorspelling van Open-Meteo.
//
// Temperatuur per dag, in deze volgorde:
//  1. gemeten (voor dagen tot en met gisteren),
//  2. de weersvoorspelling (Open-Meteo, tot 16 dagen vooruit),
//  3. "normaal": het gemiddelde van die kalenderdag (± 3 dagen) over de afgelopen 10 jaar.
// Voorspelling en normalen worden op dit apparaat bewaard (localStorage, openbare gegevens),
// zodat de analyse ook zonder internet de laatst opgehaalde voorspelling toont.

import { h, today } from '../core/dom.js';
import { APP } from '../config.js';
import { staafGrafiek } from './grafiek.js';
import { stooklijn } from './analyse.js';
import { contractOp } from './tarief.js';
import { totaal } from './model.js';
import { addDays, daysBetween, eachDay, fmtDatumKort, fmtDag, fmtMaand, maandEinde, monthKey, sameDayLastYear } from './tijd.js';
import { kaart, veld, fmtGetal, euro } from './ui.js';

const RECENT = 'https://api.open-meteo.com/v1/forecast';
const ARCHIEF = 'https://archive-api.open-meteo.com/v1/archive';
const VOORSPELLING_KEY = `${APP.storagePrefix}:weervoorspelling`;
const NORMAAL_KEY = `${APP.storagePrefix}:normaaltemperatuur`;
/** Na zoveel minuten wordt de voorspelling opnieuw opgehaald. */
const VERS_MINUTEN = 180;
/** Hoeveel graden warmer/kouder voor de bandbreedte. */
export const SCENARIO_GRADEN = 2;

export const GASPROGNOSE_STANDAARD = { gpHorizon: 'maand' };
const HORIZON = [['maand', 'Rest van deze maand'], ['7', 'Komende 7 dagen'], ['14', 'Komende 14 dagen']];

const m3 = (v, d = 0) => `${fmtGetal(v, d)} m³`;
const r1 = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

function leesCache(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } }
function bewaarCache(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch { /* geen opslag: alleen in het geheugen */ } }

const geheugen = { voorspelling: undefined, normaal: undefined };
let bezig = null;

async function haalJson(url) {
  let res;
  try { res = await fetch(url); } catch { throw new Error('geen verbinding met de weerdienst'); }
  if (!res.ok) throw new Error(`de weerdienst antwoordde met ${res.status}`);
  const j = await res.json();
  const d = j.daily || {};
  return (d.time || []).map((datum, i) => [datum, r1(d.temperature_2m_mean?.[i])]).filter(([, t]) => t != null);
}

/** Opgeslagen voorspelling: { opgehaald: ms, plek: 'lat,lon', t: { datum: tgem } } of null. */
export function voorspelling() {
  if (geheugen.voorspelling === undefined) geheugen.voorspelling = leesCache(VOORSPELLING_KEY);
  return geheugen.voorspelling;
}
/** Normaaltemperatuur per kalenderdag: { jaar, plek, t: { 'mm-dd': tgem } } of null. */
export function normalen() {
  if (geheugen.normaal === undefined) geheugen.normaal = leesCache(NORMAAL_KEY);
  return geheugen.normaal;
}

const plekVan = ({ lat, lon }) => `${lat},${lon}`;

/** Moet er iets opgehaald worden (geen of oude voorspelling, normalen van een ander jaar of andere plek)? */
export function weerNodig(loc, vandaag) {
  const v = voorspelling(); const n = normalen(); const plek = plekVan(loc);
  const oud = !v || v.plek !== plek || Date.now() - v.opgehaald > VERS_MINUTEN * 60_000 || !v.t?.[vandaag];
  return oud || !n || n.plek !== plek || n.jaar !== vandaag.slice(0, 4);
}

/** Haalt voorspelling (en zo nodig de normalen) op. De gemeten temperaturen van deze maand komen mee. */
export function haalWeer(loc, vandaag) {
  if (bezig) return bezig;
  bezig = (async () => {
    const plek = plekVan(loc);
    const q = `latitude=${loc.lat}&longitude=${loc.lon}&timezone=Europe%2FAmsterdam&daily=temperature_2m_mean`;
    // Terug tot het begin van de maand (voor dagen die nog niet in de app staan), 16 dagen vooruit.
    const terug = Math.min(31, Number(vandaag.slice(8, 10)) - 1 + 7);
    const v = await haalJson(`${RECENT}?${q}&past_days=${terug}&forecast_days=16`);
    geheugen.voorspelling = { opgehaald: Date.now(), plek, t: Object.fromEntries(v) };
    bewaarCache(VOORSPELLING_KEY, geheugen.voorspelling);
    const n = normalen();
    const jaar = Number(vandaag.slice(0, 4));
    if (!n || n.plek !== plek || n.jaar !== String(jaar)) {
      const rij = await haalJson(`${ARCHIEF}?${q}&start_date=${jaar - 10}-01-01&end_date=${jaar - 1}-12-31`);
      geheugen.normaal = { jaar: String(jaar), plek, t: berekenNormalen(rij) };
      bewaarCache(NORMAAL_KEY, geheugen.normaal);
    }
  })().finally(() => { bezig = null; });
  return bezig;
}

/** Gemiddelde temperatuur per kalenderdag over alle jaren, met de 3 dagen ervoor en erna (minder grillig). */
export function berekenNormalen(rij) {
  const per = new Map(rij);
  const uit = {};
  for (const d of eachDay('2024-01-01', '2024-12-31')) {
    let som = 0; let n = 0;
    for (const [datum, t] of rij) {
      if (datum.slice(5) !== d.slice(5)) continue;
      for (let i = -3; i <= 3; i++) {
        const w = per.get(addDays(datum, i));
        if (w != null) { som += w; n++; }
      }
    }
    if (n) uit[d.slice(5)] = Math.round((som / n) * 10) / 10;
  }
  return uit;
}

/**
 * De prognose zelf (zonder ophalen). `weer`: { voorspelling: {datum: t}, normaal: {'mm-dd': t} }.
 * Dagen vóór vandaag met gas tellen zoals gemeten; alle andere dagen worden geschat met de stooklijn
 * van de laatste 365 dagen met gegevens.
 */
export function gasPrognose(a, horizon, vandaag, weer) {
  const van = horizon === 'maand' ? `${monthKey(vandaag)}-01` : vandaag;
  const tot = horizon === 'maand' ? maandEinde(monthKey(vandaag)) : addDays(vandaag, Number(horizon) - 1);
  const sl = stooklijn(a, addDays(a.laatste, -364), a.laatste);
  const fit = sl.fit;
  if (!fit) return { van, tot, fit: null };
  const sigma = sl.punten.length > 2 ? Math.sqrt(fit.sse / (sl.punten.length - 2)) : 0;
  const gemeten = (d) => (a.perDag.get(d)?.weer ?? a.weer.get(d))?.tgem ?? null;
  const prijs = (d) => { const c = contractOp(a.contracten, d); return c ? (Number(c.gasLevering) || 0) + (Number(c.gasEb) || 0) : null; };

  const dagen = []; const som = { echt: 0, gemist: 0, verwacht: 0, warm: 0, koud: 0, kosten: 0, model: 0 };
  let kostenCompleet = true;
  for (const d of eachDay(van, tot)) {
    const gas = a.perDag.get(d)?.dag?.gas;
    const verleden = d < vandaag;
    let t = null; let bron = null;
    if (verleden && gemeten(d) != null) { t = gemeten(d); bron = 'gemeten'; } else if (weer.voorspelling?.[d] != null) { t = weer.voorspelling[d]; bron = verleden ? 'gemeten' : 'voorspelling'; } else if (weer.normaal?.[d.slice(5)] != null) { t = weer.normaal[d.slice(5)]; bron = 'normaal'; }
    const dag = { datum: d, t, bron };
    if (verleden && gas != null) {
      dag.gas = gas; dag.soort = 'echt'; som.echt += gas;
      if (t != null) som.model += fit.voorspel(t);
    } else if (t != null) {
      dag.gas = fit.voorspel(t); dag.soort = verleden ? 'gemist' : 'verwacht';
      som[dag.soort] += dag.gas;
      // Bandbreedte alleen voor dagen die nog moeten komen; voor gemiste dagen is de temperatuur gemeten.
      const onzeker = verleden ? 0 : SCENARIO_GRADEN;
      som.warm += fit.voorspel(t + onzeker); som.koud += fit.voorspel(t - onzeker);
    } else {
      dag.gas = null; dag.soort = 'onbekend';
    }
    const p = prijs(d);
    if (dag.gas != null) { if (p == null) kostenCompleet = false; else som.kosten += dag.gas * p; }
    dagen.push(dag);
  }
  // Hoe goed de stooklijn deze maand tot nu toe klopte (alleen dagen met gas en temperatuur).
  const metModel = dagen.filter((x) => x.soort === 'echt' && x.t != null);
  const echtMetModel = metModel.reduce((s, x) => s + x.gas, 0);
  const vj = totaal(a, sameDayLastYear(van), sameDayLastYear(tot));
  const nVerwacht = dagen.filter((x) => x.soort === 'verwacht').length;
  return {
    van, tot, fit, sigma, dagen, som, kostenCompleet,
    totaal: som.echt + som.gemist + som.verwacht,
    rest: som.gemist + som.verwacht,
    band: [som.echt + som.gemist + som.warm, som.echt + som.gemist + som.koud],
    nVerwacht,
    afwijking: metModel.length >= 3 && som.model > 0 ? { dagen: metModel.length, echt: echtMetModel, model: som.model } : null,
    vorigJaar: vj.dagenGas >= daysBetween(van, tot) ? vj.gas : null,
    bronnen: dagen.reduce((o, x) => { if (x.soort !== 'echt' && x.bron) o[x.bron] = (o[x.bron] || 0) + 1; return o; }, {}),
  };
}

// ---------- Soort analyse ----------

const keuze = (waarde, opties, onChange) => h('select', { onChange: (e) => onChange(e.target.value) },
  opties.map(([k, t]) => h('option', { value: k, selected: k === waarde }, t)));
const kpi = (titel, waarde, uitleg, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, titel), h('strong', { class: `kpi-waarde ${cls}` }, waarde), uitleg ? h('span', { class: 'kpi-verschil muted' }, uitleg) : null);

export const gasPrognoseSoort = {
  key: 'gasprognose', groep: 'gas',
  kort: 'Gasprognose',
  uitleg: 'Hoeveel gas nog, met de weersverwachting',
  naam: 'Gasprognose met de weersverwachting',
  geenPeriode: true,
  velden: (c, wijzig) => [veld('Voor', keuze(c.gpHorizon, HORIZON, (v) => wijzig({ gpHorizon: v })))],
  resultaat(a, c) {
    const nu = today();
    const inst = a.data?.instellingen || {};
    const loc = { lat: inst.lat ?? 51.44, lon: inst.lon ?? 5.48 };
    const horizon = HORIZON.some(([k]) => k === c.gpHorizon) ? c.gpHorizon : 'maand';
    const teken = (fout) => kaarten(a, horizon, nu, fout);
    if (!weerNodig(loc, nu)) return teken();
    const plek = h('div', { class: 'analyse-laad' }, kaart('Gasprognose', h('p', { class: 'muted' }, 'Weersvoorspelling ophalen…')));
    haalWeer(loc, nu).then(() => plek.replaceChildren(...[].concat(teken())))
      .catch((e) => plek.replaceChildren(...[].concat(teken(e.message))));
    return plek;
  },
};

function kaarten(a, horizon, nu, fout) {
  const v = voorspelling(); const n = normalen();
  if (!v && !n) {
    return kaart('Gasprognose', h('p', { class: 'muted' }, `Ophalen van de weersvoorspelling lukte niet${fout ? `: ${fout}` : ''}. Controleer de internetverbinding en open de analyse opnieuw.`));
  }
  const p = gasPrognose(a, horizon, nu, { voorspelling: v?.t, normaal: n?.t });
  if (!p.fit) {
    return kaart('Gasprognose', h('p', { class: 'muted' }, 'Nog geen stooklijn: daarvoor zijn minstens 14 dagen met gas én temperatuur nodig, met verschil tussen warme en koude dagen. Lees gasgegevens in via Invoer → Bestanden inlezen.'));
  }
  const maand = horizon === 'maand';
  const titel = maand ? `Gasprognose ${fmtMaand(monthKey(nu))}` : `Gasprognose komende ${horizon} dagen`;
  const vjCls = p.vorigJaar != null ? (p.totaal > p.vorigJaar * 1.02 ? 'is-slecht' : p.totaal < p.vorigJaar * 0.98 ? 'is-goed' : '') : '';
  const kpis = h('div', { class: 'kpi-raster analyse-kpi' },
    kpi(maand ? 'Verwacht hele maand' : 'Verwacht', m3(p.totaal), `tussen ${m3(p.band[0])} en ${m3(p.band[1])}`),
    maand ? kpi('Al gebruikt', m3(p.som.echt), p.som.gemist > 0.05 ? `+ ${m3(p.som.gemist, 1)} geschat voor dagen zonder gegevens` : `t/m ${fmtDatumKort(addDays(nu, -1))}`) : null,
    kpi(maand ? 'Nog te gaan' : 'Per dag gemiddeld', maand ? m3(p.som.verwacht) : m3(p.totaal / p.dagen.length, 1), maand ? `${p.nVerwacht} dagen, vanaf vandaag` : `${p.dagen.length} dagen`),
    p.vorigJaar != null ? kpi('Zelfde dagen vorig jaar', m3(p.vorigJaar), `${p.totaal > p.vorigJaar ? '+' : '−'}${fmtGetal(Math.abs(p.totaal - p.vorigJaar) / (p.vorigJaar || 1) * 100, 0)}% verwacht`, vjCls) : null,
    p.kostenCompleet ? kpi('Gaskosten (variabel)', euro(p.som.kosten), 'levering + energiebelasting, zonder vaste kosten') : null);

  const korte = p.dagen.map((x) => String(Number(x.datum.slice(8, 10))));
  const grafiek = staafGrafiek({
    labels: p.dagen.map((x) => `${fmtDag(x.datum)}${x.soort === 'echt' ? '' : x.soort === 'onbekend' ? '' : ' (verwacht)'}`),
    korteLabels: korte,
    waarden: p.dagen.map((x) => x.gas),
    markeer: p.dagen.map((x) => x.soort !== 'echt'),
    fmt: (w, as) => (as ? fmtGetal(w, Number.isInteger(w) ? 0 : 1) : m3(w, 1)),
    naam: 'Gas per dag',
    lijn: { naam: 'Temperatuur', waarden: p.dagen.map((x) => x.t), fmt: (w, as) => `${fmtGetal(w, as && Number.isInteger(w) ? 0 : 1)} °C` },
    toelichting: (i) => ({ gemeten: 'temperatuur gemeten', voorspelling: 'weersvoorspelling', normaal: 'normale temperatuur' })[p.dagen[i].bron] || null,
  });

  const bronTekst = { gemeten: 'gemeten', voorspelling: 'voorspelling', normaal: 'normaal' };
  const rijen = p.dagen.map((x) => h('tr', { class: x.datum === nu ? 'is-vandaag' : '' },
    h('td', {}, fmtDag(x.datum)),
    h('td', { class: 'num' }, x.t == null ? '–' : `${fmtGetal(x.t, 1)} °C`),
    h('td', { class: 'verberg-smal muted' }, x.soort === 'echt' ? 'gemeten' : bronTekst[x.bron] || '–'),
    h('td', { class: `num${x.soort === 'echt' ? '' : ' is-geschat'}` }, x.gas == null ? '–' : fmtGetal(x.gas, 1))));
  const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Dag'), h('th', { class: 'num' }, 'Temp.'), h('th', { class: 'verberg-smal' }, 'Bron'), h('th', { class: 'num' }, 'Gas (m³)'))),
    h('tbody', {},
      h('tr', { class: 'jaar-rij' }, h('th', { scope: 'row' }, 'Totaal'), h('td', {}), h('td', { class: 'verberg-smal' }), h('td', { class: 'num' }, fmtGetal(p.totaal, 0))),
      rijen)));

  const opgehaald = v ? new Date(v.opgehaald) : null;
  let opgehaaldTekst = '';
  if (opgehaald) {
    const tijd = opgehaald.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    const dag = `${opgehaald.getFullYear()}-${String(opgehaald.getMonth() + 1).padStart(2, '0')}-${String(opgehaald.getDate()).padStart(2, '0')}`;
    opgehaaldTekst = `weersvoorspelling van ${dag === nu ? 'vandaag' : fmtDatumKort(dag)} ${tijd}`;
  }
  const afw = p.afwijking;
  const afwTekst = afw
    ? (() => { const pct = (afw.echt - afw.model) / afw.model * 100; return ` Deze maand tot nu toe gebruikte je ${fmtGetal(Math.abs(pct), 0)}% ${pct >= 0 ? 'meer' : 'minder'} dan de stooklijn bij dat weer zou zeggen (${m3(afw.echt)} tegen ${m3(afw.model)} over ${afw.dagen} dagen); de prognose gaat uit van je gewone stookgedrag.`; })()
    : '';
  const b = p.bronnen;
  const bronDelen = [b.voorspelling ? `${b.voorspelling} dagen met de weersvoorspelling` : '', b.normaal ? `${b.normaal} dagen met de normale temperatuur (verder vooruit dan de voorspelling reikt)` : '', b.gemeten ? `${b.gemeten} dagen zonder gasgegevens met de gemeten temperatuur` : ''].filter(Boolean);

  return kaart(titel,
    fout ? h('p', { class: 'hint' }, `Nieuwe voorspelling ophalen lukte niet (${fout}); de laatst opgehaalde wordt gebruikt.`) : null,
    h('p', { class: 'hint' }, `${fmtDatumKort(p.van)} – ${fmtDatumKort(p.tot)} · gas bekend t/m ${fmtDatumKort(a.laatste)} · ${opgehaaldTekst}`),
    kpis, grafiek, tabel,
    h('p', { class: 'hint' }, [
      `De verwachting gebruikt je stooklijn van de laatste 365 dagen (vast ${m3(p.fit.vast, 2)} per dag, stookgrens ${fmtGetal(p.fit.stookgrens, 1)} °C, ${m3(p.fit.k, 2)} per graad kouder; zie Stooklijn) met de gemiddelde dagtemperatuur in Eindhoven. `,
      bronDelen.length ? `Geschat: ${bronDelen.join(', ')}. ` : '',
      `De bandbreedte is wat je verbruikt als het de komende dagen gemiddeld ${SCENARIO_GRADEN} graden warmer of kouder wordt dan verwacht. `,
      'Wind, zon en hoe vaak je thuis bent tellen niet mee, dus het blijft een schatting; een weersvoorspelling verder dan een week vooruit is ook onzeker. ',
      'Cursief en lichte staven = geschat. De voorspelling wordt elke 3 uur ververst als je de analyse opent.',
      afwTekst,
    ].join('')));
}
