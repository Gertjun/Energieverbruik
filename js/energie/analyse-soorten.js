// Soorten analyse naast "Zelf samenstellen" op het scherm Analyse.
// Elke soort heeft eigen keuzes (velden) en een eigen resultaat (kaarten).
// De keuzes staan in de analyse-staat `c` en gaan mee in favorieten (zie SOORT_STANDAARD).

import { h } from '../core/dom.js';
import { heatmap, staafGrafiek, puntenGrafiek, lijnenGrafiek } from './grafiek.js';
import { heatmapRijen, heatmapIndeling, salderingReeks, zonurenReeks, stooklijn, weerGecorrigeerd, vorigJaar, cumulatief, dagVanJaar, jaarPrognose, MATEN, reeks, past } from './analyse.js';
import { fmtDatumKort, addDays, fmtMaand, fmtMaandKort, daysBetween } from './tijd.js';
import { totaal } from './model.js';
import { kaart, veld, fmtGetal, euro } from './ui.js';

/** Standaardwaarden van de keuzes van alle soorten (worden onderdeel van een favoriet). */
export const SOORT_STANDAARD = { hmMaat: 'afname', wgRef: 'vorigjaar', wgVan: '', wgTot: '', cuMaat: 'gas', cuJaren: '2', topMaat: 'afname', topIndeling: 'dag' };

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

// ---------- Stooklijn ----------

const m3 = (v, d = 2) => `${fmtGetal(v, d)} m³`;
const graden = (v) => `${fmtGetal(v, 1)} °C`;

