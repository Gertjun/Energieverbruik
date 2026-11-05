// Import van een Vattenfall-export (Mijn Vattenfall → verbruik downloaden, CSV).
//
// Stroom:  Datum;Tijd;Meterstand levering (kWh);Verbruik (kWh);Stand teruglevering (kWh);Teruglevering (kWh)
// Gas:     Datum;Tijd;Meterstand levering (m³);Verbruik (m³)
// Getallen in Nederlandse notatie (1.234,567), nieuwste regel bovenaan, lege
// regels voor momenten die nog niet gemeten zijn. Elke regel geeft de stand aan
// het begin van het kwartier/uur en het verbruik in dat kwartier/uur.
//
// Kwartier- en uurbestanden gaan via dezelfde omrekening als HomeWizard (stand
// aan het begin van elk uur), zodat zomer-/wintertijd en gaten gelijk behandeld
// worden. Dagbestanden leveren alleen dagtotalen (geen uurverdeling).

import { standenNaarDagen } from './import-homewizard.js';
import { addDays } from './tijd.js';

const round3 = (v) => Math.round(v * 1000) / 1000;

function getal(s) {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  const v = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
}

/** "2026-05-05" of "05-05-2026" → "2026-05-05" */
function isoDatum(s) {
  const t = (s || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Herkent een Vattenfall-export aan de kopregel. */
export function isVattenfall(tekst) {
  const kop = tekst.replace(/^﻿/, '').split(/\r?\n/, 1)[0].toLowerCase();
  return kop.startsWith('datum;tijd;') && kop.includes('meterstand levering');
}

/**
 * Leest de CSV-tekst. Geeft hetzelfde soort resultaat als leesHomeWizard
 * ({ soort, dagen, onvolledig, gatDagen, vanaf, tot, ... }) plus `interval`.
 */
export function leesVattenfall(tekst) {
  const regels = tekst.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (regels.length < 2) throw new Error('Het bestand is leeg.');
  const kop = regels[0].split(';').map((k) => k.trim().toLowerCase());
  const kol = (naam) => kop.findIndex((k) => k.startsWith(naam));
  const iDatum = kol('datum'); const iTijd = kol('tijd');
  const iStand = kol('meterstand levering'); const iVerbruik = kol('verbruik');
  const iStandTerug = kol('stand teruglevering'); const iTerug = kop.findIndex((k) => k.startsWith('teruglevering'));
  if (iDatum < 0 || iTijd < 0 || iStand < 0 || iVerbruik < 0) {
    throw new Error('Dit lijkt geen Vattenfall-export (kolommen Datum, Tijd, Meterstand levering en Verbruik ontbreken).');
  }
  const soort = iStandTerug >= 0 ? 'stroom' : 'gas';

  // Regels inlezen; op volgorde van tijd zetten (Vattenfall zet de nieuwste bovenaan).
  // Bij de overgang naar wintertijd staat 02:00–02:45 twee keer in het bestand; de
  // stabiele sortering houdt de volgorde van het bestand aan, dus eerst omdraaien.
  const ongeldig = { aantal: 0, voorbeelden: [] };
  const fout = (nr) => { ongeldig.aantal++; if (ongeldig.voorbeelden.length < 5) ongeldig.voorbeelden.push(`regel ${nr}`); };
  let leeg = 0;
  const metingen = [];
  for (let nr = 1; nr < regels.length; nr++) {
    const v = regels[nr].split(';');
    const datum = isoDatum(v[iDatum]);
    const tijd = (v[iTijd] || '').trim().slice(0, 5);
    if (!datum || !/^\d{2}:\d{2}$/.test(tijd)) { fout(nr + 1); continue; }
    const cellen = soort === 'stroom' ? [v[iStand], v[iVerbruik], v[iStandTerug], v[iTerug]] : [v[iStand], v[iVerbruik]];
    if (cellen.every((c) => !c || !c.trim())) { leeg++; continue; } // nog niet gemeten
    const g = cellen.map(getal);
    if (g.some((x) => x == null || Number.isNaN(x))) { fout(nr + 1); continue; }
    metingen.push({
      nr, datum, tijd,
      stand: soort === 'stroom' ? [g[0], g[2]] : [g[0]],
      verbruik: soort === 'stroom' ? [g[1], g[3]] : [g[1]],
    });
  }
  if (!metingen.length) throw new Error('Er staan geen meterstanden in dit bestand.');
  const aflopend = metingen.length > 1 && `${metingen[0].datum} ${metingen[0].tijd}` > `${metingen[metingen.length - 1].datum} ${metingen[metingen.length - 1].tijd}`;
  if (aflopend) metingen.reverse();
  metingen.sort((a, b) => (`${a.datum} ${a.tijd}` < `${b.datum} ${b.tijd}` ? -1 : `${a.datum} ${a.tijd}` > `${b.datum} ${b.tijd}` ? 1 : 0));

  // Soort bestand: kwartier/uur (meerdere tijden per dag), dag of maand.
  const tijdenSet = new Set(metingen.map((m) => m.tijd));
  const datums = [...new Set(metingen.map((m) => m.datum))];
  let interval;
  if (tijdenSet.size > 1) interval = tijdenSet.has('00:15') || tijdenSet.has('00:45') ? 'kwartier' : 'uur';
  else if (datums.length > 2 && datums.every((d) => d.endsWith('-01'))) interval = 'maand';
  else interval = 'dag';
  if (interval === 'maand') {
    throw new Error('Dit is een export per maand. Download in Mijn Vattenfall per kwartier (stroom), per uur (gas) of per dag.');
  }

  const gezien = new Set();
  let dubbeleTijden = 0;
  for (const m of metingen) {
    const k = `${m.datum} ${m.tijd}`;
    if (gezien.has(k)) dubbeleTijden++; else gezien.add(k);
  }

  let res;
  if (interval === 'dag') {
    res = dagBestand(metingen, soort);
  } else {
    const standen = new Map();
    for (const m of metingen) {
      const k = `${m.datum} ${m.tijd.slice(0, 2)}`;
      if (!standen.has(k)) standen.set(k, m.stand); // eerste meting van het uur = stand aan het begin
    }
    res = standenNaarDagen(standen, soort);
  }
  return { ...res, interval, regels: regels.length - 1, ongeldig, dubbeleTijden, leeg };
}

/** Dagbestand: per regel het verbruik van die dag. Geen uurverdeling. */
function dagBestand(metingen, soort) {
  const perDag = new Map();
  for (const m of metingen) if (!perDag.has(m.datum)) perDag.set(m.datum, m);
  const datums = [...perDag.keys()].sort();
  const dagen = [];
  const gatDagen = [];
  for (const datum of datums) {
    const m = perDag.get(datum);
    if (soort === 'stroom') dagen.push({ datum, afname: round3(m.verbruik[0]), terug: round3(m.verbruik[1]), gat: false });
    else dagen.push({ datum, gas: round3(m.verbruik[0]), gat: false });
  }
  // Ontbrekende dagen tussen de eerste en de laatste.
  const ontbrekend = [];
  for (let d = datums[0]; d < datums[datums.length - 1]; d = addDays(d, 1)) if (!perDag.has(d)) ontbrekend.push(d);
  if (!dagen.length) throw new Error('Er staat geen enkele dag in dit bestand.');
  return {
    soort, dagen, onvolledig: [], gatDagen, teruglopend: false, ontbrekend,
    vanaf: dagen[0].datum, tot: dagen[dagen.length - 1].datum,
  };
}
