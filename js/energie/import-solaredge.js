// Import van een SolarEdge-export (SolarEdge Monitoring platform → CSV). Twee soorten:
//
// Maandbestand (grafiek "vergelijken" per maand):
//   "Meettijd","Energy (kWh)"
//   "jan. 2020","0"
//   "aug. 2020","190"
// Eén regel per maand, alle jaren in één bestand.
//
// Dagbestand (energiegrafiek per dag):
//   "Meettijd","Productie (kWh)","Verbruik (kWh)"
//   "1 okt. 2026 00:00","8.21","0"
// Eén regel per dag. Regels met een kleinere stap (uur, kwartier) worden per dag opgeteld.
// De kolom Verbruik wordt genegeerd (die is 0 zonder verbruiksmeter bij de omvormer).
//
// Maand- en dagnamen staan in de taal van het portaal (Nederlands of Engels).
// Getallen met een punt als decimaalteken.
//
// - Maanden/dagen vóór de eerste opbrengst (voor de installatie) worden overgeslagen
//   (bij dagen alleen een reeks van minstens een week, want een sombere dag kan echt 0 zijn).
// - De lopende maand/dag en later worden overgeslagen: die zijn nog niet compleet.
// - Een 0 tussen andere maanden (of minstens 3 dagen 0 achter elkaar) wordt wel ingelezen, met een melding.

import { fmtMaand, fmtDatumKort, addDays } from './tijd.js';

const MAANDEN = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mrt: 3, maa: 3, maart: 3, mar: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, augustus: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Splitst een CSV-regel met komma's en aanhalingstekens. */
function cellen(regel) {
  const uit = [];
  let cel = ''; let quote = false;
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i];
    if (quote) {
      if (c === '"' && regel[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') quote = false; else cel += c;
    } else if (c === '"') quote = true;
    else if (c === ',' || c === ';') { uit.push(cel); cel = ''; } else cel += c;
  }
  uit.push(cel);
  return uit.map((s) => s.trim());
}

/** "jan. 2020" / "Jan 2020" / "mei 2020" → "2020-01"; anders null. */
export function maandUitTekst(s) {
  const m = (s || '').trim().toLowerCase().match(/^([a-z]+)\.?\s+(\d{4})$/);
  if (!m || !MAANDEN[m[1]]) return null;
  return `${m[2]}-${String(MAANDEN[m[1]]).padStart(2, '0')}`;
}

/** "1 okt. 2026 00:00", "Oct 1, 2026", "2026-10-01", "01-10-2026", "1/10/2026" → { datum, tijd }; anders null. */
export function dagUitTekst(s) {
  const t = (s || '').trim().toLowerCase();
  const tijd = (t.match(/(\d{1,2}):(\d{2})/) || [])[0] || '00:00';
  const maak = (y, m, d) => {
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // Ongeldige datums (31 februari) afvangen.
    return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? { datum: iso, tijd: tijd.padStart(5, '0') } : null;
  };
  let m = t.match(/^(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/); // 1 okt. 2026
  if (m && MAANDEN[m[2]]) return maak(m[3], MAANDEN[m[2]], Number(m[1]));
  m = t.match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/); // Oct 1, 2026
  if (m && MAANDEN[m[1]]) return maak(m[3], MAANDEN[m[1]], Number(m[2]));
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); // 2026-10-01
  if (m) return maak(m[1], Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); // 01-10-2026 (dag eerst, zoals in Nederland)
  if (m) return maak(m[3], Number(m[2]), Number(m[1]));
  return null;
}

/** "190", "77.8", "1,234.5" (Engels) of "1.234,5" (Nederlands) → getal. */
function getal(s) {
  let t = (s || '').trim().replace(/\s/g, '');
  if (!t) return null;
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  // Alleen komma's: groepjes van drie cijfers zijn duizendtallen ("160,000"), anders een decimaalkomma.
  else if (t.includes(',')) t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) ? v : NaN;
}

/** Kolom met de opbrengst: Energy/Energie (maandgrafiek) of Productie/Production (energiegrafiek). */
const isOpbrengstKolom = (k) => /^(energy|energie|productie|production|opbrengst)/.test(k);

/** Herkent een SolarEdge-export aan de kopregel (Meettijd/Time en Energy of Productie). */
export function isSolarEdge(tekst) {
  const kop = cellen(tekst.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0]).map((k) => k.toLowerCase());
  return kop.length >= 2 && /^(meettijd|time|tijd|date|datum)/.test(kop[0]) && kop.some(isOpbrengstKolom);
}

/**
 * Leest de CSV-tekst. `vandaag` ('yyyy-mm-dd') bepaalt welke maand/dag nog niet compleet is.
 * Maandbestand: { soort: 'maand', maanden: [{ maand, zon }], vanaf, tot, regels, overgeslagen, meldingen }.
 * Dagbestand:   { soort: 'dag', dagen: [{ datum, zon }], interval, vanaf, tot, regels, overgeslagen, meldingen }.
 */