const stooklijnSoort = {
  key: 'stooklijn',
  naam: 'Stooklijn: gas tegen buitentemperatuur',
  resultaat(a, c, van, tot) {
    const { punten, fit } = stooklijn(a, van, tot);
    if (punten.length < 14) return kaart('Stooklijn', h('p', { class: 'muted' }, 'Te weinig dagen met gas én temperatuur in deze periode (minimaal 14). Kies een langere periode.'));
    const gas = punten.reduce((s2, p) => s2 + p.gas, 0);
    const vastTotaal = fit ? fit.vast * punten.length : null;
    const grafiek = puntenGrafiek({
      punten: punten.map((p) => ({ x: p.t, y: p.gas, label: `${fmtDatumKort(p.datum)} ${p.datum.slice(0, 4)}` })),
      lijn: fit ? fit.voorspel : null,
      fmtX: (v, as) => (as ? `${fmtGetal(v, 0)}°` : graden(v)), fmtY: (v, as) => (as ? fmtGetal(v, 0) : m3(v)),
      naamX: 'Gemiddelde buitentemperatuur van de dag (°C)', naamY: 'Gas per dag (m³)', naamPunt: 'Gas op één dag', naamLijn: 'Stooklijn',
    });
    const kpi = (titel, waarde, uitleg) => h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, titel), h('strong', { class: 'kpi-waarde' }, waarde), h('span', { class: 'kpi-verschil muted' }, uitleg));
    return kaart('Stooklijn: gas tegen buitentemperatuur',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${punten.length} dagen met gas en temperatuur`),
      fit ? h('div', { class: 'kpi-raster analyse-kpi' },
        kpi('Vast verbruik', `${m3(fit.vast)} per dag`, `warm water en koken; ${m3(vastTotaal, 0)} van de ${m3(gas, 0)} in deze periode`),
        kpi('Stookgrens', graden(fit.stookgrens), 'boven deze buitentemperatuur stookt de verwarming (bijna) niet'),
        kpi('Per graad kouder', `+${m3(fit.k, 2)} per dag`, `voor elke graad onder de stookgrens; samen ${m3(gas - vastTotaal, 0)} voor verwarming`))
        : h('p', { class: 'muted' }, 'Er is geen duidelijke stooklijn te vinden in deze periode (bijv. alleen zomerdagen). Kies een periode met een stookseizoen.'),
      grafiek,
      h('p', { class: 'hint' }, [
        'Elke stip is een dag. De lijn is de best passende stooklijn: onder de stookgrens stijgt het gasverbruik met een vast aantal m³ per graad kouder, daarboven blijft alleen het vaste verbruik over. ',
        fit?.r2 != null ? `De lijn verklaart ${fmtGetal(fit.r2 * 100, 0)}% van de verschillen tussen de dagen; de rest komt door bijvoorbeeld wind, zon, thuis zijn of een warme douche meer. ` : '',
        'Een lagere lijn betekent zuiniger stoken (beter isoleren, de thermostaat lager); een lagere stookgrens betekent dat je later in het najaar begint met stoken. Vergelijk twee stookseizoenen door de periode te wisselen. Tik op een stip voor de datum.',
      ].join('')));
  },
};

// ---------- Weer-gecorrigeerd vergelijken ----------

const weerSoort = {
  key: 'weergas',
  naam: 'Gas weer-gecorrigeerd vergelijken',
  velden: (c, wijzig, a) => [
    veld('Vergelijken met', keuze(c.wgRef, [['vorigjaar', 'Dezelfde periode vorig jaar'], ['periode', 'Een eigen periode']], (v) => wijzig({ wgRef: v }))),
    c.wgRef === 'periode' ? veld('Vergelijkingsperiode van', h('input', { type: 'date', value: c.wgVan || '', min: a.eerste, onChange: (e) => wijzig({ wgVan: e.target.value }) })) : null,
    c.wgRef === 'periode' ? veld('Vergelijkingsperiode tot en met', h('input', { type: 'date', value: c.wgTot || '', onChange: (e) => wijzig({ wgTot: e.target.value }) })) : null,
  ],
  resultaat(a, c, van, tot) {
    const ref = c.wgRef === 'periode' && c.wgVan && c.wgTot && c.wgVan < c.wgTot ? { van: c.wgVan, tot: c.wgTot } : vorigJaar('maand', van, tot);
    const r = weerGecorrigeerd(a, van, tot, ref.van, ref.tot);
    const t = r.totaal;
    const refTekst = periodeTekst(ref.van, ref.tot);
    if (!r.fit) {
      return kaart('Gas weer-gecorrigeerd', h('p', { class: 'hint' }, `${periodeTekst(van, tot)} tegenover ${refTekst}`),
        h('p', { class: 'muted' }, `In de vergelijkingsperiode (${refTekst}) staan te weinig stookdagen met gas en temperatuur om een stooklijn te bepalen (${r.ref.punten.length} dagen). Kies bij "Vergelijken met" een eigen periode met een stookseizoen, of een latere periode hierboven.`));
    }
    const verschil = t.gas - t.verwacht;
    const pct = t.verwacht ? verschil / t.verwacht : null;
    const rijen = r.perMaand.filter((m) => m.dagen);
    if (!rijen.length) {
      return kaart('Gas weer-gecorrigeerd', h('p', { class: 'hint' }, `${periodeTekst(van, tot)} tegenover ${refTekst}`),
        h('p', { class: 'muted' }, 'Geen dagen in deze periode met een temperatuur die ook in de vergelijkingsperiode voorkwam. Kies een vergelijkingsperiode uit hetzelfde seizoen.'));
    }
    const grafiek = staafGrafiek({
      labels: rijen.map((m) => m.label), korteLabels: rijen.map((m) => m.kort),
      waarden: rijen.map((m) => m.gas), vergelijk: rijen.map((m) => m.verwacht),
      fmt: (v, as) => (as ? fmtGetal(v, 0) : m3(v, 1)),
      naam: 'Werkelijk', vergelijkNaam: 'Verwacht met stookgedrag vergelijkingsperiode',
    });
    const pctTekst = (v) => (v == null ? '–' : `${v > 0 ? '+' : ''}${fmtGetal(v * 100, 0)}%`);
    const rij = (label, m, cls) => {
      const vv = m.verwacht != null ? m.gas - m.verwacht : null;
      return h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
        h('td', { class: 'num verberg-smal' }, fmtGetal(m.gd, 0)),
        h('td', { class: 'num' }, fmtGetal(m.gas, 0)),
        h('td', { class: 'num' }, m.verwacht == null ? '–' : fmtGetal(m.verwacht, 0)),
        h('td', { class: `num${vv > 0 ? ' plus' : ''}` }, vv == null ? '–' : pctTekst(m.verwacht ? vv / m.verwacht : null)),
        h('td', { class: 'num verberg-smal' }, m.vorigJaar == null ? '–' : fmtGetal(m.vorigJaar, 0)));
    };
    const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num verberg-smal' }, 'Graaddagen'), h('th', { class: 'num' }, 'Werkelijk (m³)'),
        h('th', { class: 'num' }, 'Verwacht (m³)'), h('th', { class: 'num' }, 'Verschil'), h('th', { class: 'num verberg-smal' }, 'Vorig jaar echt (m³)'))),
      h('tbody', {}, rij('Totaal', { ...t, vorigJaar: rijen.some((m) => m.vorigJaar != null) ? rijen.reduce((s2, m) => s2 + (m.vorigJaar || 0), 0) : null }, 'jaar-rij'),
        rijen.map((m) => rij(m.label, m)))));
    const kpi = (titel, waarde, uitleg, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, titel), h('strong', { class: `kpi-waarde ${cls}` }, waarde), h('span', { class: 'kpi-verschil muted' }, uitleg));
    return kaart('Gas weer-gecorrigeerd vergelijken',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} tegenover het stookgedrag van ${refTekst}`),
      h('div', { class: 'kpi-raster analyse-kpi' },
        kpi('Werkelijk verbruikt', m3(t.gas, 0), `${t.dagen} vergelijkbare dagen${r.buiten ? `; ${r.buiten} dagen buiten het temperatuurbereik tellen niet mee` : ''}`),
        kpi('Verwacht bij dit weer', m3(t.verwacht, 0), 'als je had gestookt zoals in de vergelijkingsperiode'),
        kpi(verschil <= 0 ? 'Zuiniger' : 'Minder zuinig', pctTekst(pct), `${verschil > 0 ? '+' : '−'}${m3(Math.abs(verschil), 0)}, los van het weer`, verschil <= 0 ? 'is-goed' : 'is-slecht')),
      grafiek, tabel,
      h('p', { class: 'hint' }, [
        `Uit de vergelijkingsperiode wordt je stooklijn bepaald (vast ${m3(r.fit.vast)} per dag, stookgrens ${fmtGetal(r.fit.stookgrens, 1)} °C, ${m3(r.fit.k)} per graad kouder; zie Stooklijn). `,
        `Alleen dagen met een temperatuur die ook in de vergelijkingsperiode voorkwam (${fmtGetal(r.bereik[0], 1)} tot ${fmtGetal(r.bereik[1], 1)} °C) tellen mee; daarbuiten is de lijn een gok. `,
        'Met die lijn en de temperaturen van deze periode volgt wat je verbruikt zou hebben als je net zo had gestookt. Het verschil met wat je echt verbruikte komt dus niet door het weer, maar door bijvoorbeeld de thermostaat, isolatie of thuis zijn. ',
        '"Vorig jaar echt" is ter vergelijking het werkelijke verbruik in dezelfde maand een jaar eerder, zonder correctie.',
      ].join('')));
  },
};

