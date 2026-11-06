// Datamodel, samenvoegen en berekeningen over perioden.

import { alive, mergeCollections, purgeTombstones } from '../core/records.js';
import { contractOp, kostenDag, maakProfielen, graaddag, standaardContracten } from './tarief.js';
import { monthKey, yearKey, isoWeekKey, eachDay, maandStart, maandEinde } from './tijd.js';

// Schema 2 (versie 1.1.0): collectie `importen` (importlogboek met herstelgegevens),
// en op dagen/maanden/weer het veld `imp` (welke import een waarde heeft gezet)
// en op dagen `gecontroleerd` (afgevinkte controlemelding).
// Schema 3 (versie 1.6.0): collectie `analyses` (bewaarde favorieten van het scherm Analyse).
// Schema 4 (versie 1.22.0): collectie `uitgesloten` (perioden die Analyse buiten beschouwing laat).
// Schema 5 (versie 1.26.0): collectie `zon` (zonne-opbrengst per dag uit een SolarEdge-dagexport).
export const SCHEMA = 5;
const TOMBSTONE_DAYS = 180;
const COLLECTIES = ['dagen', 'weer', 'maanden', 'contracten', 'importen', 'analyses', 'uitgesloten', 'zon'];

export const STANDAARD_INSTELLINGEN = { plaats: 'Eindhoven', lat: 51.44, lon: 5.48, updatedAt: 0 };

export function initialData() {
  const now = Date.now();
  return {
    schema: SCHEMA,
    dagen: [], weer: [], maanden: [], importen: [], analyses: [], uitgesloten: [], zon: [],
    contracten: standaardContracten().map((c) => ({ id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...c })),
    instellingen: { ...STANDAARD_INSTELLINGEN },
  };
}

export function migrate(data) {
  for (const k of COLLECTIES) data[k] = purgeTombstones(data[k] ?? [], TOMBSTONE_DAYS);
  data.instellingen ??= { ...STANDAARD_INSTELLINGEN };
  // Schema 1 → 2 … 4 → 5: alleen een lege collectie erbij; bestaande gegevens blijven gelijk.
  data.schema = Math.max(data.schema ?? SCHEMA, SCHEMA);
  return data;
}

export function merge(local, remote) {
  const out = { ...remote, ...local, schema: Math.max(local.schema || 0, remote.schema || 0) };
  for (const k of COLLECTIES) out[k] = mergeCollections(local[k], remote[k]);
  const li = local.instellingen || {}; const ri = remote.instellingen || {};
  out.instellingen = (li.updatedAt || 0) >= (ri.updatedAt || 0) ? li : ri;
  return out;
}

/** Vaste id's per datum/maand: dezelfde dag op twee apparaten wordt één record. */
export const dagId = (datum) => `d:${datum}`;
export const weerId = (datum) => `w:${datum}`;
export const maandId = (maand) => `m:${maand}`;
export const zonId = (datum) => `z:${datum}`;

/** Record toevoegen of bijwerken (muteert de lijst). */
export function upsert(list, id, velden) {
  const now = Date.now();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0 || list[i].deleted) {
    const rec = { id, createdAt: now, updatedAt: now, ...velden };
    if (i < 0) list.push(rec); else list[i] = rec;
    return rec;
  }
  Object.assign(list[i], velden, { updatedAt: now });
  return list[i];
}

// ---------- Afgeleide gegevens (gecachet per versie van de data) ----------

let cache = { data: null };

export function afgeleid(data) {
  if (cache.data === data) return cache;
  const dagen = alive(data.dagen).sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const contracten = alive(data.contracten);
  const uitgesloten = alive(data.uitgesloten || []).filter((u) => u.van && u.tot).sort((x, y) => (x.van < y.van ? -1 : 1));
  const weer = new Map(alive(data.weer).map((w) => [w.datum, w]));
  const maanden = new Map(alive(data.maanden).map((m) => [m.maand, m]));
  // Zonne-opbrengst per dag (SolarEdge-dagexport). Staat los van `dagen`, zodat een dag met alleen
  // zon geen meetdag wordt (geen vaste kosten, geen "ontbrekende" stroom, geen verschoven begindatum).
  const zonDag = new Map(alive(data.zon || []).filter((z) => z.zon != null).map((z) => [z.datum, z.zon]));
  const profielen = maakProfielen(dagen);
  const perDag = new Map();
  for (const d of dagen) {
    const w = weer.get(d.datum);
    const gd = w ? graaddag(d.datum, w.tgem) : null;
    // m³ per graaddag zoals in de Excel: alleen als er gas én een graaddag boven 0 is.
    const gasPerGd = d.gas != null && gd > 0 ? d.gas / gd : null;
    perDag.set(d.datum, { dag: d, weer: w, graaddag: gd, gasPerGd, zon: zonDag.get(d.datum) ?? null, kosten: kostenDag(d, contractOp(contracten, d.datum), profielen) });
  }
  cache = {
    data, dagen, contracten, weer, maanden, zonDag, profielen, perDag, uitgesloten,
    eerste: dagen[0]?.datum || null, laatste: dagen[dagen.length - 1]?.datum || null,
  };
  return cache;
}

export const PERIODE_SLEUTEL = { dag: (d) => d, week: isoWeekKey, maand: monthKey, jaar: yearKey };

const leegTotaal = () => ({
  afname: 0, terug: 0, gas: 0, kosten: 0, kostenStroom: 0, kostenGas: 0, kostenVast: 0,
  graaddagen: 0, gasStookdagen: 0, dagen: 0, dagenAfname: 0, dagenGas: 0, geschat: false, zonderContract: false,
});

