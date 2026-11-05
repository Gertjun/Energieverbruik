// Controles op de gegevens: verdachte waarden, ontbrekende dagen, maandtotalen,
// steekproef en vergelijking met een andere bron (jaarafrekening, meterstanden).
// Alles wordt berekend uit de gegevens; er wordt niets extra's opgeslagen behalve
// het afvinken van een melding (`gecontroleerd` op de dag).

import { addDays, eachDay, isZomer, monthKey, maandStart, maandEinde, daysBetween, weekday } from './tijd.js';

const DAGEN_VENSTER = 15; // ± dagen rond een dag voor "normaal"
const MATEN = ['afname', 'terug', 'gas'];
export const MAAT_NAAM = { afname: 'Stroom', terug: 'Teruglevering', gas: 'Gas' };
export const MAAT_EENHEID = { afname: 'kWh', terug: 'kWh', gas: 'm³' };
const DREMPEL = { afname: 5, terug: 10, gas: 3 }; // minimaal verschil met normaal
const NACHT_UREN = [23, 0, 1, 2, 3, 4];

/** Vingerafdruk van de waarden van een dag: verandert er iets, dan komt een afgevinkte melding terug. */
export const vingerafdruk = (dag) => `${dag.afname ?? ''}|${dag.terug ?? ''}|${dag.gas ?? ''}`;
export const isAfgevinkt = (dag) => dag?.gecontroleerd != null && dag.gecontroleerd === vingerafdruk(dag);