// ---------- Cumulatief verloop ----------

const CU_MATEN = [
  ['afname', 'Stroom afgenomen', 'kWh'], ['terug', 'Stroom teruggeleverd', 'kWh'], ['netto', 'Stroom netto (afname − terug)', 'kWh'],
  ['gas', 'Gas', 'm³'], ['kosten', 'Kosten totaal', '€'], ['kostenStroom', 'Kosten stroom (variabel)', '€'], ['kostenGas', 'Kosten gas (variabel)', '€'],
];

const cumulatiefSoort = {
  key: 'cumulatief',
  naam: 'Opgeteld verloop door het jaar',
  geenPeriode: true,
  velden: (c, wijzig) => [
    veld('Wat', keuze(c.cuMaat, CU_MATEN.map(([k, t]) => [k, t]), (v) => wijzig({ cuMaat: v }))),
    veld('Jaren', keuze(c.cuJaren, [['2', 'Dit jaar en vorig jaar'], ['3', 'De laatste 3 jaar'], ['4', 'De laatste 4 jaar']], (v) => wijzig({ cuJaren: v }))),
  ],
  resultaat(a, c) {
    const [, naam, eenheid] = CU_MATEN.find(([k]) => k === c.cuMaat) || CU_MATEN[3];
    const dit = Number(a.laatste.slice(0, 4));
    const jaren = Array.from({ length: Number(c.cuJaren) || 2 }, (_, i) => dit - i).reverse();
    const reeksen = cumulatief(a, c.cuMaat, jaren).filter((r) => r.totaal != null);
    if (!reeksen.length) return kaart(naam, h('p', { class: 'muted' }, 'Geen gegevens in deze jaren.'));
    const fmt = (v, as) => (eenheid === '€' ? (as ? `€${fmtGetal(v, 0)}` : euro(v)) : `${fmtGetal(v, as || Math.abs(v) >= 100 ? 0 : 1)}${as ? '' : ` ${eenheid}`}`);
    const xLabel = (i) => fmtDatumKort(addDays('2024-01-01', i));
    const grafiek = lijnenGrafiek({
      reeksen: reeksen.map((r) => ({ naam: String(r.jaar), kleur: dit - r.jaar, waarden: r.waarden })),
      fmt, xLabel,
    });
    // Vergelijking op dezelfde dag: tot en met de laatste dag met gegevens van dit jaar.
    const idx = dagVanJaar(a.laatste);
    const nu = reeksen.find((r) => r.jaar === dit);
    const vj = reeksen.find((r) => r.jaar === dit - 1);
    const opDag = (r) => r?.waarden[idx] ?? null;
    const MND = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const maandEindIdx = [30, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
    const cel = (v) => (v == null ? '–' : eenheid === '€' ? euro(v) : fmtGetal(v, Math.abs(v) >= 100 ? 0 : 1));
    const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Tot en met'), reeksen.map((r) => h('th', { class: 'num' }, `${r.jaar}${eenheid === '€' ? '' : ` (${eenheid})`}`)))),
      h('tbody', {},
        h('tr', { class: 'jaar-rij' }, h('th', { scope: 'row' }, xLabel(idx)), reeksen.map((r) => h('td', { class: 'num' }, cel(opDag(r))))),
        MND.map((m, i) => h('tr', {}, h('td', {}, `eind ${m}`), reeksen.map((r) => {
          const v = r.laatste && dagVanJaar(r.laatste) >= maandEindIdx[i] ? r.waarden[maandEindIdx[i]] : null;
          return h('td', { class: 'num' }, cel(v));
        }))))));
    const laat = reeksen.filter((r) => r.eerste && r.eerste.slice(5) > '01-07');
    let kern = null;
    if (nu && vj && opDag(nu) != null && opDag(vj) != null) {
      // Vergelijk alleen het stuk van het jaar dat in beide jaren gegevens heeft.
      const start = Math.max(dagVanJaar(nu.eerste), dagVanJaar(vj.eerste));
      if (start <= idx) {
        const stuk = (r) => r.waarden[idx] - (start > 0 ? (r.waarden[start - 1] ?? 0) : 0);
        const x = stuk(nu); const y = stuk(vj); const vv = x - y;
        const pct = y ? vv / Math.abs(y) : null;
        kern = h('p', {}, `${start > 0 ? `Van ${xLabel(start)} t/m` : 'Tot en met'} ${xLabel(idx)}: ${dit} ${fmt(x)}, ${dit - 1} ${fmt(y)} (${vv > 0 ? '+' : '−'}${fmt(Math.abs(vv))}${pct != null ? `, ${vv > 0 ? '+' : '−'}${fmtGetal(Math.abs(pct) * 100, 0)}%` : ''}).`);
      }
    }
    return kaart(`${naam}: opgeteld vanaf 1 januari`,
      kern, grafiek, tabel,
      h('p', { class: 'hint' }, [
        'Elke lijn telt op vanaf 1 januari van dat jaar; een steile lijn = veel verbruik in die weken. Ligt de lijn van dit jaar onder die van vorig jaar, dan zit je tot nu toe lager. Beweeg of tik in de grafiek voor de stand op een dag. ',
        laat.length ? `Let op: ${laat.map((r) => `${r.jaar} begint pas op ${fmtDatumKort(r.eerste)}`).join(', ')} (eerste dag met gegevens), dus die lijn ligt lager dan het hele jaar zou zijn. ` : '',
        'Dagen zonder gegevens tellen als 0.',
      ].join('')));
  },
};