/** Totalen over de dagen van `van` t/m `tot`. */
export function totaal(a, van, tot) {
  const t = leegTotaal();
  for (const datum of eachDay(van, tot)) {
    const x = a.perDag.get(datum);
    if (!x) continue;
    const { dag, kosten } = x;
    t.dagen++;
    if (dag.afname != null) { t.afname += dag.afname; t.terug += dag.terug || 0; t.dagenAfname++; }
    if (dag.gas != null) {
      t.gas += dag.gas; t.dagenGas++;
      if (x.graaddag != null && x.graaddag > 0) { t.graaddagen += x.graaddag; t.gasStookdagen += dag.gas; }
    }
    t.kosten += kosten.totaal;
    t.kostenStroom += kosten.stroom + kosten.terug;
    t.kostenGas += kosten.gas;
    t.kostenVast += kosten.vast;
    if (kosten.geschat) t.geschat = true;
    if (!kosten.contract) t.zonderContract = true;
  }
  return t;
}

/** Ontbrekende dagen tussen de eerste en laatste dag met gegevens. */
export function ontbrekendeDagen(a) {
  if (!a.eerste) return [];
  const out = [];
  for (const d of eachDay(a.eerste, a.laatste)) if (!a.perDag.has(d)) out.push(d);
  return out;
}

/**
 * Zonnecijfers over de dagen van `van` t/m `tot`: opbrengst, zelf gebruikt, totaal verbruik en aandeel.
 *
 * Per maand binnen de periode:
 * - Heeft elke dag een opbrengst uit de SolarEdge-dagexport, dan tellen de dagen (die zijn preciezer):
 *   zelf gebruikt = per dag max(0, opbrengst − teruglevering), opgeteld.
 * - Anders de maandwaarde (SolarEdge-maandexport, Excel of handmatig), mits de hele maand in de periode
 *   valt (of `heleMaanden`: dan telt een maand die gedeeltelijk in de periode valt helemaal mee, zoals
 *   Analyse dat bij een indeling per maand/jaar doet). Zelf gebruikt = max(0, opbrengst − teruglevering).
 * - Anders de dagen die er zijn (bijv. de lopende maand); dan is de maand onvolledig.
 * Zelf gebruikt en het aandeel tellen alleen over dagen waarvan ook de stroom bekend is.
 * Geeft null als er in de periode geen opbrengst bekend is.
 */
export function zonPeriode(a, van, tot, { heleMaanden = false } = {}) {
  let zon = 0; let eigen = 0; let afname = 0; let n = 0;
  let metZon = false; let metStroom = false; let onvolledig = false; let gemist = false; let perDag = false; let perMaand = false;
  for (let mk = monthKey(van); mk <= monthKey(tot); mk = volgendeMaand(mk)) {
    const ms = maandStart(mk); const me = maandEinde(mk);
    const sv = ms < van ? van : ms; const st = me > tot ? tot : me;
    const segDagen = [...eachDay(sv, st)];
    const metDag = segDagen.filter((d) => a.zonDag.has(d));
    const m = a.maanden.get(mk);
    const heel = sv === ms && st === me;
    const dagenCompleet = metDag.length === segDagen.length;
    if (m?.zon != null && !(heel && dagenCompleet) && (heel || (heleMaanden && !metDag.length))) {
      // Maandwaarde: zelf gebruikt over de hele maand.
      const t = totaal(a, ms, me);
      zon += m.zon; metZon = true; perMaand = true; n += dagenVanMaand(mk);
      if (t.dagenAfname) { eigen += Math.max(0, m.zon - t.terug); afname += t.afname; metStroom = true; }
      continue;
    }
    if (!metDag.length) { gemist = true; continue; }
    perDag = true; metZon = true;
    if (!dagenCompleet) onvolledig = true;
    for (const d of metDag) {
      const z = a.zonDag.get(d);
      zon += z; n++;
      const dag = a.perDag.get(d)?.dag;
      if (dag?.afname != null) { eigen += Math.max(0, z - (dag.terug || 0)); afname += dag.afname; metStroom = true; }
    }
  }
  if (!metZon) return null;
  const verbruik = metStroom ? afname + eigen : null;
  return {
    zon, n, onvolledig: onvolledig || gemist, bron: perDag && perMaand ? 'beide' : perDag ? 'dag' : 'maand',
    eigen: metStroom ? eigen : null, verbruik,
    aandeel: metStroom && verbruik > 0 ? eigen / verbruik : metStroom ? 0 : null,
  };
}

/** Zelfvoorzienendheid per maand (alleen als er een opbrengst is). */
export function zonMaand(a, maand) {
  const z = zonPeriode(a, maandStart(maand), maandEinde(maand));
  if (!z || z.eigen == null) return null;
  return { zon: z.zon, eigen: z.eigen, verbruik: z.verbruik, aandeel: z.aandeel, onvolledig: z.onvolledig, bron: z.bron };
}

/** Maanden ('yyyy-mm', oplopend) waarvoor een zonne-opbrengst bekend is (per maand of per dag). */
export function maandenMetZon(a) {
  const s = new Set([...a.maanden.values()].filter((m) => m.zon != null && !m.deleted).map((m) => m.maand));
  for (const d of a.zonDag.keys()) s.add(d.slice(0, 7));
  return [...s].sort();
}

function volgendeMaand(mk) {
  const [y, m] = mk.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
const dagenVanMaand = (mk) => Number(maandEinde(mk).slice(8));