function mediaan(lijst) {
  if (!lijst.length) return null;
  const s = [...lijst].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const nl = (v, d) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const fmt = (maat, v) => `${nl(v, maat === 'gas' ? 2 : 1)} ${MAAT_EENHEID[maat]}`;

let cache = { a: null };

/**
 * Alle bevindingen. Geeft { lijst, perDag, afgevinkt } met per bevinding
 * { datum, tot?, soort, maat?, ernst: 'fout'|'let op', tekst }.
 */
export function controleer(a) {
  if (cache.a === a) return cache;
  const lijst = [];
  const perDag = new Map();
  let afgevinkt = 0;
  const voegToe = (b, dagen = [b.datum]) => {
    lijst.push(b);
    for (const d of dagen) {
      if (!perDag.has(d)) perDag.set(d, []);
      perDag.get(d).push(b);
    }
  };

  const reeks = (maat) => {
    const m = new Map();
    for (const d of a.dagen) if (d[maat] != null) m.set(d.datum, d[maat]);
    return m;
  };
  const waarden = Object.fromEntries(MATEN.map((m) => [m, reeks(m)]));
  const normaal = (maat, datum) => {
    const om = [];
    for (let i = -DAGEN_VENSTER; i <= DAGEN_VENSTER; i++) {
      if (!i) continue;
      const v = waarden[maat].get(addDays(datum, i));
      if (v != null) om.push(v);
    }
    return om.length >= 7 ? mediaan(om) : null;
  };

  const kandidaten = [];
  for (const dag of a.dagen) {
    const { datum } = dag;
    const x = a.perDag.get(datum);
    const hier = [];

    // 1. Negatieve waarden
    for (const maat of MATEN) {
      if (dag[maat] != null && dag[maat] < 0) hier.push({ datum, soort: 'negatief', maat, ernst: 'fout', tekst: `${MAAT_NAAM[maat]} is negatief (${fmt(maat, dag[maat])}).` });
    }
    // 2. Geen stroomafname: ook met zonnepanelen neem je 's nachts stroom af.
    if (dag.afname === 0) hier.push({ datum, soort: 'nul', maat: 'afname', ernst: 'let op', tekst: 'Geen stroomafname (0 kWh), terwijl je ’s nachts altijd wat afneemt.' });

    // 3. Uitschieters ten opzichte van de dagen eromheen
    for (const maat of MATEN) {
      const v = dag[maat];
      if (v == null || v <= 0) continue;
      const m = normaal(maat, datum);
      if (m == null) continue;
      if (v > 3 * Math.max(m, 0.1) && v - m > DREMPEL[maat]) {
        const factor = v / Math.max(m, 0.01);
        let tekst = `${MAAT_NAAM[maat]} ${fmt(maat, v)} is ${factor >= 10 ? 'veel' : `ruim ${nl(Math.floor(factor), 0)}×`} meer dan normaal rond deze dag (${fmt(maat, m)}).`;
        if (factor >= 300) tekst += ' Mogelijk komma en punt verwisseld, of een verkeerde eenheid (Wh in plaats van kWh, liter in plaats van m³).';
        hier.push({ datum, soort: 'hoog', maat, ernst: factor >= 300 ? 'fout' : 'let op', tekst });
      }
    }

    // 4. Teruglevering 's nachts (alleen met uurverdeling): kolommen of tijden verschoven?
    if (dag.uurTerug) {
      const nacht = NACHT_UREN.reduce((s, u) => s + (dag.uurTerug[u] || 0), 0);
      if (nacht > 0.1) hier.push({ datum, soort: 'nacht', maat: 'terug', ernst: 'fout', tekst: `Teruglevering tussen 23:00 en 05:00 (${fmt('terug', nacht)}). Mogelijk zijn kolommen of tijden in de export verschoven.` });
    }
    // 5. Uurwaarden tellen niet op tot het dagtotaal
    for (const [maat, uren] of [['afname', dag.uurAfname], ['terug', dag.uurTerug]]) {
      if (!uren || dag[maat] == null) continue;
      const som = uren.reduce((s, u) => s + u, 0);
      if (Math.abs(som - dag[maat]) > 0.02) hier.push({ datum, soort: 'uursom', maat, ernst: 'fout', tekst: `De uurwaarden ${MAAT_NAAM[maat].toLowerCase()} tellen op tot ${fmt(maat, som)}, het dagtotaal is ${fmt(maat, dag[maat])}.` });
    }

    // 6. Veel gas voor de temperatuur (gas per graaddag)
    if (dag.gas != null && x?.graaddag != null && x.graaddag >= 2 && !hier.some((b) => b.maat === 'gas')) {
      const ratio = dag.gas / x.graaddag;
      const om = [];
      for (let i = -30; i <= 30; i++) {
        if (!i) continue;
        const d2 = addDays(datum, i);
        const y = a.perDag.get(d2);
        if (y?.dag.gas != null && y.graaddag != null && y.graaddag >= 2) om.push(y.dag.gas / y.graaddag);
      }
      const m = om.length >= 10 ? mediaan(om) : null;
      if (m != null && ratio > 3 * m && dag.gas - x.graaddag * m > 2) {
        hier.push({ datum, soort: 'graaddag', maat: 'gas', ernst: 'let op', tekst: `Veel gas voor de temperatuur: ${nl(ratio, 2)} m³ per graaddag, normaal rond ${nl(m, 2)}.` });
      }
    }

    if (!hier.length) continue;
    if (isAfgevinkt(dag)) { afgevinkt++; continue; }
    kandidaten.push(...hier);
  }
  for (const b of kandidaten) voegToe(b);

  // 7. Reeksen nullen: geen gas in het stookseizoen, geen teruglevering in de zomer.
  const nulReeksen = (maat, inSeizoen, min, tekst) => {
    let start = null; let vorige = null;
    const sluit = () => {
      if (start && daysBetween(start, vorige) + 1 >= min) {
        const dagen = [...eachDay(start, vorige)];
        if (!dagen.every((d) => isAfgevinkt(a.perDag.get(d)?.dag))) {
          voegToe({ datum: start, tot: vorige, soort: 'nulreeks', maat, ernst: 'let op', tekst: tekst(dagen.length) }, dagen);
        } else afgevinkt++;
      }
      start = null;
    };
    for (const dag of a.dagen) {
      const v = dag[maat];
      const telt = v === 0 && inSeizoen(dag);
      if (telt && start && addDays(vorige, 1) === dag.datum) { vorige = dag.datum; continue; }
      sluit();
      if (telt) { start = dag.datum; vorige = dag.datum; }
    }
    sluit();
  };
  nulReeksen('gas', (d) => !isZomer(d.datum), 3, (n) => `${n} dagen achter elkaar 0 m³ gas in het stookseizoen.`);
  nulReeksen('terug', (d) => isZomer(d.datum) && d.afname != null, 3, (n) => `${n} dagen achter elkaar geen teruglevering in de zomer. Stonden de zonnepanelen uit?`);

  lijst.sort((x, y) => (x.datum < y.datum ? 1 : -1));
  cache = { a, lijst, perDag, afgevinkt };
  return cache;
}

/** Ontbrekende dagen per soort, als reeksen { van, tot, dagen }. */
export function ontbrekendPerSoort(a) {
  const uit = {};
  for (const [soort, veld] of [['stroom', 'afname'], ['gas', 'gas']]) {
    const met = a.dagen.filter((d) => d[veld] != null).map((d) => d.datum);
    if (!met.length) { uit[soort] = { eerste: null, laatste: null, reeksen: [], totaal: 0 }; continue; }
    const set = new Set(met);
    const reeksen = [];
    let open = null;
    for (const d of eachDay(met[0], met[met.length - 1])) {
      if (!set.has(d)) {
        if (open) open.tot = d; else open = { van: d, tot: d };
      } else if (open) { reeksen.push(open); open = null; }
    }
    for (const r of reeksen) r.dagen = daysBetween(r.van, r.tot) + 1;
    uit[soort] = { eerste: met[0], laatste: met[met.length - 1], reeksen, totaal: reeksen.reduce((s, r) => s + r.dagen, 0) };
  }
  return uit;
}

/** Totalen per maand (nieuwste eerst), met per jaar een subtotaal. */
export function maandTotalen(a) {
  if (!a.eerste) return [];
  const maanden = new Map();
  for (const d of a.dagen) {
    const mk = monthKey(d.datum);
    const m = maanden.get(mk) || { maand: mk, afname: 0, terug: 0, gas: 0, dagenStroom: 0, dagenGas: 0 };
    if (d.afname != null) { m.afname += d.afname; m.terug += d.terug || 0; m.dagenStroom++; }
    if (d.gas != null) { m.gas += d.gas; m.dagenGas++; }
    maanden.set(mk, m);
  }
  const jaren = new Map();
  for (const m of [...maanden.values()].sort((x, y) => (x.maand < y.maand ? 1 : -1))) {
    m.dagenInMaand = daysBetween(maandStart(m.maand), maandEinde(m.maand)) + 1;
    const j = m.maand.slice(0, 4);
    if (!jaren.has(j)) jaren.set(j, { jaar: j, afname: 0, terug: 0, gas: 0, dagenStroom: 0, dagenGas: 0, maanden: [] });
    const t = jaren.get(j);
    t.maanden.push(m);
    for (const k of ['afname', 'terug', 'gas', 'dagenStroom', 'dagenGas']) t[k] += m[k];
  }
  return [...jaren.values()];
}

/** Vergelijkt de app-totalen over een periode met opgegeven waarden. */
export function vergelijkPeriode(a, van, tot, opgegeven) {
  const t = { afname: 0, terug: 0, gas: 0 };
  const ontbreekt = { afname: 0, gas: 0 };
  for (const d of eachDay(van, tot)) {
    const dag = a.perDag.get(d)?.dag;
    if (dag?.afname != null) { t.afname += dag.afname; t.terug += dag.terug || 0; } else ontbreekt.afname++;
    if (dag?.gas != null) t.gas += dag.gas; else ontbreekt.gas++;
  }
  ontbreekt.terug = ontbreekt.afname;
  return MATEN.filter((m) => opgegeven[m] != null).map((maat) => {
    const app = t[maat]; const ander = opgegeven[maat];
    const verschil = app - ander;
    const pct = ander ? verschil / ander : null;
    const oordeel = pct == null ? 'onbekend' : Math.abs(pct) <= 0.01 ? 'goed' : Math.abs(pct) <= 0.03 ? 'klein' : 'groot';
    return { maat, app, ander, verschil, pct, oordeel, ontbreekt: ontbreekt[maat] };
  });
}

// ---------- Steekproef ----------

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Laatste zondag van een maand (zomer-/wintertijd wisselt dan). */
function laatsteZondag(jaar, maand) {
  let d = maandEinde(`${jaar}-${maand}`);
  while (weekday(d) !== 0) d = addDays(d, -1);
  return d;
}

/** Dagen om met de hand te vergelijken: bijzondere dagen plus willekeurige dagen. */
export function steekproef(a, seed, aantal = 6) {
  if (!a.eerste) return [];
  const gekozen = new Map();
  const voeg = (datum, reden) => { if (a.perDag.has(datum) && !gekozen.has(datum)) gekozen.set(datum, reden); };
  voeg(a.eerste, 'eerste dag');
  voeg(a.laatste, 'laatste dag');
  for (let j = Number(a.eerste.slice(0, 4)); j <= Number(a.laatste.slice(0, 4)); j++) {
    voeg(`${j}-02-29`, 'schrikkeldag');
    voeg(laatsteZondag(j, '03'), 'zomertijd begint');
    voeg(laatsteZondag(j, '10'), 'wintertijd begint');
  }
  const rnd = prng(seed);
  const alle = [...a.perDag.keys()];
  let extra = 0;
  for (let i = 0; i < 200 && extra < aantal && gekozen.size < alle.length; i++) {
    const d = alle[Math.floor(rnd() * alle.length)];
    if (!gekozen.has(d)) { voeg(d, 'willekeurig'); extra++; }
  }
  return [...gekozen.entries()].map(([datum, reden]) => ({ datum, reden })).sort((x, y) => (x.datum < y.datum ? -1 : 1));
}
