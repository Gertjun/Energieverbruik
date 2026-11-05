// Ingelezen gegevens in de kluis zetten (muteert de draft binnen ctx.update),
// met een importlogboek zodat elke import te controleren en terug te draaien is.
//
// Voorrang: HomeWizard-gegevens zijn het nauwkeurigst en overschrijven waarden
// uit Excel. Excel vult alleen aan wat er nog niet is. Opmerkingen blijven staan.
//
// Per dag zijn er drie groepen velden die een import kan zetten:
//   s = stroom (afname, terug, uurverdeling, bron), g = gas, o = opmerking.
// Op de dag staat in `imp` welke import elke groep het laatst heeft gezet. In het
// importrecord staat in `herstel` hoe die groep er vóór de import uitzag.
// Ongedaan maken zet alleen groepen terug die sindsdien niet meer veranderd zijn.

import { removeById } from '../core/records.js';
import { upsert, dagId, weerId, maandId } from './model.js';

export const GROEPEN = {
  s: ['afname', 'terug', 'uurAfname', 'uurTerug', 'bron'],
  g: ['gas', 'bronGas'],
  o: ['opmerking'],
};
/** Hoeveel imports terug te draaien blijven (oudere herstelgegevens worden opgeruimd). */
export const HERSTEL_MAX = 10;
/** Verschil tussen twee bronnen dat als "afwijkend" telt. */
const TOLERANTIE = { afname: [0.1, 0.02], terug: [0.1, 0.02], gas: [0.05, 0.02] };

const BRON_NAAM = { homewizard: 'HomeWizard', excel: 'Excel', handmatig: 'handmatig' };
export const bronNaam = (b) => BRON_NAAM[b] || 'onbekend';

const r3 = (v) => Math.round(v * 1000) / 1000;
const vind = (lijst, id) => lijst.find((r) => r.id === id && !r.deleted);

function momentopname(rec, groep) {
  const v = {};
  if (rec) for (const k of GROEPEN[groep]) if (rec[k] !== undefined && rec[k] !== null) v[k] = rec[k];
  return v;
}
const gelijk = (a, b) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());

/** Maakt een dag "los" van imports na een handmatige wijziging (dan is ongedaan maken daar niet meer van toepassing). */
export function losVanImport(rec, ...groepen) {
  if (!rec?.imp) return;
  for (const g of groepen) delete rec.imp[g];
  if (!Object.keys(rec.imp).length) delete rec.imp;
}

// ---------- Importrecord ----------

function nieuweImport(soort, bestand) {
  const now = Date.now();
  return {
    id: crypto.randomUUID(), createdAt: now, updatedAt: now, soort, bestand: bestand || '',
    rapport: {
      dagenInBestand: 0, nieuw: 0, gewijzigd: 0, gelijk: 0, voorrang: 0,
      overgeslagen: [], meldingen: [], totalen: {}, ontbrekend: {},
      overlap: { vergeleken: 0, afwijkend: [] },
    },
    herstel: { dagen: {}, weer: [], maanden: {} },
  };
}

/** Eén groep velden van een dag zetten. Geeft 'nieuw', 'gewijzigd' of 'gelijk'. */
function zetGroep(data, imp, datum, groep, velden) {
  const id = dagId(datum);
  const oud = vind(data.dagen, id);
  const voor = momentopname(oud, groep);
  if (gelijk(voor, velden)) return 'gelijk';
  const h = (imp.herstel.dagen[datum] ??= { nieuw: !oud });
  h[groep] ??= { v: voor, imp: oud?.imp?.[groep] ?? null };
  const rec = upsert(data.dagen, id, { datum, ...velden });
  for (const k of GROEPEN[groep]) if (!(k in velden)) delete rec[k];
  rec.imp = { ...(rec.imp || {}), [groep]: imp.id };
  return Object.keys(voor).length ? 'gewijzigd' : 'nieuw';
}

/** Vergelijkt een bestaande waarde met de waarde uit het bestand (overlap tussen bronnen of exports). */
function vergelijk(imp, datum, maat, oudWaarde, nieuwWaarde, oudBron) {
  if (oudWaarde == null || nieuwWaarde == null) return;
  const o = imp.rapport.overlap;
  o.vergeleken++;
  const [abs, rel] = TOLERANTIE[maat];
  const verschil = nieuwWaarde - oudWaarde;
  if (Math.abs(verschil) > abs && Math.abs(verschil) > rel * Math.max(Math.abs(oudWaarde), Math.abs(nieuwWaarde))) {
    o.afwijkend.push({ datum, maat, oud: oudWaarde, nieuw: nieuwWaarde, bron: oudBron || null });
  }
}

function telUitkomst(imp, uitkomst) {
  imp.rapport[uitkomst]++;
}