// ---------- Jaarprognose ----------

const prognoseSoort = {
  key: 'prognose',
  naam: 'Jaarprognose tot 31 december',
  geenPeriode: true,
  resultaat(a) {
    const p = jaarPrognose(a);
    const e = p.totaal.echt; const g = p.totaal.geschat;
    const som = (k) => e[k] + g[k];
    const vj = totaal(a, `${Number(p.jaar) - 1}-01-01`, `${Number(p.jaar) - 1}-12-31`);
    const vjStroom = vj.dagenAfname >= 360; const vjGas = vj.dagenGas >= 360;
    const kpi = (titel, waarde, uitleg, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, titel), h('strong', { class: `kpi-waarde ${cls}` }, waarde), h('span', { class: 'kpi-verschil muted' }, uitleg));
    const uitleg = (volledig, v, w, bekend, fmt) => (volledig && w
      ? `vorig jaar ${fmt(w)} (${v > w ? '+' : '−'}${fmtGetal(Math.abs((v - w) / w) * 100, 0)}%)`
      : `al bekend: ${fmt(bekend)}`);
    const kwh = (v) => `${fmtGetal(v, 0)} kWh`;
    const saldo = p.termijnen != null ? p.termijnen - som('kosten') : null;
    const kpis = h('div', { class: 'kpi-raster analyse-kpi prognose-kpi' },
      kpi('Stroom afgenomen', kwh(som('afname')), uitleg(vjStroom, som('afname'), vj.afname, e.afname, kwh)),
      kpi('Teruggeleverd', kwh(som('terug')), uitleg(vjStroom, som('terug'), vj.terug, e.terug, kwh)),
      kpi('Gas', m3(som('gas'), 0), uitleg(vjGas, som('gas'), vj.gas, e.gas, (v) => m3(v, 0))),
      kpi('Kosten (incl. vaste kosten)', euro(som('kosten')), uitleg(vjStroom && vjGas, som('kosten'), vj.kosten, e.kosten, euro)),
      p.termijnen != null ? kpi('Termijnen dit jaar', euro(p.termijnen), p.termijnenIngevuld < 12 ? `${p.termijnenIngevuld} van 12 maanden ingevuld, de rest met het laatste bedrag` : '12 maanden') : null,
      saldo != null ? kpi(saldo >= 0 ? 'Verwacht terug' : 'Verwacht bijbetalen', euro(Math.abs(saldo)), 'termijnen min verwachte kosten', saldo >= 0 ? 'is-goed' : 'is-slecht') : null);
    const grafiek = staafGrafiek({
      labels: p.maanden.map((m) => fmtMaand(m.maand)), korteLabels: p.maanden.map((m) => fmtMaandKort(m.maand)),
      waarden: p.maanden.map((m) => m.echt.kosten + m.geschat.kosten),
      markeer: p.maanden.map((m) => m.geschat.dagenGeschat > 0),
      fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), naam: 'Kosten per maand',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      h('td', { class: `num${x.geschat ? ' is-geschat' : ''}` }, fmtGetal(x.afname, 0)),
      h('td', { class: `num verberg-smal${x.geschat ? ' is-geschat' : ''}` }, fmtGetal(x.terug, 0)),
      h('td', { class: `num${x.geschat ? ' is-geschat' : ''}` }, fmtGetal(x.gas, 0)),
      h('td', { class: `num${x.geschat ? ' is-geschat' : ''}` }, euro(x.kosten)));
    const samen = (m) => ({ afname: m.echt.afname + m.geschat.afname, terug: m.echt.terug + m.geschat.terug, gas: m.echt.gas + m.geschat.gas, kosten: m.echt.kosten + m.geschat.kosten, geschat: m.geschat.dagenGeschat > 0 });
    const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num' }, 'Afname (kWh)'), h('th', { class: 'num verberg-smal' }, 'Terug (kWh)'), h('th', { class: 'num' }, 'Gas (m³)'), h('th', { class: 'num' }, 'Kosten'))),
      h('tbody', {}, rij(`Heel ${p.jaar}`, { afname: som('afname'), terug: som('terug'), gas: som('gas'), kosten: som('kosten'), geschat: g.dagenGeschat > 0 }, 'jaar-rij'),
        p.maanden.map((m) => rij(fmtMaand(m.maand), samen(m))))));
    const hoe = Object.entries(p.hoe).map(([k, n]) => `${k} (${n}×)`).join(', ');
    return kaart(`Jaarprognose ${p.jaar}`,
      h('p', { class: 'hint' }, `Bekend t/m ${fmtDatumKort(a.laatste)} (${e.dagenEcht} dagen); ${g.dagenGeschat} dagen geschat.`),
      kpis, grafiek, tabel,
      h('p', { class: 'hint' }, [
        'Voor dagen die nog moeten komen (en dagen zonder gegevens) schat de app het verbruik: stroom zoals dezelfde dag vorig jaar, gas met je stooklijn bij de temperatuur van dezelfde dag vorig jaar (dus bij een normaal jaar zoals vorig jaar). ',
        'Lukt dat niet, dan het daggemiddelde van die maand of van de laatste 4 weken. ',
        hoe ? `Gebruikt: ${hoe}. ` : '',
        'Kosten zijn berekend met je tarieven, inclusief vaste kosten. Cursief = (deels) geschat. De termijnen gaan over het kalenderjaar; je jaarafrekening kan over een andere periode lopen en is leidend.',
      ].join('')));
  },
};

