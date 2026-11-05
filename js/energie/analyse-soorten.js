// Soorten analyse naast "Zelf samenstellen" op het scherm Analyse.
// Elke soort heeft eigen keuzes (velden) en een eigen resultaat (kaarten).
// De keuzes staan in de analyse-staat `c` en gaan mee in favorieten (zie SOORT_STANDAARD).

import { h } from '../core/dom.js';
import { heatmap, staafGrafiek } from './grafiek.js';
import { heatmapRijen, heatmapIndeling, salderingReeks, zonurenReeks } from './analyse.js';
import { fmtDatumKort } from './tijd.js';
import { kaart, veld, fmtGetal, euro } from './ui.js';

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

// ---------- Wat-als: einde saldering ----------

const plus = (v) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${euro(Math.abs(v))}`);
const tarief = (v) => `€ ${fmtGetal(v, 3)}`;

const salderingSoort = {
  key: 'saldering',
  naam: 'Wat als de saldering stopt (2027)',
  resultaat(a, c, van, tot) {
    const r = salderingReeks(a, van, tot, 'maand');
    const t = r.totaal;
    if (!r.na) return kaart('Einde saldering', h('p', { class: 'muted' }, 'Er is geen contract met een regeling na saldering (teruglevering per kWh). Voeg dat toe bij Instellingen → Tarieven.'));
    if (!t.dagen) return kaart('Einde saldering', h('p', { class: 'muted' }, 'Geen stroomgegevens in deze periode.'));
    const verschil = t.na - t.met;
    const maanden = t.dagen / 30.44;
    const vakjes = r.vakjes;
    const grafiek = staafGrafiek({
      labels: vakjes.map((v) => v.label), korteLabels: vakjes.map((v) => v.kort),
      waarden: vakjes.map((v) => (v.dagen ? v.na : null)),
      vergelijk: vakjes.map((v) => (v.dagen ? v.met : null)),
      markeer: vakjes.map((v) => v.geschat),
      fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)),
      naam: 'Na einde saldering', vergelijkNaam: 'Met saldering (nu)',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      h('td', { class: 'num verberg-smal' }, `${fmtGetal(x.afname, 0)} / ${fmtGetal(x.terug, 0)}`),
      h('td', { class: `num${x.geschat ? ' is-geschat' : ''}` }, x.dagen ? euro(x.met) : '–'),
      h('td', { class: `num${x.geschat ? ' is-geschat' : ''}` }, x.dagen ? euro(x.na) : '–'),
      h('td', { class: `num${x.dagen && x.na - x.met > 0 ? ' plus' : ''}` }, x.dagen ? plus(x.na - x.met) : '–'));
    const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num verberg-smal' }, 'Afname / terug (kWh)'),
        h('th', { class: 'num' }, 'Met saldering'), h('th', { class: 'num' }, 'Na einde'), h('th', { class: 'num' }, 'Verschil'))),
      h('tbody', {}, rij('Totaal', t, 'jaar-rij'), vakjes.map((v) => rij(v.label, v)))));
    const nt = r.na.terug;
    return kaart('Wat als de saldering stopt',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · je echte verbruik, doorgerekend met en zonder saldering`),
      h('div', { class: 'kpi-raster analyse-kpi' },
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Met saldering'), h('strong', { class: 'kpi-waarde' }, euro(t.met)), h('span', { class: 'kpi-verschil muted' }, 'stroom en terugleverkosten')),
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Na einde saldering'), h('strong', { class: 'kpi-waarde' }, euro(t.na)), h('span', { class: 'kpi-verschil muted' }, 'zelfde verbruik, regeling 2027')),
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Verschil'), h('strong', { class: `kpi-waarde ${verschil > 0 ? 'is-slecht' : 'is-goed'}` }, plus(verschil)),
          h('span', { class: 'kpi-verschil muted' }, `${plus(verschil / maanden)} per maand gemiddeld`))),
      grafiek, tabel,
      h('p', { class: 'hint' }, [
        `Met saldering wordt elke teruggeleverde kWh verrekend tegen het tarief van hetzelfde tijdvak, plus vaste terugleverkosten (samen ${euro(t.vastTerug)} in deze periode). `,
        `Na de saldering betaal je voor alle ${fmtGetal(t.afname, 0)} kWh afname het volle tarief (${euro(t.afnameKosten)}), krijg je voor ${fmtGetal(t.terug, 0)} kWh teruglevering ${tarief(nt.vergoeding)} per kWh (${euro(t.vergoeding)}) en betaal je ${tarief(nt.kostenPerKwh)} per kWh terugleverkosten (${euro(t.terugKosten)}). `,
        `De tarieven voor teruglevering komen uit het contract "${r.na.naam || 'na saldering'}" (Instellingen → Tarieven); levering en energiebelasting zijn in beide gevallen die van je huidige contract, zodat alleen het effect van de saldering overblijft. Vaste kosten en gas tellen niet mee: die veranderen niet. Cursief = (deels) geschat, omdat voor sommige dagen geen uurverdeling bekend is.`,
      ].join('')));
  },
};

