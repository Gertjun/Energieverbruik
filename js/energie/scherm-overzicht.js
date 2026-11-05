// Overzicht: kerncijfers, grafieken per dag/week/maand/jaar, gas per graaddag,
// zonnepanelen en de vergelijking met de termijnbedragen.

import { h } from '../core/dom.js';
import { totaal, zonMaand, ontbrekendeDagen } from './model.js';
import { staafGrafiek, zonGrafiek } from './grafiek.js';
import {
  addDays, mondayOf, sameDayLastYear, monthKey, maandStart, maandEinde, maandPlus,
  fmtDatumKort, fmtMaand, fmtMaandKort, isoWeekKey, daysBetween,
} from './tijd.js';
import { kpi, kaart, segmented, fmtKwh, fmtM3, euro, fmtGetal, fmtPct } from './ui.js';

const PERIODES = [['dag', 'Dag'], ['week', 'Week'], ['maand', 'Maand'], ['jaar', 'Jaar']];
const MATEN = [['afname', 'Stroom'], ['terug', 'Terug'], ['gas', 'Gas'], ['kosten', 'Kosten']];

const MAAT = {
  afname: { naam: 'Stroom afgenomen', kop: 'Stroom (kWh)', cel: (v) => fmtGetal(v, 1), fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  terug: { naam: 'Teruggeleverd', kop: 'Terug (kWh)', cel: (v) => fmtGetal(v, 1), fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  gas: { naam: 'Gas', kop: 'Gas (m³)', cel: (v) => fmtGetal(v, 2), fmt: (v, as) => (as ? fmtGetal(v, v < 10 ? 1 : 0) : fmtM3(v)), geldig: (t) => t.dagenGas > 0 },
  kosten: { naam: 'Kosten', kop: 'Kosten', cel: euro, fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), geldig: (t) => t.dagen > 0 && !t.zonderContract },
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

// Minimaal aantal graaddagen in een periode om gas per graaddag te tonen.
const GD_MINIMUM = { dag: 1, week: 3, maand: 5, jaar: 5 };
const PER_TEKST = { dag: 'per dag', week: 'per week', maand: 'per maand', jaar: 'per jaar' };

const TITEL = { dag: 'Laatste dag', week: 'Deze week', maand: 'Deze maand', jaar: 'Dit jaar' };

// Per kaart een keuze tussen grafiek en lijst. Dat is een weergavevoorkeur (geen gegevens),
// dus per apparaat in localStorage, net als de ingeklapte zijbalk.
const WEERGAVE_KEY = 'energieverbruik.overzichtWeergave';
const WEERGAVEN = [['grafiek', 'Grafiek'], ['lijst', 'Lijst']];
function leesWeergaven() {
  try { return JSON.parse(localStorage.getItem(WEERGAVE_KEY)) || {}; } catch { return {}; }
}
function bewaarWeergave(id, soort) {
  const alle = leesWeergaven(); alle[id] = soort;
  try { localStorage.setItem(WEERGAVE_KEY, JSON.stringify(alle)); } catch { /* geen opslag */ }
}

// Gekozen jaren bij Zonnepanelen (weergavevoorkeur). Standaard de laatste twee; hoogstens 4 tegelijk.
const ZON_JAREN_KEY = 'energieverbruik.zonJaren';
const ZON_MAX_JAREN = 4;
function gekozenZonJaren(beschikbaar) {
  let lijst = [];
  try { lijst = JSON.parse(localStorage.getItem(ZON_JAREN_KEY)) || []; } catch { /* geen opslag */ }
  lijst = lijst.filter((j) => beschikbaar.includes(j)).sort();
  return lijst.length ? lijst : beschikbaar.slice(-2);
}
function bewaarZonJaren(beschikbaar, gekozen, jaar) {
  let nieuw = gekozen.includes(jaar) ? gekozen.filter((j) => j !== jaar) : [...gekozen, jaar].sort();
  if (!nieuw.length) return; // minstens één jaar
  // Te veel? Dan valt het oudste gekozen jaar (behalve het net aangetikte) weg.
  while (nieuw.length > ZON_MAX_JAREN) nieuw = nieuw.filter((j) => j !== nieuw.find((x) => x !== jaar));
  try { localStorage.setItem(ZON_JAREN_KEY, JSON.stringify(nieuw)); } catch { /* geen opslag */ }
}

/** Kaart met rechtsboven een keuze Grafiek/Lijst. `maak(soort)` levert de inhoud. */
function wisselKaart(id, titel, maak, opnieuw) {
  const soort = leesWeergaven()[id] === 'lijst' ? 'lijst' : 'grafiek';
  return h('section', { class: 'card kaart' },
    h('div', { class: 'kaart-kop' },
      h('h2', { class: 'kaart-titel' }, titel),
      h('div', { class: 'kaart-wissel' }, segmented(WEERGAVEN, soort, (v) => { bewaarWeergave(id, v); opnieuw(); }, `Weergave ${titel}`))),
    ...[].concat(maak(soort)));
}

/** Tabel bij een grafiek: nieuwste periode bovenaan, met vorig jaar en verschil als die er is. */
function lijstTabel({ kop, labels, waarden, vergelijk, fmt, markeer = [], lopend = [] }) {
  const metVorig = Array.isArray(vergelijk);
  const verschil = (nu, toen) => {
    if (nu == null || toen == null || toen === 0) return '–';
    const pct = (nu - toen) / Math.abs(toen);
    return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${fmtGetal(Math.abs(pct) * 100, 0)}%`;
  };
  const rijen = [];
  for (let i = labels.length - 1; i >= 0; i--) {
    if (waarden[i] == null && (!metVorig || vergelijk[i] == null)) continue;
    rijen.push(h('tr', {},
      h('td', {}, labels[i], lopend[i] ? h('small', { class: 'muted lopend' }, 'loopt nog') : null),
      h('td', { class: 'num' }, waarden[i] == null ? '–' : `${markeer[i] ? '≈ ' : ''}${fmt(waarden[i])}`),
      metVorig ? h('td', { class: 'num muted' }, vergelijk[i] == null ? '–' : fmt(vergelijk[i])) : null,
      metVorig ? h('td', { class: 'num' }, lopend[i] ? '–' : verschil(waarden[i], vergelijk[i])) : null));
  }
  return h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-lijst' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Periode'), h('th', { class: 'num' }, kop),
      metVorig ? h('th', { class: 'num' }, 'Vorig jaar') : null,
      metVorig ? h('th', { class: 'num' }, 'Verschil') : null)),
    h('tbody', {}, rijen)));
}

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
  const labels = lijst.map((p) => p.label);
  // De laatste periode loopt meestal nog; dan is een verschil met de hele periode vorig jaar misleidend.
  const lopend = lijst.map((p) => p.tot > a.laatste);
  const grafiek = wisselKaart('hoofd', maat.naam, (soort) => [
    soort === 'lijst'
      ? lijstTabel({ kop: maat.kop, labels, waarden, vergelijk: heeftVergelijk ? vergelijk : null, fmt: maat.cel, markeer, lopend })
      : staafGrafiek({
        labels, korteLabels: lijst.map((p) => p.kort), waarden,
        vergelijk: heeftVergelijk ? vergelijk : null, fmt: maat.fmt, markeer,
      }),
    staat.maat === 'kosten' ? h('p', { class: 'hint' }, `Inclusief vaste kosten en verrekening van teruglevering. ${soort === 'lijst' ? 'Bedragen met ≈ zijn' : 'Lichtere staven zijn'} (deels) geschat.`) : null,
  ], opnieuw);

  const delen = [h('div', { class: 'keuzes' }, periodeKeus, maatKeus), kpis, grafiek];

  // Gas per graaddag (volgt de gekozen periode)
  const mnd = perioden('maand', a.laatste);
  const minGd = GD_MINIMUM[staat.periode];
  const gdWaarde = (van, tot) => { const t = totaal(a, van, tot); return t.graaddagen >= minGd && t.graaddagen > 0 ? t.gasStookdagen / t.graaddagen : null; };
  const gd = lijst.map((p) => gdWaarde(p.van, p.tot));
  const gdVorig = lijst.map((p) => (p.vorig ? gdWaarde(p.vorig[0], p.vorig[1]) : null));
  if (gd.some((v) => v != null)) {
    const heeftGdVorig = gdVorig.some((v) => v != null);
    delen.push(wisselKaart('graaddag', `Gas per graaddag · ${PER_TEKST[staat.periode]}`, (soort) => [
      soort === 'lijst'
        ? lijstTabel({ kop: 'm³/graaddag', labels: lijst.map((p) => p.label), waarden: gd, lopend, vergelijk: heeftGdVorig ? gdVorig : null, fmt: (v) => fmtGetal(v, 3) })
        : staafGrafiek({
          labels: lijst.map((p) => p.label), korteLabels: lijst.map((p) => p.kort), waarden: gd,
          vergelijk: heeftGdVorig ? gdVorig : null,
          fmt: (v, as) => (as ? fmtGetal(v, 2) : `${fmtGetal(v, 3)} m³ per graaddag`),
        }),
      h('p', { class: 'hint' }, `Hoe lager, hoe zuiniger je stookt, los van het weer. Graaddag: 18 °C min de gemiddelde buitentemperatuur, gewogen per seizoen. Niet getoond bij minder dan ${fmtGetal(minGd, 0)} graaddag${minGd === 1 ? '' : 'en'} in de periode: dan is er te weinig gestookt en geeft de deling grote uitschieters.`),
    ], opnieuw));
  }

  // Zonnepanelen: per kalendermaand, gekozen jaren naast elkaar.
  // Opbrengst is er vanaf de installatie; zelf gebruikt alleen voor maanden met stroomverbruik.
  const zonJaren = [...new Set([...a.maanden.values()].filter((m) => m.zon != null && !m.deleted).map((m) => m.maand.slice(0, 4)))].sort();
  if (zonJaren.length) {
    const gekozen = gekozenZonJaren(zonJaren);
    const kleurVan = (jaar) => gekozen.length - 1 - gekozen.indexOf(jaar); // nieuwste = 0 (accentkleur)
    const zonWaarde = (maand) => {
      const m = a.maanden.get(maand);
      if (!m || m.zon == null) return null;
      const z = zonMaand(a, maand);
      return { zon: m.zon, eigen: z ? z.eigen : null, aandeel: z ? z.aandeel : null };
    };
    const MND = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const jaarKeus = h('div', { class: 'jaar-keus', role: 'group', 'aria-label': 'Jaren tonen' },
      zonJaren.map((j) => {
        const aan = gekozen.includes(j);
        return h('button', {
          type: 'button', class: 'jaar-knop', 'aria-pressed': aan ? 'true' : 'false',
          onClick: () => { bewaarZonJaren(zonJaren, gekozen, j); opnieuw(); },
        }, h('i', { class: aan ? `g-zon-${kleurVan(j)}` : '' }), j);
      }));
    const zonTabel = () => {
      const rijen = [];
      for (const j of [...gekozen].reverse()) {
        for (const mm of [...MND].reverse()) {
          const w = zonWaarde(`${j}-${mm}`);
          if (!w) continue;
          rijen.push(h('tr', {},
            h('td', {}, fmtMaandKort(`${j}-${mm}`), ' ', j), h('td', { class: 'num' }, fmtKwh(w.zon, 0)),
            h('td', { class: 'num' }, w.eigen == null ? '–' : fmtKwh(w.eigen, 0)), h('td', { class: 'num' }, fmtPct(w.aandeel))));
        }
      }
      return h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Maand'), h('th', { class: 'num' }, 'Opbrengst'), h('th', { class: 'num' }, 'Zelf gebruikt'), h('th', { class: 'num' }, 'Zelf\u00advoorzienend'))),
        h('tbody', {}, rijen)));
    };
    const zonGraf = () => zonGrafiek({
      labels: MND.map((mm) => fmtMaand(`2000-${mm}`).replace(/\s*2000/, '')), korteLabels: MND.map((mm) => fmtMaandKort(`2000-${mm}`)),
      reeksen: gekozen.map((j) => ({ naam: j, kleur: kleurVan(j), waarden: MND.map((mm) => zonWaarde(`${j}-${mm}`)) })),
      fmtKwh: (v) => fmtKwh(v, 0), fmtPct, fmtAs: (v) => fmtGetal(v, 0),
    });
    delen.push(wisselKaart('zon', 'Zonnepanelen', (soort) => [
      jaarKeus,
      soort === 'lijst' ? zonTabel() : zonGraf(),
      h('p', { class: 'hint' }, soort === 'lijst'
        ? 'Zelf gebruikt = opbrengst min teruglevering. Zelfvoorzienend = zelf gebruikt gedeeld door je totale stroomverbruik.'
        : 'De hele kolom is de opbrengst, het fel gekleurde deel onderin wat je zelf gebruikt hebt (opbrengst min teruglevering). Het percentage erboven is je zelfvoorzienendheid (zelf gebruikt gedeeld door je totale stroomverbruik); dat staat er alleen als je stroomverbruik van die maand bekend is. Tik op een maand voor de getallen.'),
    ], opnieuw));
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
