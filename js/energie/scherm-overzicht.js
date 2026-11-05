// Overzicht: kerncijfers, grafieken per dag/week/maand/jaar, gas per graaddag,
// zonnepanelen en de vergelijking met de termijnbedragen.

import { h } from '../core/dom.js';
import { totaal, zonMaand, ontbrekendeDagen } from './model.js';
import { staafGrafiek } from './grafiek.js';
import {
  addDays, mondayOf, sameDayLastYear, monthKey, maandStart, maandEinde, maandPlus,
  fmtDatumKort, fmtMaand, fmtMaandKort, isoWeekKey, daysBetween,
} from './tijd.js';
import { kpi, kaart, segmented, fmtKwh, fmtM3, euro, fmtGetal, fmtPct } from './ui.js';

const PERIODES = [['dag', 'Dag'], ['week', 'Week'], ['maand', 'Maand'], ['jaar', 'Jaar']];
const MATEN = [['afname', 'Stroom'], ['terug', 'Terug'], ['gas', 'Gas'], ['kosten', 'Kosten']];

const MAAT = {
  afname: { naam: 'Stroom afgenomen', fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  terug: { naam: 'Teruggeleverd', fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  gas: { naam: 'Gas', fmt: (v, as) => (as ? fmtGetal(v, v < 10 ? 1 : 0) : fmtM3(v)), geldig: (t) => t.dagenGas > 0 },
  kosten: { naam: 'Kosten', fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), geldig: (t) => t.dagen > 0 && !t.zonderContract },
};

/** Lijst van perioden (van/tot/label) die eindigt bij `eind`. */
function perioden(soort, eind) {
  const out = [];
  if (soort === 'dag') {
    for (let i = 30; i >= 0; i--) {
      const d = addDays(eind, -i);
      out.push({ van: d, tot: d, label: fmtDatumKort(d), kort: d.slice(8), vorig: [sameDayLastYear(d), sameDayLastYear(d)] });
    }
  } else if (soort === 'week') {
    const ma = mondayOf(eind);
    for (let i = 12; i >= 0; i--) {
      const van = addDays(ma, -7 * i); const tot = addDays(van, 6);
      const wk = isoWeekKey(van);
      out.push({ van, tot, label: `Week ${Number(wk.slice(6))} (${fmtDatumKort(van)})`, kort: wk.slice(6), vorig: [addDays(van, -364), addDays(tot, -364)] });
    }
  } else if (soort === 'maand') {
    const m = monthKey(eind);
    for (let i = 11; i >= 0; i--) {
      const mk = maandPlus(m, -i);
      const vm = maandPlus(mk, -12);
      out.push({ van: maandStart(mk), tot: maandEinde(mk), label: fmtMaand(mk), kort: fmtMaandKort(mk), vorig: [maandStart(vm), maandEinde(vm)] });
    }
  } else {
    const y = Number(eind.slice(0, 4));
    for (let i = 4; i >= 0; i--) {
      const j = y - i;
      out.push({ van: `${j}-01-01`, tot: `${j}-12-31`, label: String(j), kort: String(j), vorig: null });
    }
  }
  return out;
}

/** Huidige periode t/m de laatste dag met gegevens, en dezelfde dagen een jaar eerder. */
function huidigePeriode(soort, laatste) {
  let van;
  if (soort === 'dag') van = laatste;
  else if (soort === 'week') van = mondayOf(laatste);
  else if (soort === 'maand') van = maandStart(monthKey(laatste));
  else van = `${laatste.slice(0, 4)}-01-01`;
  return { van, tot: laatste, vorigVan: sameDayLastYear(van), vorigTot: sameDayLastYear(laatste) };
}

const TITEL = { dag: 'Laatste dag', week: 'Deze week', maand: 'Deze maand', jaar: 'Dit jaar' };

export function renderOverzicht(a, staat, opnieuw) {
  if (!a.eerste) {
    return [kaart('Nog geen gegevens',
      h('p', { class: 'muted' }, 'Lees eerst je Vattenfall- of HomeWizard-export of je Excel-bestand in. Daarna verschijnen hier je verbruik, kosten en grafieken.'),
      h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'button', onClick: () => { staat.tab = 'invoer'; opnieuw(); } }, 'Naar invoer')))];
  }

  const periodeKeus = segmented(PERIODES, staat.periode, (v) => { staat.periode = v; opnieuw(); }, 'Periode');
  const maatKeus = segmented(MATEN, staat.maat, (v) => { staat.maat = v; opnieuw(); }, 'Wat tonen');

  // Kerncijfers
  const hp = huidigePeriode(staat.periode, a.laatste);
  const nu = totaal(a, hp.van, hp.tot);
  const toen = totaal(a, hp.vorigVan, hp.vorigTot);
  const of = (t, k, maat) => (MAAT[maat].geldig(t) ? t[k] : null);
  const periodeTekst = hp.van === hp.tot ? fmtDatumKort(hp.van) : `${fmtDatumKort(hp.van)} t/m ${fmtDatumKort(hp.tot)}`;
  const kpis = kaart(`${TITEL[staat.periode]} · ${periodeTekst}`,
    h('div', { class: 'kpi-raster' },
      kpi('Stroom afgenomen', of(nu, 'afname', 'afname'), fmtKwh, of(toen, 'afname', 'afname')),
      kpi('Teruggeleverd', of(nu, 'terug', 'terug'), fmtKwh, of(toen, 'terug', 'terug'), 'hoger'),
      kpi('Gas', of(nu, 'gas', 'gas'), fmtM3, of(toen, 'gas', 'gas')),
      kpi('Kosten', of(nu, 'kosten', 'kosten'), euro, of(toen, 'kosten', 'kosten'))),
    nu.geschat ? h('p', { class: 'hint' }, 'Kosten deels geschat: voor sommige dagen is geen uurverdeling bekend.') : null);

  // Grafiek
  const lijst = perioden(staat.periode, a.laatste);
  const maat = MAAT[staat.maat];
  const waarden = []; const vergelijk = []; const markeer = [];
  for (const p of lijst) {
    const t = totaal(a, p.van, p.tot);
    waarden.push(maat.geldig(t) ? t[staat.maat] : null);
    markeer.push(staat.maat === 'kosten' && t.geschat);
    if (p.vorig) {
      const v = totaal(a, p.vorig[0], p.vorig[1]);
      vergelijk.push(maat.geldig(v) ? v[staat.maat] : null);
    }
  }
  const heeftVergelijk = staat.periode !== 'jaar' && vergelijk.some((v) => v != null);
  const grafiek = kaart(maat.naam,
    staafGrafiek({
      labels: lijst.map((p) => p.label), korteLabels: lijst.map((p) => p.kort), waarden,
      vergelijk: heeftVergelijk ? vergelijk : null, fmt: maat.fmt, markeer,
    }),
    staat.maat === 'kosten' ? h('p', { class: 'hint' }, 'Inclusief vaste kosten en verrekening van teruglevering. Lichtere staven zijn (deels) geschat.') : null);

  const delen = [h('div', { class: 'keuzes' }, periodeKeus, maatKeus), kpis, grafiek];

  // Gas per graaddag (per maand)
  const mnd = perioden('maand', a.laatste);
  const gdWaarde = (van, tot) => { const t = totaal(a, van, tot); return t.graaddagen >= 5 ? t.gasStookdagen / t.graaddagen : null; };
  const gd = mnd.map((p) => gdWaarde(p.van, p.tot));
  const gdVorig = mnd.map((p) => gdWaarde(p.vorig[0], p.vorig[1]));
  if (gd.some((v) => v != null)) {
    delen.push(kaart('Gas per graaddag',
      staafGrafiek({
        labels: mnd.map((p) => p.label), korteLabels: mnd.map((p) => p.kort), waarden: gd,
        vergelijk: gdVorig.some((v) => v != null) ? gdVorig : null,
        fmt: (v, as) => (as ? fmtGetal(v, 2) : `${fmtGetal(v, 3)} m³ per graaddag`),
      }),
      h('p', { class: 'hint' }, 'Hoe lager, hoe zuiniger je stookt, los van het weer. Graaddag: 18 °C min de gemiddelde buitentemperatuur, gewogen per seizoen.')));
  }

  // Zonnepanelen
  const zonRijen = mnd.map((p) => ({ p, z: zonMaand(a, p.van.slice(0, 7)) })).filter((x) => x.z);
  if (zonRijen.length) {
    delen.push(kaart('Zonnepanelen',
      h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num' }, 'Opbrengst'), h('th', { class: 'num' }, 'Zelf gebruikt'), h('th', { class: 'num' }, 'Zelf­voorzienend'))),
        h('tbody', {}, zonRijen.reverse().map(({ p, z }) => h('tr', {},
          h('td', {}, fmtMaandKort(p.van.slice(0, 7)), ' ', p.van.slice(0, 4)), h('td', { class: 'num' }, fmtKwh(z.zon, 0)), h('td', { class: 'num' }, fmtKwh(z.eigen, 0)), h('td', { class: 'num' }, fmtPct(z.aandeel))))))),
      h('p', { class: 'hint' }, 'Zelf gebruikt = opbrengst min teruglevering. Zelfvoorzienend = zelf gebruikt gedeeld door je totale stroomverbruik.')));
  }

  // Termijnbedragen
  const termijnMaanden = mnd.filter((p) => a.maanden.get(p.van.slice(0, 7))?.termijn != null);
  if (termijnMaanden.length) {
    let betaald = 0; let kosten = 0; let geschat = false; let volledig = 0;
    for (const p of termijnMaanden) {
      const t = totaal(a, p.van, p.tot);
      if (!t.dagen) continue;
      betaald += a.maanden.get(p.van.slice(0, 7)).termijn / 100;
      kosten += t.kosten;
      if (t.geschat) geschat = true;
      if (t.dagen < daysBetween(p.van, p.tot) + 1) geschat = true;
      volledig++;
    }
    if (volledig) {
      const saldo = betaald - kosten;
      delen.push(kaart('Termijnen en werkelijke kosten',
        h('div', { class: 'kpi-raster' },
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, `Betaald (${volledig} mnd)`), h('strong', { class: 'kpi-waarde' }, euro(betaald))),
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Berekende kosten'), h('strong', { class: 'kpi-waarde' }, euro(kosten))),
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, saldo >= 0 ? 'Verwacht terug' : 'Verwacht bijbetalen'),
            h('strong', { class: `kpi-waarde ${saldo >= 0 ? 'is-goed' : 'is-slecht'}` }, euro(Math.abs(saldo))))),
        h('p', { class: 'hint' }, `Over de laatste 12 maanden met een ingevuld termijnbedrag. Dit is een schatting${geschat ? ' (niet alle dagen zijn compleet)' : ''}; de jaarafrekening van je leverancier is leidend.`)));
    }
  }

  const missen = ontbrekendeDagen(a);
  const meldingen = [];
  if (missen.length) meldingen.push(`${missen.length} ${missen.length === 1 ? 'dag ontbreekt' : 'dagen ontbreken'} tussen ${fmtDatumKort(a.eerste)} en ${fmtDatumKort(a.laatste)} (zie Historie).`);
  if (staat.weerFout) meldingen.push(`Temperaturen ophalen lukte niet: ${staat.weerFout}`);
  if (meldingen.length) delen.push(h('div', { class: 'meldingen' }, meldingen.map((m) => h('p', { class: 'hint' }, m))));
  return delen;
}