function totalenPerJaar(dagen) {
  const t = {};
  for (const d of dagen) {
    const j = (t[d.datum.slice(0, 4)] ??= { afname: 0, terug: 0, gas: 0, dagenStroom: 0, dagenGas: 0 });
    if (d.afname != null) { j.afname = r3(j.afname + d.afname); j.terug = r3(j.terug + (d.terug || 0)); j.dagenStroom++; }
    if (d.gas != null) { j.gas = r3(j.gas + d.gas); j.dagenGas++; }
  }
  return t;
}

/** Ontbrekende dagen binnen het bestand zelf (tussen eerste en laatste dag met een waarde). */
function ontbrekendInBestand(dagen, veld) {
  const met = dagen.filter((d) => d[veld] != null).map((d) => d.datum).sort();
  if (met.length < 2) return [];
  const set = new Set(met);
  const uit = [];
  const eind = met[met.length - 1];
  for (let d = met[0]; d <= eind; d = volgendeDag(d)) if (!set.has(d)) uit.push(d);
  return uit;
}
function volgendeDag(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function afronden(data, imp) {
  const o = imp.rapport.overlap;
  o.aantalAfwijkend = o.afwijkend.length;
  o.afwijkend.sort((a, b) => Math.abs(b.nieuw - b.oud) - Math.abs(a.nieuw - a.oud));
  o.afwijkend = o.afwijkend.slice(0, 50);
  const r = imp.rapport;
  imp.veranderd = r.nieuw + r.gewijzigd + (r.weer || 0) + (r.maanden || 0) > 0;
  data.importen ??= [];
  data.importen.push(imp);
  // Alleen de laatste imports blijven terug te draaien; zo blijft de kluis klein.
  const metHerstel = data.importen.filter((i) => !i.deleted && i.herstel).sort((a, b) => b.createdAt - a.createdAt);
  for (const oud of metHerstel.slice(HERSTEL_MAX)) { oud.herstel = null; oud.herstelVervallen = true; oud.updatedAt = Date.now(); }
  return imp;
}

// ---------- HomeWizard ----------

/** HomeWizard-resultaat (uit leesHomeWizard) verwerken. Geeft het importrecord terug. */
export function zetHomeWizard(data, res, bestand) {
  const imp = nieuweImport(res.soort === 'stroom' ? 'homewizard-stroom' : 'homewizard-gas', bestand);
  const r = imp.rapport;
  r.dagenInBestand = res.dagen.length;
  r.vanaf = res.vanaf; r.tot = res.tot;
  r.regels = res.regels; r.dubbeleTijden = res.dubbeleTijden;
  r.totalen = totalenPerJaar(res.dagen);
  r.gaten = res.gatDagen;
  if (res.ongeldig?.aantal) r.overgeslagen.push({ reden: 'Regels zonder geldige tijd of meterstand', aantal: res.ongeldig.aantal, voorbeelden: res.ongeldig.voorbeelden });
  const onvolledig = res.onvolledig || [];
  if (onvolledig.length) r.overgeslagen.push({ reden: 'Onvolledige dag aan het begin of eind van de export (komt mee met een volgende export)', aantal: onvolledig.length, voorbeelden: onvolledig.slice(0, 3) });
  if (res.gatDagen.length) r.meldingen.push(`Bij ${res.gatDagen.length} dag(en) ontbraken meer dan twee uur metingen; het verbruik is gelijk over die uren verdeeld.`);
  if (res.teruglopend) r.meldingen.push('De meterstand liep ergens terug (meterwissel?); dat stuk is als 0 geteld.');

  for (const d of res.dagen) {
    const oud = vind(data.dagen, dagId(d.datum));
    if (res.soort === 'stroom') {
      vergelijk(imp, d.datum, 'afname', oud?.afname, d.afname, oud?.bron);
      vergelijk(imp, d.datum, 'terug', oud?.terug, d.terug, oud?.bron);
      telUitkomst(imp, zetGroep(data, imp, d.datum, 's', {
        afname: d.afname, terug: d.terug, uurAfname: d.uurAfname, uurTerug: d.uurTerug, bron: 'homewizard',
      }));
    } else {
      vergelijk(imp, d.datum, 'gas', oud?.gas, d.gas, oud?.bronGas || oud?.bron);
      telUitkomst(imp, zetGroep(data, imp, d.datum, 'g', { gas: d.gas, bronGas: 'homewizard' }));
    }
  }
  return afronden(data, imp);
}

// ---------- Excel ----------

/** Excel-resultaat (uit leesExcel) verwerken. Geeft het importrecord terug. */
export function zetExcel(data, res, bestand) {
  const imp = nieuweImport('excel', bestand);
  const r = imp.rapport;
  r.dagenInBestand = res.dagen.length;
  r.vanaf = res.dagen[0]?.datum || null; r.tot = res.dagen[res.dagen.length - 1]?.datum || null;
  r.regels = res.controle?.rijen ?? null;
  r.overgeslagen.push(...(res.controle?.overgeslagen || []));
  r.meldingen.push(...(res.controle?.meldingen || []));
  r.totalen = totalenPerJaar(res.dagen);
  r.ontbrekend = { stroom: ontbrekendInBestand(res.dagen, 'afname'), gas: ontbrekendInBestand(res.dagen, 'gas') };

  for (const d of res.dagen) {
    const oud = vind(data.dagen, dagId(d.datum));
    const uitkomsten = [];
    let voorrang = false;
    if (d.afname != null) {
      if (oud?.afname != null && oud.bron === 'homewizard') {
        vergelijk(imp, d.datum, 'afname', oud.afname, d.afname, 'homewizard');
        vergelijk(imp, d.datum, 'terug', oud.terug, d.terug ?? 0, 'homewizard');
        voorrang = true;
      } else {
        uitkomsten.push(zetGroep(data, imp, d.datum, 's', { afname: d.afname, terug: d.terug ?? 0, bron: 'excel' }));
      }
    }
    if (d.gas != null) {
      if (oud?.gas != null && oud.bronGas === 'homewizard') {
        vergelijk(imp, d.datum, 'gas', oud.gas, d.gas, 'homewizard');
        voorrang = true;
      } else {
        uitkomsten.push(zetGroep(data, imp, d.datum, 'g', { gas: d.gas, bronGas: 'excel' }));
      }
    }
    if (d.opmerking && !oud?.opmerking) uitkomsten.push(zetGroep(data, imp, d.datum, 'o', { opmerking: d.opmerking }));
    if (voorrang) r.voorrang++;
    if (uitkomsten.length) {
      telUitkomst(imp, uitkomsten.includes('gewijzigd') ? 'gewijzigd' : uitkomsten.includes('nieuw') ? 'nieuw' : 'gelijk');
    }
  }

  const weerBestaand = new Set(data.weer.filter((w) => !w.deleted).map((w) => w.datum));
  r.weer = 0;
  for (const w of res.weer) {
    if (weerBestaand.has(w.datum)) continue;
    upsert(data.weer, weerId(w.datum), { ...w, imp: imp.id });
    imp.herstel.weer.push(w.datum);
    r.weer++;
  }

  r.maanden = 0;
  for (const m of res.maanden) {
    const oud = vind(data.maanden, maandId(m.maand));
    const velden = {};
    if (m.termijn != null && oud?.termijn == null) velden.termijn = m.termijn;
    if (m.zon != null && oud?.zon == null) velden.zon = m.zon;
    if (!Object.keys(velden).length) continue;
    imp.herstel.maanden[m.maand] = { nieuw: !oud, velden: Object.keys(velden) };
    const rec = upsert(data.maanden, maandId(m.maand), { maand: m.maand, ...velden });
    rec.imp = { ...(rec.imp || {}) };
    for (const k of Object.keys(velden)) rec.imp[k] = imp.id;
    r.maanden++;
  }
  return afronden(data, imp);
}

// ---------- Ongedaan maken ----------

/**
 * Draait een import terug. Groepen die na deze import opnieuw zijn ingelezen of
 * met de hand gewijzigd, blijven staan. Geeft { teruggezet, behouden } terug.
 */
export function maakImportOngedaan(data, importId) {
  const imp = vind(data.importen || [], importId);
  if (!imp?.herstel) throw new Error('Deze import kan niet meer worden teruggedraaid.');
  const now = Date.now();
  let teruggezet = 0; let behouden = 0;

  for (const [datum, h] of Object.entries(imp.herstel.dagen)) {
    const rec = vind(data.dagen, dagId(datum));
    if (!rec) continue;
    let veranderd = false;
    for (const g of Object.keys(GROEPEN)) {
      if (!h[g]) continue;
      if (rec.imp?.[g] !== importId) { behouden++; continue; }
      for (const k of GROEPEN[g]) delete rec[k];
      Object.assign(rec, h[g].v);
      if (h[g].imp) rec.imp[g] = h[g].imp; else losVanImport(rec, g);
      veranderd = true;
    }
    if (!veranderd) continue;
    teruggezet++;
    rec.updatedAt = now;
    if (rec.afname == null && rec.gas == null && !rec.opmerking) removeById(data.dagen, rec.id);
  }

  for (const datum of imp.herstel.weer) {
    const w = vind(data.weer, weerId(datum));
    if (w && w.imp === importId) removeById(data.weer, w.id);
  }

  for (const [maand, h] of Object.entries(imp.herstel.maanden)) {
    const m = vind(data.maanden, maandId(maand));
    if (!m) continue;
    for (const k of h.velden) {
      if (m.imp?.[k] !== importId) continue;
      m[k] = null;
      delete m.imp[k];
    }
    m.updatedAt = now;
    if (h.nieuw && m.termijn == null && m.zon == null) removeById(data.maanden, m.id);
  }

  Object.assign(imp, { herstel: null, ongedaan: now, ongedaanTelling: { teruggezet, behouden }, updatedAt: now });
  return { teruggezet, behouden };
}