// ---------- Eigen verbruik: zonuren ----------

const zonurenSoort = {
  key: 'zonuren',
  naam: 'Eigen verbruik: afname in de zonuren',
  resultaat(a, c, van, tot) {
    const r = zonurenReeks(a, van, tot, 'maand');
    const t = r.totaal;
    if (!t.dagen) return kaart('Eigen verbruik', h('p', { class: 'muted' }, 'Geen dagen met uurgegevens in deze periode.'));
    const uA = r.perUur.afname.vakjes; const uT = r.perUur.terug.vakjes;
    const kwh = (v, d = 1) => `${fmtGetal(v, d)} kWh`;
    const grafiek = staafGrafiek({
      labels: uA.map((v) => v.label), korteLabels: uA.map((v) => v.kort),
      waarden: uA.map((v) => v.v), vergelijk: uT.map((v) => v.v),
      fmt: (v, as) => (as ? fmtGetal(v, Number.isInteger(v) || Math.abs(v) >= 10 ? 0 : 1) : kwh(v, 2)),
      naam: 'Afname (gemiddeld per dag)', vergelijkNaam: 'Teruglevering (gemiddeld per dag)',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      h('td', { class: 'num verberg-smal' }, x.dagen ? fmtGetal(x.afname, 0) : '–'),
      h('td', { class: 'num verberg-smal' }, x.dagen ? fmtGetal(x.terug, 0) : '–'),
      h('td', { class: 'num' }, x.dagen ? fmtGetal(x.inZon, 0) : '–'),
      h('td', { class: 'num' }, x.dagen ? fmtGetal(x.verschuifbaar, 0) : '–'),
      h('td', { class: 'num' }, x.dagen && x.waardeNa != null ? euro(x.waardeNa) : '–'));
    const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num verberg-smal' }, 'Afname'), h('th', { class: 'num verberg-smal' }, 'Terug'),
        h('th', { class: 'num' }, 'In zonuren'), h('th', { class: 'num' }, 'Te verschuiven'), h('th', { class: 'num' }, 'Waarde 2027'))),
      h('tbody', {}, rij('Totaal', t, 'jaar-rij'), r.vakjes.map((v) => rij(v.label, v)))));
    const pct = t.afname ? t.inZon / t.afname : 0;
    return kaart('Eigen verbruik: afname in de zonuren',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${t.dagen} dagen met uurgegevens`),
      h('div', { class: 'kpi-raster analyse-kpi' },
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Afname in de zonuren'), h('strong', { class: 'kpi-waarde' }, kwh(t.inZon, 0)),
          h('span', { class: 'kpi-verschil muted' }, `${fmtGetal(pct * 100, 0)}% van je afname, terwijl je ook terugleverde`)),
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Te verschuiven naar de zonuren'), h('strong', { class: 'kpi-waarde' }, kwh(t.verschuifbaar, 0)),
          h('span', { class: 'kpi-verschil muted' }, 'afname op andere uren, gedekt door je teruglevering van die dag')),
        h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Waarde daarvan'), h('strong', { class: 'kpi-waarde' }, t.waardeNa != null ? euro(t.waardeNa) : '–'),
          h('span', { class: 'kpi-verschil muted' }, `na einde saldering (nu met saldering: ${euro(t.waardeNu)})`))),
      grafiek, tabel,
      h('p', { class: 'hint' }, [
        `Een zonuur is een uur waarin je meer dan ${fmtGetal(0.05, 2)} kWh terugleverde. De grafiek toont per uur van de dag de gemiddelde afname en teruglevering. `,
        'Te verschuiven = per dag het kleinste van je afname buiten de zonuren en je teruglevering: zoveel had je met eigen zonnestroom kunnen dekken als je dat verbruik (bijv. de wasmachine, vaatwasser of de auto) naar de zonuren had verplaatst. Een bovengrens: niet al je verbruik is te verplaatsen. ',
        `Na de saldering bespaart elke verschoven kWh het afnametarief, min de vergoeding die je dan misloopt (${tarief(r.na?.terug?.vergoeding || 0)}) en plus de terugleverkosten die je niet betaalt (${tarief(r.na?.terug?.kostenPerKwh || 0)}). Met saldering levert verschuiven alleen het verschil tussen de tijdvaktarieven op. `,
        'Alleen dagen met uurgegevens (Vattenfall of HomeWizard) tellen mee.',
      ].join('')));
  },
};

/** Alle soorten, in de volgorde van de keuzelijst. "Zelf samenstellen" wordt in scherm-analyse.js getekend. */
export const SOORTEN = [
  { key: 'samenstellen', naam: 'Zelf samenstellen', uitleg: null },
  heatmapSoort,
  salderingSoort,
  zonurenSoort,
];
