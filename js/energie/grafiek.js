// Eenvoudige staafgrafiek in SVG, zonder externe library.
// Optioneel met een vergelijkingsreeks (vorig jaar) als gekleurde staaf ernaast (kleur jaar-1),
// of met een tweede grootheid als lijn met een eigen as rechts (`lijn`).
// Aanraken of aanwijzen van een staaf toont de waarde boven de grafiek.

import { h } from '../core/dom.js';

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, String(v));
  el.append(...kids);
  return el;
}

/**
 * Breedte van de grafiek in SVG-eenheden. Gelijk aan de echte breedte op het scherm, zodat de tekst
 * op elk apparaat even groot blijft. `breedte` = de ruimte die de grafiek krijgt (bijv. een halve kolom);
 * zonder die waarde wordt de breedte van het venster gebruikt (één kolom).
 */
function grafiekBreedte(breedte) {
  if (breedte) return Math.round(Math.max(300, breedte));
  return Math.round(Math.min(960, Math.max(300, (window.innerWidth || 640) - (window.innerWidth >= 900 ? 300 : 66))));
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/**
 * staafGrafiek({ labels, korteLabels, waarden, vergelijk, fmt, naam, vergelijkNaam, markeer })
 * waarden/vergelijk: getallen of null (geen gegevens).
 */
export function staafGrafiek({ labels, korteLabels = labels, waarden, vergelijk = null, fmt, naam = 'Dit jaar', vergelijkNaam = 'Vorig jaar', markeer = [], lijn = null, breedte = null, hoogte = null }) {
  // Breedte volgt het scherm, zodat de tekst op elk apparaat even groot blijft.
  const W = grafiekBreedte(breedte);
  const H = hoogte || (W < 500 ? 200 : 240); const L = 44; const R = lijn ? 44 : 8; const T = 10; const B = 26;
  const alle = [...waarden, ...(vergelijk || [])].filter((v) => v != null);
  const maxV = niceMax(Math.max(0, ...alle));
  const minV = Math.min(0, ...alle) < 0 ? -niceMax(-Math.min(0, ...alle)) : 0;
  const y = (v) => T + (H - T - B) * (1 - (v - minV) / (maxV - minV));
  const n = waarden.length;
  const slot = (W - L - R) / Math.max(1, n);
  const groep = Math.min(slot * 0.8, 36);
  const metVergelijk = Array.isArray(vergelijk);
  const bw = metVergelijk ? Math.max(1.5, (groep - 2) / 2) : groep;

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafiek-svg', role: 'img', 'aria-label': naam });

  // Rasterlijnen en as-labels (4 stappen).
  const span = maxV - minV;
  const mant = span / 10 ** Math.floor(Math.log10(span));
  const stappenAs = Math.abs(mant - 2.5) < 1e-9 || Math.abs(mant - 5) < 1e-9 ? 5 : 4;
  for (let i = 0; i <= stappenAs; i++) {
    const v = minV + (span * i) / stappenAs;
    const yy = y(v);
    svg.append(s('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: v === 0 ? 'g-nul' : 'g-raster' }));
    svg.append(s('text', { x: L - 6, y: yy + 4, class: 'g-as', 'text-anchor': 'end' }, fmt(v, true)));
  }

  // Op een smal scherm minder labels onder de as, zodat ze niet tegen elkaar aan staan.
  const stap = Math.max(1, Math.ceil(n / (W < 500 ? 6 : 12)));
  const staaf = (x, v, cls) => {
    if (v == null || v === 0) return null;
    const y0 = y(0); const y1 = y(v);
    const top = Math.min(y0, y1); const hgt = Math.max(1, Math.abs(y1 - y0));
    const r = Math.min(4, bw / 2, hgt);
    // Afgeronde kant aan de buitenkant (weg van de nullijn).
    const d = v > 0
      ? `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y0} Z`
      : `M${x},${y0} V${top + hgt - r} Q${x},${top + hgt} ${x + r},${top + hgt} H${x + bw - r} Q${x + bw},${top + hgt} ${x + bw},${top + hgt - r} V${y0} Z`;
    return s('path', { d, class: cls });
  };

  // Tweede grootheid als lijn met eigen schaal rechts.
  if (lijn) {
    const lw = lijn.waarden.filter((v) => v != null);
    // Eigen nette schaal: 4 gelijke stappen die het bereik van de lijn omvatten (0 hoeft er niet in).
    const lo = Math.min(0, ...lw); const hi = Math.max(...lw, lo + 1e-9);
    const lStap = niceMax((hi - lo) / 4 || 1);
    const lMin = Math.floor(lo / lStap) * lStap;
    const lMax = Math.max(lMin + 4 * lStap, Math.ceil(hi / lStap) * lStap);
    const y2 = (v) => T + (H - T - B) * (1 - (v - lMin) / (lMax - lMin));
    for (let v = lMin; v <= lMax + lStap / 2; v += lStap) {
      svg.append(s('text', { x: W - R + 6, y: y2(v) + 4, class: 'g-as g-as-lijn', 'text-anchor': 'start' }, lijn.fmt(v, true)));
    }
    let pad = ''; let open = false;
    lijn.waarden.forEach((v, i) => {
      if (v == null) { open = false; return; }
      const x = L + slot * i + slot / 2;
      pad += `${open ? 'L' : 'M'}${x.toFixed(1)},${y2(v).toFixed(1)} `;
      open = true;
    });
    if (pad) svg.append(s('path', { d: pad, class: 'g-lijn' }));
    if (n <= 60) {
      lijn.waarden.forEach((v, i) => {
        if (v != null) svg.append(s('circle', { cx: L + slot * i + slot / 2, cy: y2(v), r: 3, class: 'g-punt' }));
      });
    }
  }

  const info = h('p', { class: 'grafiek-info', 'aria-live': 'polite' }, '\u00a0');
  const toon = (i) => {
    const delen = [`${labels[i]}: ${waarden[i] == null ? 'geen gegevens' : fmt(waarden[i])}`];
    if (metVergelijk) delen.push(`${vergelijkNaam.toLowerCase()}: ${vergelijk[i] == null ? '–' : fmt(vergelijk[i])}`);
    if (lijn) delen.push(`${lijn.naam.toLowerCase()}: ${lijn.waarden[i] == null ? '–' : lijn.fmt(lijn.waarden[i])}`);
    info.textContent = delen.join(' · ');
    svg.querySelectorAll('.g-hit').forEach((el, j) => el.classList.toggle('is-actief', j === i));
  };

  for (let i = 0; i < n; i++) {
    const x0 = L + slot * i + (slot - groep) / 2;
    if (metVergelijk) {
      const a = staaf(x0, vergelijk[i], 'g-vergelijk'); if (a) svg.append(a);
      const b = staaf(x0 + bw + 2, waarden[i], `g-staaf${markeer[i] ? ' g-geschat' : ''}`); if (b) svg.append(b);
    } else {
      const b = staaf(x0, waarden[i], `g-staaf${markeer[i] ? ' g-geschat' : ''}`); if (b) svg.append(b);
    }
    if (i % stap === 0 || i === n - 1) {
      svg.append(s('text', { x: L + slot * i + slot / 2, y: H - 8, class: 'g-as', 'text-anchor': 'middle' }, korteLabels[i]));
    }
    const hit = s('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, class: 'g-hit' });
    hit.addEventListener('pointerenter', () => toon(i));
    hit.addEventListener('click', () => toon(i));
    svg.append(hit);
  }

  const legenda = metVergelijk || lijn
    ? h('div', { class: 'grafiek-legenda' },
      h('span', {}, h('i', { class: 'leg-staaf' }), naam),
      metVergelijk ? h('span', {}, h('i', { class: 'leg-vergelijk' }), vergelijkNaam) : null,
      lijn ? h('span', {}, h('i', { class: 'leg-lijn' }), `${lijn.naam} (as rechts)`) : null)
    : null;
  return h('div', { class: 'grafiek' }, info, svg, legenda);
}

/** Kolom met afgeronde bovenkant (alleen positieve waarden). */
function kolom(x, y0, y1, bw, cls) {
  const hgt = Math.max(1, y0 - y1); const top = y0 - hgt;
  const r = Math.min(3, bw / 2, hgt);
  return s('path', { d: `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y0} Z`, class: cls });
}

/**
 * Zonnepanelen per kalendermaand, één kolom per jaar naast elkaar.
 * De lichte kolom is de opbrengst, het donkere deel daarin wat zelf gebruikt is,
 * en boven de kolom staat de zelfvoorzienendheid.
 * zonGrafiek({ labels (12), korteLabels (12), reeksen: [{ naam, kleur (0–3), waarden: [{ zon, eigen, aandeel } | null] }], fmtKwh, fmtPct })
 * Reeksen van oud naar nieuw.
 */
export function zonGrafiek({ labels, korteLabels, reeksen, fmtKwh, fmtPct, fmtAs, breedte = null, hoogte = null }) {
  const W = grafiekBreedte(breedte);
  const H = hoogte || (W < 500 ? 220 : 260); const L = 44; const R = 8; const T = 24; const B = 26;
  const alle = reeksen.flatMap((r) => r.waarden).filter(Boolean).map((w) => w.zon);
  const maxV = niceMax(Math.max(0, ...alle));
  const y = (v) => T + (H - T - B) * (1 - v / maxV);
  const n = labels.length; const k = Math.max(1, reeksen.length);
  const slot = (W - L - R) / n;
  const tussen = k > 1 ? (slot < 30 ? 1 : 2) : 0;
  const groep = Math.min(slot * 0.86, k * 26 + (k - 1) * tussen);
  const bw = (groep - (k - 1) * tussen) / k;

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafiek-svg', role: 'img', 'aria-label': 'Zonnepanelen per maand' });
  const span = maxV;
  const mant = span / 10 ** Math.floor(Math.log10(span));
  const stappenAs = Math.abs(mant - 2.5) < 1e-9 || Math.abs(mant - 5) < 1e-9 ? 5 : 4;
  for (let i = 0; i <= stappenAs; i++) {
    const v = (span * i) / stappenAs; const yy = y(v);
    svg.append(s('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: v === 0 ? 'g-nul' : 'g-raster' }));
    svg.append(s('text', { x: L - 6, y: yy + 4, class: 'g-as', 'text-anchor': 'end' }, fmtAs(v)));
  }

  // Percentage boven de kolom: liggend als het past, anders staand, bij heel smalle kolommen weg.
  const pctStand = bw >= 18 ? 'liggend' : bw >= 7 ? 'staand' : null;
  const y0 = y(0);
  for (let i = 0; i < n; i++) {
    const x0 = L + slot * i + (slot - groep) / 2;
    reeksen.forEach((r, j) => {
      const w = r.waarden[i];
      if (!w || !w.zon) return;
      const x = x0 + j * (bw + tussen);
      svg.append(kolom(x, y0, y(w.zon), bw, `g-zon g-zon-${r.kleur} g-zon-buiten`));
      if (w.eigen != null && w.eigen > 0) svg.append(kolom(x, y0, y(Math.min(w.eigen, w.zon)), bw, `g-zon g-zon-${r.kleur} g-zon-binnen`));
      if (w.aandeel != null && pctStand) {
        const cx = x + bw / 2; const top = y(w.zon) - 4;
        svg.append(pctStand === 'liggend'
          ? s('text', { x: cx, y: top, class: 'g-pct', 'text-anchor': 'middle' }, fmtPct(w.aandeel))
          : s('text', { x: cx + 3, y: top, class: 'g-pct', 'text-anchor': 'start', transform: `rotate(-90 ${cx + 3} ${top})` }, fmtPct(w.aandeel)));
      }
    });
  }

  const info = h('p', { class: 'grafiek-info', 'aria-live': 'polite' }, ' ');
  const stap = Math.max(1, Math.ceil(n / (W < 500 ? 6 : 12)));
  for (let i = 0; i < n; i++) {
    if (i % stap === 0 || i === n - 1) svg.append(s('text', { x: L + slot * i + slot / 2, y: H - 8, class: 'g-as', 'text-anchor': 'middle' }, korteLabels[i]));
    const hit = s('rect', { x: L + slot * i, y: T - 20, width: slot, height: H - T - B + 20, class: 'g-hit' });
    const toon = () => {
      const delen = [...reeksen].reverse().map((r) => {
        const w = r.waarden[i];
        if (!w) return `${r.naam}: –`;
        return w.eigen == null ? `${r.naam}: ${fmtKwh(w.zon)}`
          : `${r.naam}: ${fmtKwh(w.zon)}, zelf ${fmtKwh(w.eigen)} (${fmtPct(w.aandeel)})`;
      });
      info.textContent = `${labels[i]} · ${delen.join(' · ')}`;
      svg.querySelectorAll('.g-hit').forEach((el, j) => el.classList.toggle('is-actief', j === i));
    };
    hit.addEventListener('pointerenter', toon);
    hit.addEventListener('click', toon);
    svg.append(hit);
  }
  return h('div', { class: 'grafiek' }, info, svg);
}
