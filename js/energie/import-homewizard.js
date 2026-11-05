// Import van een HomeWizard CSV-export (P1-meter, per kwartier of per dag).
//
// De export bevat meterstanden (oplopende tellerstanden), geen verbruik.
// Verbruik per uur = stand aan het begin van het volgende uur − stand aan het
// begin van dit uur. Ontbrekende standen (wifi weg, zomertijd) worden gelijk
// verdeeld over de tussenliggende uren, dus er gaat nooit verbruik verloren.

import { addDays, daysBetween } from './tijd.js';

const round3 = (v) => Math.round(v * 1000) / 1000;

function splitRegel(line, sep) {
  return line.split(sep).map((s) => s.trim().replace(/^"|"$/g, ''));
}

function getal(s, decimaalKomma) {
  if (s == null || s === '') return null;
  const v = Number(decimaalKomma ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(v) ? v : null;
}

/**
 * Leest de CSV-tekst. Geeft { soort, dagen, onvolledig, gatDagen, vanaf, tot }
 * of gooit een fout met een begrijpelijke melding.
 */
export function leesHomeWizard(tekst) {
  const regels = tekst.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (regels.length < 2) throw new Error('Het bestand is leeg.');
  const sep = regels[0].includes(';') && !regels[0].includes(',') ? ';' : ',';
  const decimaalKomma = sep === ';';
  const kop = splitRegel(regels[0], sep).map((k) => k.toLowerCase());
  const kol = (naam) => kop.findIndex((k) => k.startsWith(naam));

  const iTijd = kol('time');
  let soort; let kolommen;
  if (kol('import t1') >= 0) {
    soort = 'stroom';
    kolommen = [[kol('import t1'), kol('import t2')], [kol('export t1'), kol('export t2')]];
  } else if (kol('total gas') >= 0) {
    soort = 'gas';
    kolommen = [[kol('total gas')]];
  } else {
    throw new Error('Dit lijkt geen HomeWizard-export van de P1-meter (stroom of gas).');
  }
  if (iTijd < 0) throw new Error('De kolom "time" ontbreekt.');

  // Eerste meterstand per uur ("yyyy-mm-dd hh").
  const standen = new Map();
  const tijden = new Set();
  const ongeldig = { aantal: 0, voorbeelden: [] };
  let dubbeleTijden = 0; let leeg = 0;
  const fout = (nr) => { ongeldig.aantal++; if (ongeldig.voorbeelden.length < 5) ongeldig.voorbeelden.push(`regel ${nr}`); };
  for (let nr = 1; nr < regels.length; nr++) {
    const regel = regels[nr];
    const v = splitRegel(regel, sep);
    const tijd = v[iTijd];
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(tijd || '')) { fout(nr + 1); continue; }
    const waarden = kolommen.map((groep) => {
      let som = 0;
      for (const i of groep) {
        if (i < 0) continue;
        const g = getal(v[i], decimaalKomma);
        if (g == null) return null;
        som += g;
      }
      return som;
    });
    if (waarden.some((w) => w == null)) {
      // Lege meterstand (bijv. gas wordt niet elk kwartier gemeten) is normaal; tekst is een fout.
      const cellen = kolommen.flat().filter((i) => i >= 0).map((i) => v[i]);
      if (cellen.some((c) => c != null && c !== '')) fout(nr + 1); else leeg++;
      continue;
    }
    const tijdSleutel = tijd.slice(0, 16);
    if (tijden.has(tijdSleutel)) dubbeleTijden++; else tijden.add(tijdSleutel);
    const uurSleutel = tijd.slice(0, 13);
    if (!standen.has(uurSleutel)) standen.set(uurSleutel, waarden);
  }
  if (!standen.size) throw new Error('Er staan geen meterstanden in dit bestand.');

  const res = standenNaarDagen(standen, soort);
  return { ...res, regels: regels.length - 1, ongeldig, dubbeleTijden, leeg };
}

/**
 * Zet meterstanden per uur om in verbruik per dag (met 24 uurwaarden voor stroom).
 * `standen`: Map "yyyy-mm-dd hh" → [stand afname, stand teruglevering] (stroom)
 * of [stand gas] (gas), met de stand aan het begin van dat uur.
 * Gedeeld door de HomeWizard- en de Vattenfall-import.
 */
export function standenNaarDagen(standen, soort) {
  const aantal = soort === 'stroom' ? 2 : 1;
  const sleutels = [...standen.keys()].sort();
  const eersteDag = sleutels[0].slice(0, 10);
  const index = (s) => daysBetween(eersteDag, s.slice(0, 10)) * 24 + Number(s.slice(11, 13));
  const laatsteIdx = index(sleutels[sleutels.length - 1]);
  const eersteIdx = index(sleutels[0]);

  // Verbruik per uur-slot, met verdeling over gaten.
  const perUur = new Map(); // idx → [waarden]
  const gatIdx = new Set();
  let teruglopend = false;
  for (let k = 0; k < sleutels.length - 1; k++) {
    const a = index(sleutels[k]); const b = index(sleutels[k + 1]);
    const va = standen.get(sleutels[k]); const vb = standen.get(sleutels[k + 1]);
    const stappen = b - a;
    const diff = va.map((x, i) => {
      const d = vb[i] - x;
      if (d < 0) { teruglopend = true; return 0; }
      return d / stappen;
    });
    for (let i = a; i < b; i++) {
      perUur.set(i, diff);
      if (stappen > 2) gatIdx.add(i);
    }
  }

  const dagen = [];
  const onvolledig = [];
  const gatDagen = [];
  const aantalDagen = Math.floor(laatsteIdx / 24) + 1;
  for (let d = 0; d < aantalDagen; d++) {
    const datum = addDays(eersteDag, d);
    const start = d * 24;
    if (start < eersteIdx || start + 24 > laatsteIdx) { onvolledig.push(datum); continue; }
    const uren = [];
    let gat = false;
    for (let h = 0; h < 24; h++) {
      uren.push(perUur.get(start + h) || Array(aantal).fill(0));
      if (gatIdx.has(start + h)) gat = true;
    }
    if (gat) gatDagen.push(datum);
    if (soort === 'stroom') {
      const uurAfname = uren.map((u) => round3(u[0]));
      const uurTerug = uren.map((u) => round3(u[1]));
      dagen.push({
        datum,
        afname: round3(uren.reduce((s, u) => s + u[0], 0)),
        terug: round3(uren.reduce((s, u) => s + u[1], 0)),
        uurAfname, uurTerug, gat,
      });
    } else {
      dagen.push({ datum, gas: round3(uren.reduce((s, u) => s + u[0], 0)), gat });
    }
  }
  if (!dagen.length) throw new Error('Er staat geen enkele volledige dag in dit bestand.');
  return {
    soort, dagen, onvolledig, gatDagen, teruglopend,
    vanaf: dagen[0].datum, tot: dagen[dagen.length - 1].datum,
  };
}