export function leesSolarEdge(tekst, vandaag) {
  const regels = tekst.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (regels.length < 2) throw new Error('Het bestand is leeg.');
  const kop = cellen(regels[0]).map((k) => k.toLowerCase());
  const iWaarde = kop.findIndex(isOpbrengstKolom);
  if (iWaarde < 0) throw new Error('Dit lijkt geen SolarEdge-export (kolom Energy of Productie ontbreekt).');
  const eenheid = (kop[iWaarde].match(/\(([^)]+)\)/) || [])[1] || 'kwh';
  const factor = { kwh: 1, wh: 0.001, mwh: 1000 }[eenheid.replace(/\s/g, '').toLowerCase()];
  if (!factor) throw new Error(`Onbekende eenheid "${eenheid}" in de kolom ${kop[iWaarde]}.`);
  // Dagbestand of maandbestand: kijk naar de eerste regel met een herkenbare tijd.
  const eersteTijd = regels.slice(1).map((r) => cellen(r)[0]).find((c) => maandUitTekst(c) || dagUitTekst(c));
  if (eersteTijd && !maandUitTekst(eersteTijd)) return leesDagen(regels, iWaarde, factor, vandaag);
  const huidigeMaand = vandaag.slice(0, 7);

  const rijen = []; const ongeldig = []; const geenMaand = [];
  for (const regel of regels.slice(1)) {
    const c = cellen(regel);
    const maand = maandUitTekst(c[0]);
    if (!maand) { geenMaand.push(c[0]); continue; }
    const v = getal(c[iWaarde]);
    if (v == null || Number.isNaN(v) || v < 0) { ongeldig.push(`${c[0]}: ${c[iWaarde] ?? ''}`); continue; }
    rijen.push({ maand, zon: Math.round(v * factor * 1000) / 1000 });
  }
  if (!rijen.length) {
    if (geenMaand.length) throw new Error(`Dit bestand bevat geen maanden (bijvoorbeeld "${geenMaand[0]}"). Exporteer de grafiek per maand.`);
    throw new Error('Geen bruikbare regels gevonden in het bestand.');
  }
  rijen.sort((a, b) => a.maand.localeCompare(b.maand));

  const overgeslagen = []; const meldingen = [];
  const dubbel = rijen.filter((r, i) => i && rijen[i - 1].maand === r.maand).map((r) => r.maand);
  const uniek = rijen.filter((r, i) => i === rijen.length - 1 || rijen[i + 1].maand !== r.maand);

  const eersteMetOpbrengst = uniek.findIndex((r) => r.zon > 0);
  const voorInstallatie = eersteMetOpbrengst < 0 ? uniek.length : eersteMetOpbrengst;
  const binnen = uniek.slice(voorInstallatie);
  const nietCompleet = binnen.filter((r) => r.maand >= huidigeMaand);
  const maanden = binnen.filter((r) => r.maand < huidigeMaand);

  if (voorInstallatie) overgeslagen.push({ reden: 'Maanden zonder opbrengst vóór de eerste opbrengst (zonnepanelen nog niet geplaatst)', aantal: voorInstallatie, voorbeelden: [] });
  if (nietCompleet.length) overgeslagen.push({ reden: 'Lopende of toekomstige maand, nog niet compleet (komt mee met een volgende export)', aantal: nietCompleet.length, voorbeelden: nietCompleet.slice(0, 2).map((r) => fmtMaand(r.maand)) });
  if (geenMaand.length) overgeslagen.push({ reden: 'Regels zonder herkenbare maand', aantal: geenMaand.length, voorbeelden: geenMaand.slice(0, 3) });
  if (ongeldig.length) overgeslagen.push({ reden: 'Regels zonder geldig getal', aantal: ongeldig.length, voorbeelden: ongeldig.slice(0, 3) });
  if (dubbel.length) overgeslagen.push({ reden: 'Maanden die meer dan één keer voorkomen (de onderste regel is gebruikt)', aantal: dubbel.length, voorbeelden: dubbel.slice(0, 3).map(fmtMaand) });

  const nul = maanden.filter((r) => r.zon === 0).map((r) => r.maand);
  if (nul.length) meldingen.push(`Geen opbrengst (0 kWh) in ${nul.map(fmtMaand).join(', ')}, terwijl de maanden eromheen wel opbrengst hebben. Storing of omvormer uit? De 0 is wel ingelezen.`);
  if (!maanden.length) throw new Error('Er staat nog geen volledige maand met opbrengst in dit bestand.');

  return {
    soort: 'maand', maanden, vanaf: maanden[0].maand, tot: maanden[maanden.length - 1].maand,
    regels: regels.length - 1, overgeslagen, meldingen,
  };
}

