// Soorten analyse naast "Zelf samenstellen" op het scherm Analyse.
// Elke soort heeft eigen keuzes (velden) en een eigen resultaat (kaarten).
// De keuzes staan in de analyse-staat `c` en gaan mee in favorieten (zie SOORT_STANDAARD).

import { h } from '../core/dom.js';
import { heatmap } from './grafiek.js';
import { heatmapRijen, heatmapIndeling } from './analyse.js';
import { fmtDatumKort } from './tijd.js';
import { kaart, veld, fmtGetal } from './ui.js';

/** Standaardwaarden van de keuzes van alle soorten (worden onderdeel van een favoriet). */
export const SOORT_STANDAARD = { hmMaat: 'afname' };

const periodeTekst = (van, tot) => `${fmtDatumKort(van)} ${van.slice(0, 4)} – ${fmtDatumKort(tot)} ${tot.slice(0, 4)}`;
const keuze = (waarde, opties, onChange) => h('select', { onChange: (e) => onChange(e.target.value) },
  opties.map(([k, t]) => h('option', { value: k, selected: k === waarde }, t)));

// ---------- Heatmap ----------

const HM_MATEN = [['afname', 'Stroom afgenomen'], ['terug', 'Stroom teruggeleverd'], ['netto', 'Stroom netto (afname − terug)']];

const heatmapSoort = {
  key: 'heatmap',
  naam: 'Heatmap: uur van de dag × datum',
  uitleg: 'Wanneer je stroom afneemt of teruglevert, in één beeld.',
  velden: (c, wijzig) => [veld('Wat', keuze(c.hmMaat, HM_MATEN, (v) => wijzig({ hmMaat: v })))],
  resultaat(a, c, van, tot) {
    const rijen = heatmapRijen(a, c.hmMaat, van, tot);
    const indeling = heatmapIndeling(van, tot);
    const fmt = (v) => `${fmtGetal(v, Math.abs(v) < 1 ? 2 : 1)} kWh`;
    const metData = rijen.filter((r) => r.waarden).length;
    const naam = HM_MATEN.find(([k]) => k === c.hmMaat)[1];
    return kaart(naam,
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · per ${indeling} · kolommen zijn de uren 0–24`),
      metData ? heatmap({ rijen, fmt, deelbaar: c.hmMaat === 'netto' }) : h('p', { class: 'muted' }, 'Geen uurgegevens in deze periode.'),
      h('p', { class: 'hint' }, [
        `Elk vakje is het gemiddelde verbruik in dat uur van de dag, over de dagen van die ${indeling}.`,
        indeling === 'dag' ? '' : ' Kies een periode van hoogstens 2 maanden voor een rij per dag.',
        c.hmMaat === 'netto' ? ' Warm = je nam meer af dan je terugleverde, koel = je leverde meer terug.' : ' Hoe donkerder, hoe meer.',
        ' Alleen dagen met uurgegevens (Vattenfall of HomeWizard) tellen mee; een gestippelde rij heeft geen uurgegevens. Tik op een vakje voor de waarde.',
      ].join('')));
  },
};

/** Alle soorten, in de volgorde van de keuzelijst. "Zelf samenstellen" wordt in scherm-analyse.js getekend. */
export const SOORTEN = [
  { key: 'samenstellen', naam: 'Zelf samenstellen', uitleg: null },
  heatmapSoort,
];
