// Datamodel, samenvoegen en berekeningen over perioden.

import { alive, mergeCollections, purgeTombstones } from '../core/records.js';
import { contractOp, kostenDag, maakProfielen, graaddag, standaardContracten } from './tarief.js';
import { monthKey, yearKey, isoWeekKey, eachDay, maandStart, maandEinde } from './tijd.js';

// Schema 2 (versie 1.1.0): collectie `importen` (importlogboek met herstelgegevens),
// en op dagen/maanden/weer het veld `imp` (welke import een waarde heeft gezet)
// en op dagen `gecontroleerd` (afgevinkte controlemelding).
// Schema 3 (versie 1.6.0): collectie `analyses` (bewaarde favorieten van het scherm Analyse).
export const SCHEMA = 3;
const TOMBSTONE_DAYS = 180;
const COLLECTIES = ['dagen', 'weer', 'maanden', 'contracten', 'importen', 'analyses'];

export const STANDAARD_INSTELLINGEN = { plaats: 'Eindhoven', lat: 51.44, lon: 5.48, updatedAt: 0 };

export function initialData() {
  const now = Date.now();
  return {
    schema: SCHEMA,
    dagen: [], weer: [], maanden: [], importen: [], analyses: [],
    contracten: standaardContracten().map((c) => ({ id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...c })),
    instellingen: { ...STANDAARD_INSTELLINGEN },
  };
}

export function migrate(data) {
  for (const k of COLLECTIES) data[k] = purgeTombstones(data[k] ?? [], TOMBSTONE_DAYS);
  data.instellingen ??= { ...STANDAARD_INSTELLINGEN };
  // Schema 1 → 2 en 2 → 3: alleen een lege collectie erbij; bestaande gegevens blijven gelijk.
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
  const weer = new Map(alive(data.weer).map((w) => [w.datum, w]));
  const maanden = new Map(alive(data.maanden).map((m) => [m.maand, m]));
  const profielen = maakProfielen(dagen);
  const perDag = new Map();
  for (const d of dagen) {
    const w = weer.get(d.datum);
    const gd = w ? graaddag(d.datum, w.tgem) : null;
    // m³ per graaddag zoals in de Excel: alleen als er gas én een graaddag boven 0 is.
    const gasPerGd = d.gas != null && gd > 0 ? d.gas / gd : null;
    perDag.set(d.datum, { dag: d, weer: w, graaddag: gd, gasPerGd, kosten: kostenDag(d, contractOp(contracten, d.datum), profielen) });
  }
  cache = {
    data, dagen, contracten, weer, maanden, profielen, perDag,
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

/** Zelfvoorzienendheid per maand (alleen als de zonopbrengst is ingevuld). */
export function zonMaand(a, maand) {
  const m = a.maanden.get(maand);
  if (!m || m.zon == null) return null;
  const t = totaal(a, maandStart(maand), maandEinde(maand));
  if (!t.dagenAfname) return null;
  const eigen = Math.max(0, m.zon - t.terug);
  const verbruik = t.afname + eigen;
  return { zon: m.zon, eigen, verbruik, aandeel: verbruik > 0 ? eigen / verbruik : 0 };
}