/** Reeksen van minstens 3 dagen 0 kWh achter elkaar (storing of omvormer uit?), als tekst. `dagen` gesorteerd. */
export function nulReeksen(dagen) {
  const reeksen = [];
  let start = null;
  dagen.forEach((r, i) => {
    if (r.zon === 0 && start == null) start = i;
    const einde = r.zon !== 0 || i === dagen.length - 1;
    if (start != null && einde) {
      const tot = r.zon === 0 ? i : i - 1;
      if (tot - start + 1 >= 3) reeksen.push(`${fmtDatumKort(dagen[start].datum)} t/m ${fmtDatumKort(dagen[tot].datum)} ${dagen[tot].datum.slice(0, 4)}`);
      start = null;
    }
  });
  return reeksen;
}

/** Dagbestand (of uur/kwartier, per dag opgeteld). */
function leesDagen(regels, iWaarde, factor, vandaag) {
  const perTijd = new Map(); const ongeldig = []; const geenDatum = []; let dubbel = 0;
  for (const regel of regels.slice(1)) {
    const c = cellen(regel);
    const t = dagUitTekst(c[0]);
    if (!t) { geenDatum.push(c[0]); continue; }
    const v = getal(c[iWaarde]);
    if (v == null || Number.isNaN(v) || v < 0) { ongeldig.push(`${c[0]}: ${c[iWaarde] ?? ''}`); continue; }
    const k = `${t.datum} ${t.tijd}`;
    if (perTijd.has(k)) dubbel++;
    perTijd.set(k, { datum: t.datum, v: v * factor }); // bij een dubbele regel telt de onderste
  }
  if (!perTijd.size) {
    if (geenDatum.length) throw new Error(`Dit bestand bevat geen herkenbare datums (bijvoorbeeld "${geenDatum[0]}").`);
    throw new Error('Geen bruikbare regels gevonden in het bestand.');
  }
  const perDag = new Map();
  for (const { datum, v } of perTijd.values()) perDag.set(datum, (perDag.get(datum) || 0) + v);
  const regelsPerDag = perTijd.size / perDag.size;
  const interval = regelsPerDag > 30 ? 'kwartier' : regelsPerDag > 1.5 ? 'uur' : 'dag';
  const alle = [...perDag].map(([datum, zon]) => ({ datum, zon: Math.round(zon * 1000) / 1000 })).sort((a, b) => (a.datum < b.datum ? -1 : 1));

  const overgeslagen = []; const meldingen = [];
  const nietCompleet = alle.filter((r) => r.datum >= vandaag);
  let binnen = alle.filter((r) => r.datum < vandaag);
  // Een lange reeks nullen aan het begin: zonnepanelen nog niet geplaatst (of het bestand begint te vroeg).
  const eerste = binnen.findIndex((r) => r.zon > 0);
  const voor = eerste < 0 ? binnen.length : eerste;
  if (voor >= 7) {
    overgeslagen.push({ reden: 'Dagen zonder opbrengst vóór de eerste opbrengst (zonnepanelen nog niet geplaatst?)', aantal: voor, voorbeelden: [] });
    binnen = binnen.slice(voor);
  }
  if (nietCompleet.length) overgeslagen.push({ reden: 'Vandaag of later, nog niet compleet (komt mee met een volgende export)', aantal: nietCompleet.length, voorbeelden: nietCompleet.slice(0, 2).map((r) => r.datum) });
  if (geenDatum.length) overgeslagen.push({ reden: 'Regels zonder herkenbare datum', aantal: geenDatum.length, voorbeelden: geenDatum.slice(0, 3) });
  if (ongeldig.length) overgeslagen.push({ reden: 'Regels zonder geldig getal', aantal: ongeldig.length, voorbeelden: ongeldig.slice(0, 3) });
  if (dubbel) overgeslagen.push({ reden: 'Tijdstippen die meer dan één keer voorkomen (de onderste regel is gebruikt)', aantal: dubbel, voorbeelden: [] });
  if (!binnen.length) throw new Error('Er staat nog geen volledige dag met opbrengst in dit bestand.');

  // Ontbrekende dagen tussen de eerste en laatste dag.
  const set = new Set(binnen.map((r) => r.datum));
  const ontbrekend = [];
  for (let d = binnen[0].datum; d <= binnen[binnen.length - 1].datum; d = addDays(d, 1)) if (!set.has(d)) ontbrekend.push(d);
  const reeksen = nulReeksen(binnen);
  if (reeksen.length) meldingen.push(`Meerdere dagen achter elkaar geen opbrengst (0 kWh): ${reeksen.join('; ')}. Storing of omvormer uit? De nullen zijn wel ingelezen.`);
  if (interval !== 'dag') meldingen.push(`Het bestand bevat waarden per ${interval}; die zijn per dag opgeteld.`);

  return {
    soort: 'dag', dagen: binnen, interval, ontbrekend,
    vanaf: binnen[0].datum, tot: binnen[binnen.length - 1].datum,
    regels: regels.length - 1, overgeslagen, meldingen,
  };
}
