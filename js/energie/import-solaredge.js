// Import van een SolarEdge-export (monitoringportaal, grafiek "vergelijken" per maand → CSV).
//
//   "Meettijd","Energy (kWh)"
//   "jan. 2020","0"
//   "aug. 2020","190"
//
// Eén regel per maand, alle jaren in één bestand. De maandnaam staat in de taal
// van het portaal (Nederlands of Engels). Getallen met een punt als decimaalteken.
//
// - Maanden vóór de eerste opbrengst (voor de installatie) worden overgeslagen.
// - De lopende maand en latere maanden worden overgeslagen: die zijn nog niet compleet
//   en komen mee met een volgende export.
// - Een 0 tussen andere maanden wordt wel ingelezen, met een melding (storing?).

import { fmtMaand } from './tijd.js';

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

/** Herkent een SolarEdge-export aan de kopregel (Meettijd/Time en Energy). */
export function isSolarEdge(tekst) {
  const kop = cellen(tekst.replace(/^﻿/, '').split(/\r?\n/, 1)[0]).map((k) => k.toLowerCase());
  return kop.length >= 2 && /^(meettijd|time|tijd|date|datum)/.test(kop[0]) && kop.some((k) => k.startsWith('energy') || k.startsWith('energie'));
}

/**
 * Leest de CSV-tekst. `huidigeMaand` ('yyyy-mm') bepaalt welke maanden nog niet compleet zijn.
 * Geeft { maanden: [{ maand, zon }], vanaf, tot, regels, overgeslagen, meldingen }.
 */
export function leesSolarEdge(tekst, huidigeMaand) {
  const regels = tekst.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (regels.length < 2) throw new Error('Het bestand is leeg.');
  const kop = cellen(regels[0]).map((k) => k.toLowerCase());
  const iWaarde = kop.findIndex((k) => k.startsWith('energy') || k.startsWith('energie'));
  if (iWaarde < 0) throw new Error('Dit lijkt geen SolarEdge-export (kolom Energy ontbreekt).');
  const eenheid = (kop[iWaarde].match(/\(([^)]+)\)/) || [])[1] || 'kwh';
  const factor = { kwh: 1, wh: 0.001, mwh: 1000 }[eenheid.replace(/\s/g, '')];
  if (!factor) throw new Error(`Onbekende eenheid "${eenheid}" in de kolom Energy.`);

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
    maanden, vanaf: maanden[0].maand, tot: maanden[maanden.length - 1].maand,
    regels: regels.length - 1, overgeslagen, meldingen,
  };
}
