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
export function staafGrafiek({ labels, korteLabels = labels, waarden, vergelijk = null, fmt, naam = 'Dit jaar', vergelijkNaam = 'Vorig jaar', markeer = [], markeerVergelijk = [], plafond = null, toelichting = null, lijn = null, grens = null, breedte = null, hoogte = null }) {
  // Breedte volgt het scherm, zodat de tekst op elk apparaat even groot blijft.
  const W = grafiekBreedte(breedte);
  const H = hoogte || (W < 500 ? 200 : 240); const L = 44; const R = lijn ? 44 : 8; const T = 10; const B = 26;
  const alle = [...waarden, ...(vergelijk || []), ...(grens ? [grens.waarde] : [])].filter((v) => v != null);
  // Met een plafond bepaalt dat de schaal; hogere staven worden afgekapt (met een pijltje erboven).
  const maxV = niceMax(plafond != null ? plafond : Math.max(0, ...alle));
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

  // Grenslijn (bijv. wat de hoofdzekering aankan), gestippeld met een label erboven.
  if (grens) {
    const yy = y(grens.waarde);
    svg.append(s('line', { x1: L, x2: W - R, y1: yy, y2: yy, class: 'g-grens' }));
    svg.append(s('text', { x: W - R - 4, y: yy - 5, class: 'g-as g-grens-tekst', 'text-anchor': 'end' }, grens.naam));
  }

  // Op een smal scherm minder labels onder de as, zodat ze niet tegen elkaar aan staan.
  const stap = n <= 8 ? 1 : Math.max(1, Math.ceil(n / (W < 500 ? 6 : 12)));
  const staaf = (x, v, cls) => {
    if (v == null || v === 0) return null;
    const afgekapt = plafond != null && v > maxV;
    const y0 = y(0); const y1 = y(afgekapt ? maxV : v);
    const top = Math.min(y0, y1); const hgt = Math.max(1, Math.abs(y1 - y0));
    const r = Math.min(4, bw / 2, hgt);
    // Afgeronde kant aan de buitenkant (weg van de nullijn).
    const d = v > 0
      ? `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y0} Z`
      : `M${x},${y0} V${top + hgt - r} Q${x},${top + hgt} ${x + r},${top + hgt} H${x + bw - r} Q${x + bw},${top + hgt} ${x + bw},${top + hgt - r} V${y0} Z`;
    if (!afgekapt) return s('path', { d, class: cls });
    const g = s('g', {});
    g.append(s('path', { d, class: cls }));
    g.append(s('text', { x: x + bw / 2, y: top + 9, class: 'g-afgekapt', 'text-anchor': 'middle' }, '↑'));
    return g;
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
    const extra = (t) => (t ? ` (${t})` : '');
    const delen = [`${labels[i]}: ${waarden[i] == null ? 'geen gegevens' : fmt(waarden[i]) + extra(toelichting?.(i, false))}`];
    if (metVergelijk) delen.push(`${vergelijkNaam.toLowerCase()}: ${vergelijk[i] == null ? '–' : fmt(vergelijk[i]) + extra(toelichting?.(i, true))}`);
    if (lijn) delen.push(`${lijn.naam.toLowerCase()}: ${lijn.waarden[i] == null ? '–' : lijn.fmt(lijn.waarden[i])}`);
    info.textContent = delen.join(' · ');
    svg.querySelectorAll('.g-hit').forEach((el, j) => el.classList.toggle('is-actief', j === i));
  };

  for (let i = 0; i < n; i++) {
    const x0 = L + slot * i + (slot - groep) / 2;
    if (metVergelijk) {
      const a = staaf(x0, vergelijk[i], `g-vergelijk${markeerVergelijk[i] ? ' g-vergelijk-licht' : ''}`); if (a) svg.append(a);
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
  const stap = n <= 8 ? 1 : Math.max(1, Math.ceil(n / (W < 500 ? 6 : 12)));
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

/** Klassieke stoplichtkleuren voor de heatmap: groen (gewenst) → geel → oranje → rood (ongewenst). */
const HM_KLEUREN = ['#1a9850', '#91cf60', '#fee08b', '#fc8d59', '#d73027'];
function stoplicht(f) {
  const x = Math.max(0, Math.min(1, f)) * (HM_KLEUREN.length - 1);
  const i = Math.min(HM_KLEUREN.length - 2, Math.floor(x)); const t = x - i;
  const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const [p, q] = [rgb(HM_KLEUREN[i]), rgb(HM_KLEUREN[i + 1])];
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * t)).join(',')})`;
}
/** Waarde bij het gegeven percentiel (0–1); zo bepalen een paar uitschieters niet de hele kleurschaal. */
function percentiel(waarden, p) {
  const w = [...waarden].sort((x, y) => x - y);
  return w.length ? w[Math.min(w.length - 1, Math.floor(p * (w.length - 1)))] : 0;
}

/**
 * Heatmap: rijen (datum) × 24 kolommen (uur van de dag), in stoplichtkleuren.
 * heatmap({ rijen: [{ label, kort, waarden: [24] | null }], fmt, deelbaar, hoogIsGoed })
 * Groen = gewenst, rood = ongewenst. Standaard is weinig gewenst (afname, gas); met `hoogIsGoed`
 * is veel gewenst (teruglevering). Bij `deelbaar` (netto) loopt de schaal van veel teruglevering
 * (groen) via nul (geel) naar veel afname (rood). De schaal loopt tot het 95e percentiel, zodat
 * een paar uitschieters (bijv. de auto laden) niet alles groen maken; hogere waarden zijn gewoon rood.
 */
export function heatmap({ rijen, fmt, deelbaar = false, hoogIsGoed = false, breedte = null }) {
  const W = grafiekBreedte(breedte);
  const L = W < 500 ? 46 : 64; const R = 4; const T = 4; const B = 20;
  const cel = (W - L - R) / 24;
  const rh = Math.max(4, Math.min(18, Math.floor(560 / Math.max(1, rijen.length))));
  const H = T + rh * rijen.length + B;
  const alle = rijen.flatMap((r) => r.waarden || []);
  const maxAbs = Math.max(1e-9, percentiel(alle.map(Math.abs), 0.95));
  const maxPos = Math.max(1e-9, percentiel(alle, 0.95));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafiek-svg', role: 'img', 'aria-label': 'Heatmap per uur' });

  const kleur = (v) => {
    if (deelbaar) return stoplicht(0.5 + v / maxAbs / 2);
    const f = v / maxPos;
    return stoplicht(hoogIsGoed ? 1 - f : f);
  };

  const info = h('p', { class: 'grafiek-info', 'aria-live': 'polite' }, ' ');
  const labelStap = Math.max(1, Math.ceil(14 / rh));
  rijen.forEach((r, i) => {
    const y = T + i * rh;
    if (i % labelStap === 0) svg.append(s('text', { x: L - 6, y: y + Math.min(rh, 12) - 1, class: 'g-as', 'text-anchor': 'end' }, r.kort));
    if (!r.waarden) {
      svg.append(s('rect', { x: L, y, width: cel * 24, height: rh - 1, class: 'hm-leeg' }));
      return;
    }
    r.waarden.forEach((v, uur) => {
      const rect = s('rect', { x: L + uur * cel, y, width: Math.max(1, cel - 1), height: Math.max(1, rh - 1), rx: 1.5, class: 'hm-cel' });
      // Via CSSOM, niet als style-attribuut: de Content-Security-Policy staat geen inline stijlen toe.
      rect.style.fill = kleur(v);
      const toon = () => {
        info.textContent = `${r.label}, ${String(uur).padStart(2, '0')}:00–${String((uur + 1) % 24).padStart(2, '0')}:00: ${fmt(v)} per uur (gemiddeld)`;
        svg.querySelectorAll('.hm-cel.is-actief').forEach((el) => el.classList.remove('is-actief'));
        rect.classList.add('is-actief');
      };
      rect.addEventListener('pointerenter', toon);
      rect.addEventListener('click', toon);
      svg.append(rect);
    });
  });
  for (let uur = 0; uur <= 24; uur += (W < 500 ? 6 : 3)) {
    svg.append(s('text', { x: L + uur * cel, y: H - 6, class: 'g-as', 'text-anchor': uur === 0 ? 'start' : uur === 24 ? 'end' : 'middle' }, `${uur}`));
  }

  // De legenda loopt altijd van groen (links) naar rood (rechts).
  const legenda = deelbaar
    ? h('div', { class: 'hm-legenda' },
      h('span', {}, `${fmt(maxAbs)} terug`), h('i', { class: 'hm-balk' }), h('span', {}, `${fmt(maxAbs)} afname`))
    : hoogIsGoed
      ? h('div', { class: 'hm-legenda' }, h('span', {}, fmt(maxPos)), h('i', { class: 'hm-balk' }), h('span', {}, fmt(0)))
      : h('div', { class: 'hm-legenda' }, h('span', {}, fmt(0)), h('i', { class: 'hm-balk' }), h('span', {}, fmt(maxPos)));
  return h('div', { class: 'grafiek' }, info, svg, legenda);
}

/**
 * Puntenwolk met een lijn erdoor (bijv. gas per dag tegen temperatuur).
 * puntenGrafiek({ punten: [{ x, y, label }], lijn: (x) => y | null, fmtX, fmtY, naamX, naamY, naamLijn })
 */
export function puntenGrafiek({ punten, lijn = null, fmtX, fmtY, naamX, naamY, naamPunt = 'Dag', naamLijn = 'Lijn', breedte = null }) {
  const W = grafiekBreedte(breedte);
  const H = W < 500 ? 240 : 300; const L = 44; const R = 10; const T = 10; const B = 36;
  const xs = punten.map((p) => p.x); const ys = punten.map((p) => p.y);
  const xStap = niceMax((Math.max(...xs) - Math.min(...xs)) / 9 || 1);
  const xMin = Math.floor(Math.min(...xs) / xStap) * xStap; const xMax = Math.ceil(Math.max(...xs) / xStap) * xStap;
  const yMax = niceMax(Math.max(...ys, 0)); const yMin = Math.min(0, ...ys);
  const px = (x) => L + (W - L - R) * ((x - xMin) / (xMax - xMin || 1));
  const py = (y) => T + (H - T - B) * (1 - (y - yMin) / (yMax - yMin || 1));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafiek-svg', role: 'img', 'aria-label': `${naamY} tegen ${naamX}` });
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4;
    svg.append(s('line', { x1: L, x2: W - R, y1: py(v), y2: py(v), class: v === 0 ? 'g-nul' : 'g-raster' }));
    svg.append(s('text', { x: L - 6, y: py(v) + 4, class: 'g-as', 'text-anchor': 'end' }, fmtY(v, true)));
  }
  const xLabelElke = Math.max(1, Math.ceil(((xMax - xMin) / xStap) / (W < 500 ? 6 : 12)));
  for (let x = xMin, i = 0; x <= xMax + 1e-9; x += xStap, i++) {
    if (i % xLabelElke === 0) svg.append(s('text', { x: px(x), y: H - 20, class: 'g-as', 'text-anchor': 'middle' }, fmtX(x, true)));
  }
  svg.append(s('text', { x: (L + W - R) / 2, y: H - 4, class: 'g-as', 'text-anchor': 'middle' }, naamX));

  const info = h('p', { class: 'grafiek-info', 'aria-live': 'polite' }, ' ');
  const r = punten.length > 200 ? 2.5 : 3.5;
  punten.forEach((p) => {
    const c = s('circle', { cx: px(p.x), cy: py(p.y), r, class: 'g-wolk' });
    c.addEventListener('pointerenter', () => { info.textContent = `${p.label}: ${fmtX(p.x)}, ${fmtY(p.y)}`; });
    c.addEventListener('click', () => { info.textContent = `${p.label}: ${fmtX(p.x)}, ${fmtY(p.y)}`; });
    svg.append(c);
  });
  if (lijn) {
    let d = '';
    const stappen = 80;
    for (let i = 0; i <= stappen; i++) {
      const x = xMin + ((xMax - xMin) * i) / stappen;
      d += `${i ? 'L' : 'M'}${px(x).toFixed(1)},${py(Math.max(yMin, Math.min(yMax, lijn(x)))).toFixed(1)} `;
    }
    svg.append(s('path', { d, class: 'g-lijn' }));
  }
  const legenda = h('div', { class: 'grafiek-legenda' },
    h('span', {}, h('i', { class: 'leg-staaf leg-punt' }), naamPunt),
    lijn ? h('span', {}, h('i', { class: 'leg-lijn' }), naamLijn) : null);
  return h('div', { class: 'grafiek' }, info, svg, legenda);
}

/**
 * Lijnen door het jaar (x = dag van het jaar, 1 jan t/m 31 dec), één per jaar, kleur per jaar (--jaar-N).
 * lijnenGrafiek({ reeksen: [{ naam, kleur (0–3), waarden: [366] }], fmt, xLabel: (i) => tekst })
 * Aanwijzen toont de waarden van alle jaren op die dag (kruisdraad).
 */
export function lijnenGrafiek({ reeksen, fmt, xLabel, breedte = null }) {
  const W = grafiekBreedte(breedte);
  const H = W < 500 ? 220 : 280; const L = 48; const R = 10; const T = 10; const B = 26;
  const n = 366;
  const alle = reeksen.flatMap((r) => r.waarden).filter((v) => v != null);
  const maxV = niceMax(Math.max(0, ...alle));
  const minV = Math.min(0, ...alle) < 0 ? -niceMax(-Math.min(0, ...alle)) : 0;
  const px = (i) => L + ((W - L - R) * i) / (n - 1);
  const py = (v) => T + (H - T - B) * (1 - (v - minV) / (maxV - minV));
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'grafiek-svg', role: 'img', 'aria-label': 'Opgeteld verloop per jaar' });
  for (let i = 0; i <= 4; i++) {
    const v = minV + ((maxV - minV) * i) / 4;
    svg.append(s('line', { x1: L, x2: W - R, y1: py(v), y2: py(v), class: v === 0 ? 'g-nul' : 'g-raster' }));
    svg.append(s('text', { x: L - 6, y: py(v) + 4, class: 'g-as', 'text-anchor': 'end' }, fmt(v, true)));
  }
  // Maandlabels op de 1e van de maand (jaar met 366 dagen als raster).
  const maandStartIdx = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
  maandStartIdx.forEach((idx, m) => {
    if (W < 500 && m % 2) return;
    svg.append(s('text', { x: px(idx + 15), y: H - 8, class: 'g-as', 'text-anchor': 'middle' }, MND[m]));
  });
  reeksen.forEach((r) => {
    let d = ''; let open = false;
    r.waarden.forEach((v, i) => {
      if (v == null) { open = false; return; }
      d += `${open ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)} `; open = true;
    });
    if (d) svg.append(s('path', { d, class: `g-jaarlijn g-jaar-${r.kleur}` }));
  });
  const kruis = s('line', { x1: 0, x2: 0, y1: T, y2: H - B, class: 'g-kruis', visibility: 'hidden' });
  svg.append(kruis);
  const info = h('p', { class: 'grafiek-info', 'aria-live': 'polite' }, ' ');
  const hit = s('rect', { x: L, y: T, width: W - L - R, height: H - T - B, class: 'g-hit-vlak' });
  const toon = (e) => {
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((x - L) / (W - L - R)) * (n - 1))));
    kruis.setAttribute('x1', px(i)); kruis.setAttribute('x2', px(i)); kruis.setAttribute('visibility', 'visible');
    info.textContent = `${xLabel(i)}: ${reeksen.map((r) => `${r.naam} ${r.waarden[i] == null ? '–' : fmt(r.waarden[i])}`).join(' · ')}`;
  };
  hit.addEventListener('pointermove', toon);
  hit.addEventListener('click', toon);
  svg.append(hit);
  const legenda = h('div', { class: 'grafiek-legenda' },
    reeksen.map((r) => h('span', {}, h('i', { class: `leg-jaarlijn g-jaar-${r.kleur}` }), r.naam)));
  return h('div', { class: 'grafiek' }, info, svg, legenda);
}