// ---------- Top-10 ----------

const TOP_INDELING = [['dag', 'Dagen'], ['week', 'Weken'], ['maand', 'Maanden']];
const volledig = (vk, indeling) => {
  const n = daysBetween(vk.van, vk.tot) + 1;
  if (indeling === 'dag') return true;
  if (indeling === 'week') return n === 7;
  return n === new Date(Date.UTC(Number(vk.van.slice(0, 4)), Number(vk.van.slice(5, 7)), 0)).getUTCDate();
};

/** Balkje met een breedte in procenten (via CSSOM: de Content-Security-Policy staat geen style-attributen toe). */
function balk(pct) {
  const i = h('i', {});
  i.style.width = `${pct.toFixed(1)}%`;
  return i;
}

const topSoort = {
  key: 'top',
  naam: 'Top-10: hoogste en laagste',
  velden: (c, wijzig) => [
    veld('Wat', h('select', { onChange: (e) => wijzig({ topMaat: e.target.value }) },
      Object.entries(MATEN).filter(([, m]) => m.per.includes('dag') || m.per.includes('maand')).map(([k, m]) => h('option', { value: k, selected: k === c.topMaat }, m.naam)))),
    veld('Per', keuze(c.topIndeling, TOP_INDELING.filter(([k]) => past(c.topMaat, k)), (v) => wijzig({ topIndeling: v }))),
  ],
  resultaat(a, c, van, tot) {
    const m = MATEN[c.topMaat] || MATEN.afname;
    const indeling = past(c.topMaat, c.topIndeling) ? c.topIndeling : 'maand';
    const r = reeks(a, c.topMaat, indeling, van, tot);
    const kandidaten = r.vakjes.filter((vk) => vk.v != null && volledig(vk, indeling));
    const fmt = (v) => (m.eenheid === '€' ? euro(v) : `${fmtGetal(v, m.d)} ${m.eenheid}`);
    const naamMv = TOP_INDELING.find(([k]) => k === indeling)[1].toLowerCase();
    if (kandidaten.length < 2) return kaart(m.naam, h('p', { class: 'muted' }, `Te weinig volledige ${naamMv} met gegevens in deze periode.`));
    const gesorteerd = [...kandidaten].sort((x, y) => y.v - x.v);
    const aantal = Math.min(10, Math.floor(kandidaten.length / 2) || 1);
    const maxAbs = Math.max(...kandidaten.map((vk) => Math.abs(vk.v))) || 1;
    const label = (vk) => (indeling === 'dag' ? `${fmtDatumKort(vk.van)} ${vk.van.slice(0, 4)}` : indeling === 'week' ? `Week ${vk.kort} ${addDays(vk.van, 3).slice(0, 4)}` : vk.label);
    const lijst = (titel, items) => h('div', { class: 'top-lijst' }, h('h3', { class: 'top-titel' }, titel),
      h('ol', {}, items.map((vk) => h('li', {},
        h('span', { class: 'top-naam', title: vk.label }, label(vk)),
        h('span', { class: 'top-balk' }, balk(Math.max(2, (Math.abs(vk.v) / maxAbs) * 100))),
        h('span', { class: 'top-waarde num' }, fmt(vk.v))))));
    const mid = kandidaten.map((vk) => vk.v).sort((x, y) => x - y)[Math.floor(kandidaten.length / 2)];
    return kaart(`${m.naam}: top-${aantal}`,
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${kandidaten.length} volledige ${naamMv} · middelste waarde ${fmt(mid)}`),
      h('div', { class: 'top-raster' },
        lijst(`Hoogste ${aantal}`, gesorteerd.slice(0, aantal)),
        lijst(`Laagste ${aantal}`, gesorteerd.slice(-aantal).reverse())),
      h('p', { class: 'hint' }, `Alleen ${naamMv} die helemaal in de gekozen periode vallen en gegevens hebben tellen mee. Een opvallende dag kun je in Historie aantikken voor details of een opmerking.`));
  },
};

/** Alle soorten, in de volgorde van de keuzelijst. "Zelf samenstellen" wordt in scherm-analyse.js getekend. */
export const SOORTEN = [
  { key: 'samenstellen', naam: 'Zelf samenstellen', uitleg: null },
  heatmapSoort,
  salderingSoort,
  zonurenSoort,
  stooklijnSoort,
  weerSoort,
  cumulatiefSoort,
  prognoseSoort,
  topSoort,
];
