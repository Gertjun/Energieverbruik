// Overzicht: kerncijfers, grafieken per dag/week/maand/jaar, gas per graaddag,
// zonnepanelen en de vergelijking met de termijnbedragen.

import { h } from '../core/dom.js';
import { totaal, zonPeriode, maandenMetZon, ontbrekendeDagen } from './model.js';
import { staafGrafiek, zonGrafiek } from './grafiek.js';
import {
  addDays, mondayOf, sameDayLastYear, monthKey, maandStart, maandEinde, maandPlus,
  fmtDatumKort, fmtMaand, fmtMaandKort, isoWeekKey, daysBetween, fmtDag,
} from './tijd.js';
import { kpi, kaart, segmented, fmtKwh, fmtM3, euro, fmtGetal, fmtPct } from './ui.js';
import { verschilKleur } from './analyse.js';

const PERIODES = [['dag', 'Dag'], ['week', 'Week'], ['maand', 'Maand'], ['jaar', 'Jaar']];
const MATEN = [['afname', 'Stroom'], ['terug', 'Terug'], ['gas', 'Gas'], ['kosten', 'Kosten']];

const MAAT = {
  afname: { beter: 'lager', naam: 'Stroom afgenomen', kop: 'Stroom (kWh)', cel: (v) => fmtGetal(v, 1), fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  terug: { beter: 'hoger', naam: 'Teruggeleverd', kop: 'Terug (kWh)', cel: (v) => fmtGetal(v, 1), fmt: (v, as) => (as ? fmtGetal(v, 0) : fmtKwh(v)), geldig: (t) => t.dagenAfname > 0 },
  gas: { beter: 'lager', naam: 'Gas', kop: 'Gas (m³)', cel: (v) => fmtGetal(v, 2), fmt: (v, as) => (as ? fmtGetal(v, v < 10 ? 1 : 0) : fmtM3(v)), geldig: (t) => t.dagenGas > 0 },
  kosten: { beter: 'lager', naam: 'Kosten', kop: 'Kosten', cel: euro, fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), geldig: (t) => t.dagen > 0 && !t.zonderContract },
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

/** Gekozen periode (met de pijltjes), t/m de laatste dag met gegevens, en dezelfde dagen een jaar eerder. */
function huidigePeriode(soort, eind, laatste) {
  const { van, tot } = periodeVan(soort, eind);
  const t = tot < laatste ? tot : laatste;
  return { van, tot: t, vorigVan: sameDayLastYear(van), vorigTot: sameDayLastYear(t) };
}

/** Eerste en laatste dag van de dag/week/maand/jaar waar `iso` in valt. */
function periodeVan(soort, iso) {
  if (soort === 'dag') return { van: iso, tot: iso };
  if (soort === 'week') { const van = mondayOf(iso); return { van, tot: addDays(van, 6) }; }
  if (soort === 'maand') return { van: maandStart(monthKey(iso)), tot: maandEinde(monthKey(iso)) };
  return { van: `${iso.slice(0, 4)}-01-01`, tot: `${iso.slice(0, 4)}-12-31` };
}

/** Eén dag/week/maand/jaar verder (stap +1) of terug (stap -1); geeft de laatste dag van die periode. */
function verschuif(soort, iso, stap) {
  if (soort === 'dag') return addDays(iso, stap);
  if (soort === 'week') return addDays(periodeVan('week', iso).tot, 7 * stap);
  if (soort === 'maand') return maandEinde(maandPlus(monthKey(iso), stap));
  return `${Number(iso.slice(0, 4)) + stap}-12-31`;
}

/** Eindpunt van het Overzicht: de met de pijltjes gekozen dag, of anders de laatste dag met gegevens. */
function eindDatum(a, staat) {
  const e = staat.eind;
  // Valt de gekozen dag in de lopende periode, dan gewoon de laatste dag (zoals zonder pijltjes).
  if (!e || periodeVan(staat.periode, e).tot >= a.laatste) return a.laatste;
  return e < a.eerste ? a.eerste : e;
}

const hoofdletter = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/** Titel van de gekozen periode als die niet de lopende is (bijv. "Week 44 · 27 okt t/m 2 nov 2025"). */
function periodeTitel(soort, van, tot) {
  const jaar = tot.slice(0, 4);
  if (soort === 'dag') return `${hoofdletter(fmtDag(van))} ${jaar}`;
  if (soort === 'week') return `Week ${Number(isoWeekKey(van).slice(6))} · ${fmtDatumKort(van)} t/m ${fmtDatumKort(tot)} ${jaar}`;
  if (soort === 'maand') return hoofdletter(fmtMaand(monthKey(van)));
  return jaar;
}

/** Kop met pijltjes om terug en vooruit in de tijd te gaan (zoals de maandkeuze in Historie),
 *  en "Naar nu" om terug te springen naar de laatste gegevens. */
function tijdNavigatie(a, staat, eind, titel, opnieuw) {
  const soort = staat.periode;
  const kanTerug = periodeVan(soort, eind).van > a.eerste;
  const kanVooruit = eind < a.laatste;
  const ga = (stap) => {
    const nieuw = verschuif(soort, eind, stap);
    staat.eind = nieuw >= a.laatste ? null : nieuw;
    opnieuw();
  };
  const vorige = soort === 'jaar' ? 'Vorig jaar' : `Vorige ${soort}`;
  const volgende = soort === 'jaar' ? 'Volgend jaar' : `Volgende ${soort}`;
  return h('div', { class: 'maand-nav tijd-nav' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': vorige, title: vorige, disabled: !kanTerug, onClick: () => ga(-1) }, '‹'),
    h('div', { class: 'tijd-midden' },
      h('h2', { class: 'kaart-titel' }, titel),
      kanVooruit ? h('button', { class: 'link-knop', type: 'button', onClick: () => { staat.eind = null; opnieuw(); } }, 'Naar nu') : null),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': volgende, title: volgende, disabled: !kanVooruit, onClick: () => ga(1) }, '›'));
}

// Minimaal aantal graaddagen in een periode om gas per graaddag te tonen.
const GD_MINIMUM = { dag: 1, week: 3, maand: 5, jaar: 5 };
const PER_TEKST = { dag: 'per dag', week: 'per week', maand: 'per maand', jaar: 'per jaar' };
const PER_KOP = { dag: 'Dag', week: 'Week' };

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

// Indeling van het Overzicht op een breed scherm (laptop). Weergavevoorkeur per apparaat.
//   standaard – één kolom (zoals op iPhone/iPad)
//   naast     – kaarten in twee kolommen naast elkaar
//   samen     – grafiek en lijst tegelijk in elke kaart
//   alles     – Stroom, Terug, Gas en Kosten tegelijk, in twee kolommen
export const INDELINGEN = [
  ['standaard', 'Eén kolom', 'Zoals op de iPhone: alles onder elkaar, met een keuze tussen grafiek en lijst.'],
  ['naast', 'Naast elkaar', 'Kaarten in twee kolommen, zodat je meer ziet zonder te scrollen.'],
  ['samen', 'Grafiek en lijst', 'In elke kaart de grafiek met de lijst met getallen ernaast.'],
  ['alles', 'Alles tegelijk', 'Stroom, teruglevering, gas en kosten als vier grafieken naast elkaar; de keuze Stroom/Terug/Gas/Kosten vervalt.'],
];
const INDELING_KEY = 'energieverbruik.overzichtIndeling';
/** Vanaf deze vensterbreedte geldt de gekozen indeling; daaronder altijd één kolom. */
export const BREED_SCHERM = '(min-width: 1200px)';
const MAX_BREED = 1640; // maximale breedte van de inhoud bij een brede indeling (px)
export function leesIndeling() {
  try { const v = localStorage.getItem(INDELING_KEY); return INDELINGEN.some(([k]) => k === v) ? v : 'standaard'; } catch { return 'standaard'; }
}
export function bewaarIndeling(v) {
  try { localStorage.setItem(INDELING_KEY, v); } catch { /* geen opslag */ }
}
/** De indeling die nu echt geldt: de gekozen, maar alleen op een breed scherm. */
export function actieveIndeling() {
  const v = leesIndeling();
  return v !== 'standaard' && window.matchMedia?.(BREED_SCHERM).matches ? v : 'standaard';
}

/**
 * Beschikbare breedte voor een grafiek (px), uitgaande van de layout in app.css.
 * Bij één kolom null: dan rekent de grafiek zelf met de vensterbreedte, zoals voorheen.
 */
function breedtes(indeling, zijbalkIn) {
  if (indeling === 'standaard') return { heel: null, half: null, naastLijst: null };
  const inhoud = Math.min(MAX_BREED, (window.innerWidth || 1200) - (zijbalkIn ? 68 : 256)) - 32; // min. marge .app-main
  const kaartIn = inhoud - 34; // min. padding en rand van de kaart
  const halfIn = (inhoud - 16) / 2 - 34; // twee kolommen met 16 px tussenruimte
  return { heel: kaartIn, half: halfIn, naastLijst: kaartIn - 24 - LIJST_BREEDTE };
}
const LIJST_BREEDTE = 380; // breedte van de lijst naast de grafiek (zie .samen in app.css)

/**
 * Kaart met vier vaste vakken: kop, extra knoppen, inhoud en toelichting. Een leeg vak blijft staan
 * (als lege div), zodat in twee kolommen de vakken van kaarten naast elkaar op dezelfde hoogte liggen
 * (subgrid in app.css).
 */
function vakKaart(kop, extra, inhoud, hint) {
  const vak = (el) => el || h('div', { class: 'kaart-leeg' });
  return h('section', { class: 'card kaart kaart-vakken' }, kop, vak(extra), vak(inhoud), vak(hint));
}

/**
 * Kaart met rechtsboven een keuze Grafiek/Lijst. `maak(soort)` levert [extra, inhoud, toelichting];
 * soort is 'grafiek', 'lijst' of 'samen' (beide naast elkaar, zonder keuzeknop).
 */
function wisselKaart(id, titel, maak, opnieuw, samen = false) {
  const soort = samen ? 'samen' : leesWeergaven()[id] === 'lijst' ? 'lijst' : 'grafiek';
  const [extra, inhoud, hint] = maak(soort);
  return vakKaart(
    h('div', { class: 'kaart-kop' },
      h('h2', { class: 'kaart-titel' }, titel),
      samen ? null : h('div', { class: 'kaart-wissel' }, segmented(WEERGAVEN, soort, (v) => { bewaarWeergave(id, v); opnieuw(); }, `Weergave ${titel}`))),
    extra, inhoud, hint);
}

/** Grafiek, lijst of beide naast elkaar. */
function grafiekOfLijst(soort, grafiek, lijst) {
  if (soort === 'lijst') return lijst();
  if (soort === 'grafiek') return grafiek();
  return h('div', { class: 'samen' }, grafiek(), h('div', { class: 'samen-lijst' }, lijst()));
}

/** Tabel bij een grafiek: nieuwste periode bovenaan, met vorig jaar en verschil als die er is. */
function lijstTabel({ kop, labels, waarden, vergelijk, fmt, markeer = [], lopend = [], beter }) {
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
      metVorig ? h('td', { class: `num${lopend[i] || waarden[i] == null || vergelijk[i] == null || vergelijk[i] === 0 ? '' : verschilKleur(beter, waarden[i] - vergelijk[i])}` }, lopend[i] ? '–' : verschil(waarden[i], vergelijk[i])) : null));
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

  const indeling = actieveIndeling();
  staat.indeling = indeling; // app.js zet hiermee de bredere opmaak aan
  const B = breedtes(indeling, staat.zijbalkIn);
  const samen = indeling === 'samen';
  const tweeKolommen = indeling === 'naast' || indeling === 'alles';
  // Breedte voor een grafiek in een gewone kaart (één of twee kolommen, of naast de lijst).
  const bKaart = samen ? B.naastLijst : tweeKolommen ? B.half : null;
  // In twee kolommen alle grafieken even hoog, zodat kaarten naast elkaar gelijk uitkomen.
  const hKaart = tweeKolommen ? (bKaart < 500 ? 220 : 260) : null;

  const periodeKeus = segmented(PERIODES, staat.periode, (v) => { staat.periode = v; opnieuw(); }, 'Periode');
  const maatKeus = indeling === 'alles' ? null : segmented(MATEN, staat.maat, (v) => { staat.maat = v; opnieuw(); }, 'Wat tonen');

  // Kerncijfers
  const eind = eindDatum(a, staat);
  const terugInTijd = eind < a.laatste;
  const hp = huidigePeriode(staat.periode, eind, a.laatste);
  const nu = totaal(a, hp.van, hp.tot);
  const toen = totaal(a, hp.vorigVan, hp.vorigTot);
  const of = (t, k, maat) => (MAAT[maat].geldig(t) ? t[k] : null);
  const periodeTekst = hp.van === hp.tot ? fmtDatumKort(hp.van) : `${fmtDatumKort(hp.van)} t/m ${fmtDatumKort(hp.tot)}`;
  const lopendePeriode = hp.tot === a.laatste && !terugInTijd;
  const kpiTitel = lopendePeriode ? `${TITEL[staat.periode]} · ${periodeTekst}` : periodeTitel(staat.periode, hp.van, periodeVan(staat.periode, hp.van).tot);
  const kpis = kaart(null,
    tijdNavigatie(a, staat, eind, kpiTitel, opnieuw),
    h('div', { class: 'kpi-raster' },
      kpi('Stroom afgenomen', of(nu, 'afname', 'afname'), fmtKwh, of(toen, 'afname', 'afname')),
      kpi('Teruggeleverd', of(nu, 'terug', 'terug'), fmtKwh, of(toen, 'terug', 'terug'), 'hoger'),
      kpi('Gas', of(nu, 'gas', 'gas'), fmtM3, of(toen, 'gas', 'gas')),
      kpi('Kosten', of(nu, 'kosten', 'kosten'), euro, of(toen, 'kosten', 'kosten'))),
    nu.geschat ? h('p', { class: 'hint' }, 'Kosten deels geschat: voor sommige dagen is geen uurverdeling bekend.') : null);

  // Grafiek(en) per soort: één (gekozen met Stroom/Terug/Gas/Kosten) of alle vier bij de indeling 'alles'.
  const lijst = perioden(staat.periode, eind);
  const labels = lijst.map((p) => p.label);
  // De laatste periode loopt meestal nog; dan is een verschil met de hele periode vorig jaar misleidend.
  const lopend = lijst.map((p) => p.tot > a.laatste);
  const totalen = lijst.map((p) => ({ nu: totaal(a, p.van, p.tot), vorig: p.vorig ? totaal(a, p.vorig[0], p.vorig[1]) : null }));
  const maatKaart = (maatKey, id) => {
    const maat = MAAT[maatKey];
    const waarden = totalen.map(({ nu: t }) => (maat.geldig(t) ? t[maatKey] : null));
    const markeer = totalen.map(({ nu: t }) => maatKey === 'kosten' && t.geschat);
    const vergelijk = totalen.map(({ vorig: v }) => (v && maat.geldig(v) ? v[maatKey] : null));
    const heeftVergelijk = staat.periode !== 'jaar' && vergelijk.some((v) => v != null);
    return wisselKaart(id, maat.naam, (soort) => [
      null,
      grafiekOfLijst(soort,
        () => staafGrafiek({
          labels, korteLabels: lijst.map((p) => p.kort), waarden,
          vergelijk: heeftVergelijk ? vergelijk : null, fmt: maat.fmt, markeer, breedte: bKaart, hoogte: hKaart,
        }),
        () => lijstTabel({ kop: maat.kop, labels, waarden, vergelijk: heeftVergelijk ? vergelijk : null, fmt: maat.cel, markeer, lopend, beter: maat.beter })),
      maatKey === 'kosten' ? h('p', { class: 'hint' }, `Inclusief vaste kosten en verrekening van teruglevering. ${soort === 'lijst' ? 'Bedragen met ≈ zijn' : soort === 'samen' ? 'Lichtere staven en bedragen met ≈ zijn' : 'Lichtere staven zijn'} (deels) geschat.`) : null,
    ], opnieuw, samen);
  };
  const grafieken = indeling === 'alles'
    ? MATEN.map(([k]) => maatKaart(k, `alles-${k}`))
    : [maatKaart(staat.maat, 'hoofd')];

  const kaarten = [...grafieken]; // komen in het raster (één of twee kolommen)
  // Een losse laatste kaart in twee kolommen loopt over de hele breedte (zie app.css); dan ook de grafiek.
  const zonMaanden = maandenMetZon(a);
  const heeftZon = zonMaanden.length > 0;
  const maat2 = (alleen) => (tweeKolommen && alleen ? { breedte: B.heel, hoogte: null } : { breedte: bKaart, hoogte: hKaart });
  // Keuze van de indeling: alleen op een breed scherm (daaronder is er maar één kolom).
  const breed = window.matchMedia?.(BREED_SCHERM).matches;
  const indelingKeus = breed
    ? h('div', { class: 'indeling-keus' },
      h('span', { class: 'muted' }, 'Indeling'),
      segmented(INDELINGEN.map(([k, naam]) => [k, naam]), indeling, (v) => { bewaarIndeling(v); opnieuw(); }, 'Indeling Overzicht'))
    : null;
  staat.titelExtra = indelingKeus; // app.js zet dit rechts naast de titel
  const delen = [h('div', { class: `keuzes${maatKeus ? '' : ' keuzes-een'}` }, periodeKeus, maatKeus), kpis];

  // Gas per graaddag (volgt de gekozen periode)
  const mnd = perioden('maand', a.laatste);
  const minGd = GD_MINIMUM[staat.periode];
  const gdWaarde = (van, tot) => { const t = totaal(a, van, tot); return t.graaddagen >= minGd && t.graaddagen > 0 ? t.gasStookdagen / t.graaddagen : null; };
  const gd = lijst.map((p) => gdWaarde(p.van, p.tot));
  const gdVorig = lijst.map((p) => (p.vorig ? gdWaarde(p.vorig[0], p.vorig[1]) : null));
  if (gd.some((v) => v != null)) {
    const heeftGdVorig = gdVorig.some((v) => v != null);
    const mGd = maat2(!heeftZon && kaarten.length % 2 === 0);
    kaarten.push(wisselKaart('graaddag', `Gas per graaddag · ${PER_TEKST[staat.periode]}`, (soort) => [
      null,
      grafiekOfLijst(soort,
        () => staafGrafiek({
          labels: lijst.map((p) => p.label), korteLabels: lijst.map((p) => p.kort), waarden: gd,
          vergelijk: heeftGdVorig ? gdVorig : null, ...mGd,
          fmt: (v, as) => (as ? fmtGetal(v, 2) : `${fmtGetal(v, 3)} m³ per graaddag`),
        }),
        () => lijstTabel({ kop: 'm³/graaddag', labels: lijst.map((p) => p.label), waarden: gd, lopend, vergelijk: heeftGdVorig ? gdVorig : null, fmt: (v) => fmtGetal(v, 3), beter: 'lager' })),
      h('p', { class: 'hint' }, `Hoe lager, hoe zuiniger je stookt, los van het weer. Graaddag: 18 °C min de gemiddelde buitentemperatuur, gewogen per seizoen. Niet getoond bij minder dan ${fmtGetal(minGd, 0)} graaddag${minGd === 1 ? '' : 'en'} in de periode: dan is er te weinig gestookt en geeft de deling grote uitschieters.`),
    ], opnieuw, samen));
  }

  // Zonnepanelen. Bij de keuze per dag of per week, en als de opbrengst per dag bekend is (SolarEdge-dagexport):
  // per dag/week, net als de andere kaarten. Anders per kalendermaand, gekozen jaren naast elkaar.
  // Opbrengst is er vanaf de installatie; zelf gebruikt alleen als het stroomverbruik bekend is.
  const zonJaren = [...new Set(zonMaanden.map((m) => m.slice(0, 4)))].sort();
  const zonPer = (van, tot) => {
    const z = zonPeriode(a, van, tot);
    return z ? { zon: z.zon, eigen: z.eigen, aandeel: z.aandeel, onvolledig: z.onvolledig } : null;
  };
  const zonLijst = ['dag', 'week'].includes(staat.periode) ? lijst.map((p) => (a.zonDag.size ? zonPer(p.van, p.tot) : null)) : [];
  const zonUitleg = (soort, perMaand) => h('p', { class: 'hint' }, soort === 'lijst'
    ? `Zelf gebruikt = opbrengst min teruglevering${perMaand ? '' : ', per dag'}. Zelfvoorzienend = zelf gebruikt gedeeld door je totale stroomverbruik.`
    : `De hele kolom is de opbrengst, het fel gekleurde deel onderin wat je zelf gebruikt hebt (opbrengst min teruglevering). Het percentage erboven is je zelfvoorzienendheid (zelf gebruikt gedeeld door je totale stroomverbruik); dat staat er alleen als je stroomverbruik bekend is. Tik op een ${perMaand ? 'maand' : PER_TEKST[staat.periode].slice(4)} voor de getallen.`);
  const zonKolommen = (rijen) => h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
    h('thead', {}, h('tr', {}, h('th', {}, PER_KOP[staat.periode] && zonLijst.some(Boolean) ? PER_KOP[staat.periode] : 'Maand'), h('th', { class: 'num' }, 'Opbrengst'), h('th', { class: 'num' }, 'Zelf gebruikt'), h('th', { class: 'num' }, 'Zelf\u00advoorzienend'))),
    h('tbody', {}, rijen)));
  const zonRij = (label, w, extra) => h('tr', {},
    h('td', {}, label, extra ? h('small', { class: 'muted lopend' }, extra) : null), h('td', { class: 'num' }, fmtKwh(w.zon, w.zon < 100 ? 1 : 0)),
    h('td', { class: 'num' }, w.eigen == null ? '–' : fmtKwh(w.eigen, w.zon < 100 ? 1 : 0)), h('td', { class: 'num' }, fmtPct(w.aandeel)));
  if (zonLijst.some(Boolean)) {
    const mZon = maat2(kaarten.length % 2 === 0);
    kaarten.push(wisselKaart('zon', `Zonnepanelen · ${PER_TEKST[staat.periode]}`, (soort) => [
      null,
      grafiekOfLijst(soort,
        () => zonGrafiek({
          labels: lijst.map((p) => p.label), korteLabels: lijst.map((p) => p.kort),
          reeksen: [{ naam: 'Opbrengst', kleur: 0, waarden: zonLijst }],
          fmtKwh: (v) => fmtKwh(v, 1), fmtPct, fmtAs: (v) => fmtGetal(v, 0), ...mZon,
        }),
        () => zonKolommen(lijst.map((p, i) => [p, zonLijst[i], i]).reverse().filter(([, w]) => w)
          .map(([p, w, i]) => zonRij(p.label, w, lopend[i] ? 'loopt nog' : w.onvolledig ? 'niet elke dag' : null)))),
      zonUitleg(soort, false),
    ], opnieuw, samen));
  } else if (zonJaren.length) {
    const gekozen = gekozenZonJaren(zonJaren);
    const kleurVan = (jaar) => gekozen.length - 1 - gekozen.indexOf(jaar); // nieuwste = 0 (accentkleur)
    const zonWaarde = (maand) => zonPer(`${maand}-01`, maandEinde(maand));
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
          if (w) rijen.push(zonRij(`${fmtMaandKort(`${j}-${mm}`)} ${j}`, w, w.onvolledig ? 'niet elke dag' : null));
        }
      }
      return zonKolommen(rijen);
    };
    const mZon = maat2(kaarten.length % 2 === 0);
    const zonGraf = () => zonGrafiek({
      labels: MND.map((mm) => fmtMaand(`2000-${mm}`).replace(/\s*2000/, '')), korteLabels: MND.map((mm) => fmtMaandKort(`2000-${mm}`)),
      reeksen: gekozen.map((j) => ({ naam: j, kleur: kleurVan(j), waarden: MND.map((mm) => zonWaarde(`${j}-${mm}`)) })),
      fmtKwh: (v) => fmtKwh(v, 0), fmtPct, fmtAs: (v) => fmtGetal(v, 0), ...mZon,
    });
    kaarten.push(wisselKaart('zon', 'Zonnepanelen', (soort) => [
      jaarKeus,
      grafiekOfLijst(soort, zonGraf, zonTabel),
      zonUitleg(soort, true),
    ], opnieuw, samen));
  }

  // Termijnbedragen
  let termijnKaart = null;
  // Een maand zonder ingevuld bedrag krijgt het laatst bekende bedrag van een eerdere maand
  // (een termijnbedrag geldt tot het verandert). Maanden vóór het eerste bekende bedrag tellen niet mee.
  const termijnVan = (mk) => {
    let laatste = null;
    for (const k of [...a.maanden.keys()].sort()) {
      if (k > mk) break;
      const tm = a.maanden.get(k).termijn;
      if (tm != null) laatste = tm;
    }
    return laatste;
  };
  const termijnMaanden = mnd.filter((p) => termijnVan(p.van.slice(0, 7)) != null);
  if (termijnMaanden.length) {
    let betaald = 0; let kosten = 0; let geschat = false; let volledig = 0;
    for (const p of termijnMaanden) {
      const t = totaal(a, p.van, p.tot);
      if (!t.dagen) continue;
      betaald += termijnVan(p.van.slice(0, 7)) / 100;
      kosten += t.kosten;
      if (t.geschat) geschat = true;
      if (t.dagen < daysBetween(p.van, p.tot) + 1) geschat = true;
      volledig++;
    }
    if (volledig) {
      const saldo = betaald - kosten;
      // Losse getallen, geen grafiek: altijd over de hele breedte onder de grafieken.
      termijnKaart = vakKaart(h('h2', { class: 'kaart-titel' }, 'Termijnen en werkelijke kosten'), null,
        h('div', { class: 'kpi-raster' },
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, `Betaald (${volledig} mnd)`), h('strong', { class: 'kpi-waarde' }, euro(betaald))),
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, 'Berekende kosten'), h('strong', { class: 'kpi-waarde' }, euro(kosten))),
          h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, saldo >= 0 ? 'Verwacht terug' : 'Verwacht bijbetalen'),
            h('strong', { class: `kpi-waarde ${saldo >= 0 ? 'is-goed' : 'is-slecht'}` }, euro(Math.abs(saldo))))),
        h('p', { class: 'hint' }, `Over de laatste 12 maanden. Een maand zonder ingevuld bedrag telt met het laatst bekende termijnbedrag. Dit is een schatting${geschat ? ' (niet alle dagen zijn compleet)' : ''}; de jaarafrekening van je leverancier is leidend.`));
    }
  }

  // Eén kolom: kaarten gewoon onder elkaar. Twee kolommen: in een raster.
  if (tweeKolommen) delen.push(h('div', { class: 'overzicht-raster' }, kaarten));
  else delen.push(...kaarten);
  if (termijnKaart) delen.push(termijnKaart);

  const missen = ontbrekendeDagen(a);
  const meldingen = [];
  if (missen.length) meldingen.push(`${missen.length} ${missen.length === 1 ? 'dag ontbreekt' : 'dagen ontbreken'} tussen ${fmtDatumKort(a.eerste)} en ${fmtDatumKort(a.laatste)} (zie Historie).`);
  if (staat.weerFout) meldingen.push(`Temperaturen ophalen lukte niet: ${staat.weerFout}`);
  if (meldingen.length) delen.push(h('div', { class: 'meldingen' }, meldingen.map((m) => h('p', { class: 'hint' }, m))));
  return delen;
}
