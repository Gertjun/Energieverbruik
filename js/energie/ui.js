// Gedeelde UI-hulpjes voor de schermen.

import { h, formatEuro } from '../core/dom.js';

const nf = (d) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const nf0 = nf(0); const nf1 = nf(1); const nf2 = nf(2); const nf3 = nf(3);

export const fmtGetal = (v, d = 1) => (v == null ? '–' : [nf0, nf1, nf2, nf3][d].format(v));
export const fmtKwh = (v, d = 1) => (v == null ? '–' : `${fmtGetal(v, d)} kWh`);
export const fmtM3 = (v, d = 2) => (v == null ? '–' : `${fmtGetal(v, d)} m³`);
/** Euro's (getal) netjes als bedrag. */
export const euro = (v) => (v == null ? '–' : formatEuro(Math.round(v * 100)));
export const fmtPct = (v) => (v == null ? '–' : `${nf0.format(v * 100)}%`);

/** Getal uit een invoerveld (accepteert komma). Leeg → null, ongeldig → NaN. */
export function leesGetal(s) {
  const t = String(s ?? '').trim().replace(/\s/g, '');
  if (!t) return null;
  const v = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(v) ? v : NaN;
}
/** Getal voor in een invoerveld, met komma. */
export const toonGetal = (v) => (v == null || !Number.isFinite(v) ? '' : String(v).replace('.', ','));

export function segmented(opties, waarde, onChange, label) {
  return h('div', { class: 'segmented', role: 'tablist', 'aria-label': label },
    opties.map(([key, tekst]) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': key === waarde ? 'true' : 'false',
      onClick: () => { if (key !== waarde) onChange(key); },
    }, tekst)));
}

/** Kerncijfer met vergelijking. `beter`: 'lager' of 'hoger' is gunstig. */
export function kpi(titel, waarde, fmt, vorig, beter = 'lager') {
  let vergelijking = h('span', { class: 'kpi-verschil muted' }, 'geen vergelijking');
  if (waarde != null && vorig != null && vorig !== 0) {
    const pct = (waarde - vorig) / Math.abs(vorig);
    const gunstig = beter === 'lager' ? pct < 0 : pct > 0;
    const pijl = pct > 0 ? '▲' : pct < 0 ? '▼' : '';
    vergelijking = h('span', { class: `kpi-verschil ${Math.abs(pct) < 0.005 ? 'muted' : gunstig ? 'is-goed' : 'is-slecht'}` },
      `${pijl} ${fmtGetal(Math.abs(pct) * 100, 0)}% t.o.v. vorig jaar (${fmt(vorig)})`);
  }
  return h('div', { class: 'kpi' },
    h('span', { class: 'kpi-titel' }, titel),
    h('strong', { class: 'kpi-waarde' }, waarde == null ? '–' : fmt(waarde)),
    vergelijking);
}

export function kaart(titel, ...inhoud) {
  return h('section', { class: 'card kaart' }, titel ? h('h2', { class: 'kaart-titel' }, titel) : null, ...inhoud);
}

export function veld(label, invoer, hint) {
  return h('label', { class: 'field' }, h('span', {}, label), invoer, hint ? h('small', { class: 'hint' }, hint) : null);
}
