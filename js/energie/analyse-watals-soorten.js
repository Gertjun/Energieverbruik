// Soorten analyse van versie 1.29–1.37 (zie analyse-watals.js voor het rekenwerk):
// goedkopere uren, terugleverschaal, zon tegen instraling, thuisbatterij, dynamisch contract,
// warmtepomp, CO₂, vergelijken met een gemiddeld huishouden en opvallende dagen.

import { h, today } from '../core/dom.js';
import { staafGrafiek, lijnenGrafiek } from './grafiek.js';
import { cumulatief, dagVanJaar, jaarPrognose, contractNaSaldering } from './analyse.js';
import {
  verschuifTijdvak, batterij, dynamisch, warmtepomp, co2, zonPrestatie, opvallend, WARMTE_PER_M3, UUR_MAX,
} from './analyse-watals.js';
import { straling, stralingOntbreekt, haalStraling, beursprijzen, prijzenOntbreken, haalPrijzen } from './extern.js';
import { TIJDVAKKEN } from './tarief.js';
import { totaal, zonPeriode, maandenMetZon } from './model.js';
import { addDays, daysBetween, eachDay, fmtDatumKort, fmtMaand, fmtMaandKort, maandStart, maandEinde, weekday } from './tijd.js';
import { kaart, veld, fmtGetal, euro, leesGetal } from './ui.js';

/** Standaardwaarden van de keuzes (gaan mee in favorieten). Getallen als tekst, zoals in een invoerveld. */
export const WATALS_STANDAARD = {
  tvAandeel: '20', scVan: '3500', scTot: '4000', btKwh: '5', btPrijs: '500', dyOpslag: '0,02', dyTerug: '0,02',
  wpType: 'hybride', wpAfgifte: 'radiatoren', wpKw: '4', wpPrijs: '4500', co2Stroom: '0,20', co2Gas: '1,78',
  hhPersonen: '2', hhWoning: 'tweeondereenkap', opMaat: 'basis', opGevoelig: 'normaal', opRichting: 'beide',
};

const periodeTekst = (van, tot) => `${fmtDatumKort(van)} ${van.slice(0, 4)} – ${fmtDatumKort(tot)} ${tot.slice(0, 4)}`;
const keuze = (waarde, opties, onChange) => h('select', { onChange: (e) => onChange(e.target.value) },
  opties.map(([k, t]) => h('option', { value: k, selected: k === waarde }, t)));
/** Invoerveld voor een getal (komma mag). Bij een ongeldige waarde blijft de oude staan. */
const getalVeld = (label, waarde, onChange, hint) => veld(label, h('input', {
  type: 'text', inputmode: 'decimal', value: waarde,
  onChange: (e) => { const v = leesGetal(e.target.value); if (v != null && Number.isFinite(v) && v >= 0) onChange(String(e.target.value).trim()); else e.target.value = waarde; },
}), hint);
const getal = (s, standaard) => { const v = leesGetal(s); return v != null && Number.isFinite(v) ? v : leesGetal(standaard); };
const kpi = (titel, waarde, uitleg, cls = '') => h('div', { class: 'kpi' }, h('span', { class: 'kpi-titel' }, titel), h('strong', { class: `kpi-waarde ${cls}` }, waarde), uitleg ? h('span', { class: 'kpi-verschil muted' }, uitleg) : null);
const kpis = (...items) => h('div', { class: 'kpi-raster analyse-kpi' }, ...items.filter(Boolean));
const kwh = (v, d = 0) => `${fmtGetal(v, d)} kWh`;
const m3 = (v, d = 0) => `${fmtGetal(v, d)} m³`;
const kg = (v) => (Math.abs(v) >= 10000 ? `${fmtGetal(v / 1000, 1)} ton` : `${fmtGetal(v, 0)} kg`);
const tarief = (v) => `€ ${fmtGetal(v, 3)}`;
const plusMin = (v) => (v == null ? '–' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${euro(Math.abs(v))}`);
const pct = (v, d = 0) => (v == null ? '–' : `${fmtGetal(v * 100, d)}%`);
const jaren = (v) => (v == null || !Number.isFinite(v) || v <= 0 ? 'niet' : v > 40 ? 'meer dan 40 jaar' : `${fmtGetal(v, v < 10 ? 1 : 0)} jaar`);
const tabel = (koppen, rijen) => h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
  h('thead', {}, h('tr', {}, koppen.map(([t, cls]) => h('th', { class: cls || '' }, t)))), h('tbody', {}, rijen)));
const cel = (t, cls = 'num') => h('td', { class: cls }, t);
const geenGegevens = (titel, tekst) => kaart(titel, h('p', { class: 'muted' }, tekst));
const vandaag = () => today();
/** Balkje met een breedte in procenten (via CSSOM: de Content-Security-Policy staat geen style-attributen toe). */
function balk(p) { const i = h('i', {}); i.style.width = `${Math.max(1, p).toFixed(1)}%`; return i; }
/** Kleur voor een besparing (positief = gunstig) in een tabelcel. */
const besparingKleur = (v) => (v > 0.005 ? ' is-goed' : v < -0.005 ? ' is-slecht' : '');

/**
 * Toont eerst "bezig met ophalen" en tekent het resultaat zodra de gegevens binnen zijn.
 * `nodig`: is er iets op te halen? `laden`: haalt het op. `teken`: maakt de kaarten.
 */
function naOphalen(titel, nodig, laden, teken) {
  if (!nodig) return teken();
  const plek = h('div', { class: 'analyse-laad' }, kaart(titel, h('p', { class: 'muted' }, 'Bezig met ophalen…')));
  laden().then(() => plek.replaceChildren(...[].concat(teken())))
    .catch((e) => plek.replaceChildren(kaart(titel, h('p', { class: 'muted' }, `Ophalen lukte niet: ${e.message}. Controleer de internetverbinding en open de analyse opnieuw.`))));
  return plek;
}

// ---------- 1. Goedkopere uren (tijdvakken) ----------

const tijdvakSoort = {
  key: 'tijdvak', groep: 'kosten',
  kort: 'Goedkopere uren',
  uitleg: 'Wat verschuiven naar dal oplevert',
  naam: 'Verschuiven naar goedkopere tijdvakken',
  velden: (c, wijzig) => [veld('Deel van je verbruik dat je verschuift', keuze(c.tvAandeel,
    [['10', '10%'], ['20', '20% (bijv. was, vaatwasser)'], ['30', '30%'], ['50', '50% (ook de auto laden)']], (v) => wijzig({ tvAandeel: v })))],
  resultaat(a, c, van, tot) {
    const aandeel = getal(c.tvAandeel, '20') / 100;
    const r = verschuifTijdvak(a, van, tot, aandeel);
    if (!r.dagen) return geenGegevens('Goedkopere uren', 'Geen stroomgegevens met een contract in deze periode.');
    const tvs = TIJDVAKKEN.filter((t) => r.per[t.key].kwh > 0);
    const goedkoopst = tvs.reduce((b, t) => (r.per[t.key].euro / r.per[t.key].kwh < r.per[b.key].euro / r.per[b.key].kwh ? t : b), tvs[0]);
    // Liggende balken: past op een telefoon beter dan zes staven met lange namen.
    const maxKwh = Math.max(...tvs.map((t) => r.per[t.key].kwh)) || 1;
    const balken = h('div', { class: 'top-lijst balk-lijst' }, h('ol', {}, tvs.map((t) => {
      const x = r.per[t.key];
      return h('li', {},
        h('span', { class: 'top-naam', title: `${t.label} (${t.uren})` }, t.label),
        h('span', { class: 'top-balk' }, balk((x.kwh / maxKwh) * 100)),
        h('span', { class: 'top-waarde' }, kwh(x.kwh), h('small', {}, tarief(x.euro / x.kwh))));
    })));
    const rijen = [
      h('tr', { class: 'jaar-rij' }, h('th', { scope: 'row' }, 'Totaal'), cel(fmtGetal(r.kwh, 0)), cel('100%', 'num verberg-smal'), cel(tarief(r.gemPrijs)), cel(euro(r.euro))),
      ...tvs.map((t) => { const x = r.per[t.key]; return h('tr', {}, h('td', {}, t.label, h('small', { class: 'muted verberg-smal' }, ` ${t.uren}`)), cel(fmtGetal(x.kwh, 0)), cel(pct(x.kwh / r.kwh), 'num verberg-smal'), cel(tarief(x.euro / x.kwh)), cel(euro(x.euro))); }),
    ];
    const maandRijen = r.maanden.filter((m) => m.dagen).map((m) => h('tr', {}, h('td', {}, m.label), cel(fmtGetal(m.kwh, 0)), cel(euro(m.besparing), `num${besparingKleur(m.besparing)}`)));
    const dagen = daysBetween(van, tot) + 1;
    return [kaart('Verschuiven naar goedkopere tijdvakken',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${r.dagen} dagen`),
      kpis(
        kpi('Je betaalt gemiddeld', `${tarief(r.gemPrijs)} per kWh`, `levering + energiebelasting; goedkoopst was ${goedkoopst.label.toLowerCase()} (${tarief(r.per[goedkoopst.key].euro / r.per[goedkoopst.key].kwh)})`),
        kpi('Te verschuiven', kwh(r.verschuif), `${pct(aandeel)} van je afname buiten de goedkoopste uren van die dag`),
        kpi('Besparing', euro(r.besparing), dagen >= 360 ? 'per jaar' : `in deze ${dagen} dagen`, 'is-goed')),
      h('h3', { class: 'top-titel' }, 'Afname en tarief per tijdvak'), balken,
      tabel([['Tijdvak'], ['Afname (kWh)', 'num'], ['Deel', 'num verberg-smal'], ['Tarief', 'num'], ['Kosten', 'num']], rijen),
      h('p', { class: 'hint' }, [
        `Voor elke dag kijkt de app welk tijdvak die dag het goedkoopst is (doordeweeks in de zomer 12–16 uur, in het weekend in de zomer 12–16 uur met €0 leveringskosten, in de winter de nacht 01–06 uur). `,
        `Daarna rekent hij uit wat het scheelt als je ${pct(aandeel)} van je afname in de duurdere uren van die dag naar dat goedkoopste tijdvak had verplaatst, bijvoorbeeld door de wasmachine, droger, vaatwasser of de auto met een uitgestelde start te laten lopen. `,
        'Met saldering en na saldering scheelt dit hetzelfde: het verschil zit alleen in het tarief. In de zomer tussen 12 en 16 uur gebruik je vanaf 2027 bovendien je eigen zonnestroom; dat extra voordeel staat bij Eigen verbruik. ',
        'Tip: het zomer-weekendtarief (12–16 uur) is het allergoedkoopst, maar daarvoor moet je verbruik naar een andere dag, en dat telt de app hier niet mee.',
        r.geschat ? ' Voor dagen zonder uurgegevens is de verdeling over de uren geschat.' : '',
      ].join(''))),
    kaart('Besparing per maand', tabel([['Maand'], ['Verschoven (kWh)', 'num'], ['Besparing', 'num']], maandRijen))];
  },
};

// ---------- 2. Terugleverschaal ----------

const schaalSoort = {
  key: 'schaal', groep: 'kosten',
  kort: 'Terugleverschaal',
  uitleg: 'Blijf je binnen je schaal?',
  naam: 'Terugleverschaal bewaken',
  geenPeriode: true,
  velden: (c, wijzig) => [
    getalVeld('Schaal vanaf (kWh)', c.scVan, (v) => wijzig({ scVan: v })),
    getalVeld('Schaal tot (kWh)', c.scTot, (v) => wijzig({ scTot: v }), 'zoals op je contract; nu schaal 14'),
  ],
  resultaat(a, c) {
    const onder = getal(c.scVan, '3500'); const boven = getal(c.scTot, '4000');
    const jaar = Number(a.laatste.slice(0, 4));
    const reeksen = cumulatief(a, 'terug', [jaar - 1, jaar]).filter((r) => r.totaal != null);
    const nu = reeksen.find((r) => r.jaar === jaar);
    if (!nu) return geenGegevens('Terugleverschaal', 'Nog geen teruglevering bekend in dit jaar.');
    const p = jaarPrognose(a);
    const verwacht = p.totaal.echt.terug + p.totaal.geschat.terug;
    const begin = nu.eerste;
    const onvolledig = begin > `${jaar}-01-01`;
    const status = verwacht > boven ? ['Boven je schaal', 'is-slecht', `${kwh(verwacht - boven)} meer dan de bovengrens`]
      : verwacht < onder ? ['Onder je schaal', 'is-goed', `${kwh(onder - verwacht)} minder dan de ondergrens: misschien kan een lagere schaal`]
        : ['Binnen je schaal', 'is-goed', `nog ${kwh(boven - verwacht)} ruimte tot de bovengrens`];
    const metC = a.contracten.filter((k) => k.terug?.regeling === 'saldering').sort((x, y) => (x.van < y.van ? 1 : -1))[0];
    const na = contractNaSaldering(a);
    const kostenNu = metC?.terug?.vasteKostenJaar ?? null;
    const kostenNa = na ? verwacht * (na.terug.kostenPerKwh || 0) : null;
    const leeg = new Array(366).fill(null);
    const lijn = (v) => leeg.map((_, i) => (i <= 365 ? v : null));
    const grafiek = lijnenGrafiek({
      reeksen: [
        ...reeksen.map((r) => ({ naam: String(r.jaar), kleur: jaar - r.jaar, waarden: r.waarden })),
        { naam: `Grens ${fmtGetal(boven, 0)} kWh`, kleur: 2, waarden: lijn(boven) },
        { naam: `Grens ${fmtGetal(onder, 0)} kWh`, kleur: 3, waarden: lijn(onder) },
      ],
      fmt: (v, as) => (as ? fmtGetal(v, 0) : kwh(v)), xLabel: (i) => fmtDatumKort(addDays('2024-01-01', i)),
    });
    return kaart(`Terugleverschaal ${jaar}`,
      h('p', { class: 'hint' }, `Teruglevering opgeteld vanaf 1 januari, t/m ${fmtDatumKort(a.laatste)}${onvolledig ? ` (gegevens vanaf ${fmtDatumKort(begin)})` : ''}`),
      kpis(
        kpi('Teruggeleverd tot nu', kwh(nu.waarden[dagVanJaar(a.laatste)] ?? nu.totaal), onvolledig ? `vanaf ${fmtDatumKort(begin)}` : `in ${jaar}`),
        kpi('Verwacht hele jaar', kwh(verwacht), 'met de jaarprognose (rest van het jaar zoals vorig jaar)'),
        kpi(status[0], `${fmtGetal(onder, 0)}–${fmtGetal(boven, 0)} kWh`, status[2], status[1]),
        kostenNu != null ? kpi(`Vaste terugleverkosten ${jaar}`, euro(kostenNu), 'per jaar, bij deze schaal') : null,
        kostenNa != null ? kpi('Terugleverkosten vanaf 2027', euro(kostenNa), `${tarief(na.terug.kostenPerKwh)} per kWh bij ${kwh(verwacht)}; daar staat een vergoeding van ${euro(verwacht * (na.terug.vergoeding || 0))} tegenover`) : null),
      grafiek,
      h('p', { class: 'hint' }, [
        'Tot 1 januari 2027 betaal je vaste terugleverkosten per jaar, afhankelijk van hoeveel je teruglevert (de schaal). Vattenfall schat je schaal vooraf en rekent bij de jaarafrekening met de werkelijke teruglevering; kom je in een hogere schaal uit, dan betaal je daar bij. ',
        'Vul hierboven de grenzen van je schaal in zoals op je contract (Instellingen → Tarieven heeft het bedrag per jaar). ',
        'Vanaf 2027 bestaan de schalen niet meer: dan betaal je terugleverkosten per kWh en krijg je een vergoeding per kWh (zie Einde saldering).',
        onvolledig ? ` Let op: ${jaar} heeft pas gegevens vanaf ${fmtDatumKort(begin)}; de jaarprognose schat de dagen daarvoor.` : '',
      ].join('')));
  },
};

// ---------- 3. Zon tegen instraling ----------

const zonStralingSoort = {
  key: 'zonstraling', groep: 'zon',
  kort: 'Zon tegen weer',
  uitleg: 'Presteren je panelen normaal?',
  naam: 'Zonne-opbrengst tegenover zoninstraling',
  geenPeriode: true,
  resultaat(a) {
    const nu = vandaag();
    const mnd = maandenMetZon(a);
    if (!mnd.length) return geenGegevens('Zon tegen weer', 'Nog geen zonne-opbrengst bekend. Lees een SolarEdge-export in via Invoer → Bestanden inlezen.');
    const datums = [];
    for (const mk of mnd) for (const d of eachDay(maandStart(mk), maandEinde(mk))) if (d < nu) datums.push(d);
    const loc = a.data?.instellingen || {};
    return naOphalen('Zon tegen weer', stralingOntbreekt(datums, nu).length > 0,
      () => haalStraling(datums, { lat: loc.lat ?? 51.44, lon: loc.lon ?? 5.48 }, nu),
      () => zonStralingKaarten(a, nu));
  },
};

function zonStralingKaarten(a, nu) {
  const { rijen, jaren: perJaar } = zonPrestatie(a, straling(), nu);
  const metIndex = rijen.filter((r) => r.index != null);
  if (!rijen.some((r) => r.ratio != null)) return geenGegevens('Zon tegen weer', 'Geen instraling gevonden voor de maanden met opbrengst.');
  const laag = metIndex.filter((r) => r.index < 0.85 && !r.onvolledig);
  const laatste = [...metIndex].reverse().find((r) => !r.onvolledig);
  // Met minstens twee jaren per maand de prestatie (100% = normaal); anders alleen de verhouding.
  const metRatio = rijen.filter((r) => r.ratio != null);
  const kort = (r) => (r.maand.endsWith('-01') ? r.maand.slice(0, 4) : fmtMaandKort(r.maand));
  const grafiek = metIndex.length
    ? staafGrafiek({
      labels: metIndex.map((r) => fmtMaand(r.maand)), korteLabels: metIndex.map(kort),
      waarden: metIndex.map((r) => r.index * 100), markeer: metIndex.map((r) => r.index < 0.85 || r.onvolledig),
      grens: { waarde: 100, naam: '' },
      fmt: (v, as) => (as ? fmtGetal(v, 0) : `${fmtGetal(v, 0)}%`), naam: 'Prestatie tegenover dezelfde maand in andere jaren',
    })
    : staafGrafiek({
      labels: metRatio.map((r) => fmtMaand(r.maand)), korteLabels: metRatio.map(kort),
      waarden: metRatio.map((r) => r.ratio), markeer: metRatio.map((r) => r.onvolledig),
      fmt: (v, as) => fmtGetal(v, as ? 1 : 2), naam: 'Opbrengst per kWh/m² instraling',
    });
  const uitlegGrafiek = metIndex.length
    ? h('p', { class: 'hint' }, 'De grafiek toont per maand de prestatie; de stippellijn is 100% (normaal). Gemarkeerd = duidelijk lager, of de maand is nog niet compleet.')
    : h('p', { class: 'hint' }, 'Er is nog van geen enkele maand een tweede jaar om mee te vergelijken; daarom staat hier alleen de opbrengst per kWh/m² instraling. Lees de SolarEdge-maandexport met alle jaren in (Invoer → Bestanden inlezen) voor de prestatie.');
  const jaarRijen = perJaar.map((j) => h('tr', {}, h('td', {}, `${j.jaar}${j.maanden < 12 ? ` (${j.maanden} mnd)` : ''}`), cel(fmtGetal(j.zon, 0)), cel(fmtGetal(j.instraling, 0)), cel(fmtGetal(j.ratio, 2))));
  const maandRijen = [...rijen].reverse().slice(0, 36).map((r) => h('tr', {},
    h('td', {}, `${fmtMaand(r.maand)}${r.onvolledig ? ' *' : ''}`), cel(fmtGetal(r.zon, 0)), cel(r.instraling == null ? '–' : fmtGetal(r.instraling, 0)),
    cel(r.ratio == null ? '–' : fmtGetal(r.ratio, 2), 'num verberg-smal'),
    cel(r.index == null ? '–' : pct(r.index), `num${r.index == null ? '' : r.index < 0.85 ? ' is-slecht' : r.index > 1.05 ? ' is-goed' : ''}`)));
  return [kaart('Zonne-opbrengst tegenover zoninstraling',
    kpis(
      laatste ? kpi(`Prestatie ${fmtMaand(laatste.maand).toLowerCase()}`, pct(laatste.index), `tegenover ${fmtMaand(laatste.maand).split(' ')[0]} in ${laatste.vergelijkbaar - 1} andere ${laatste.vergelijkbaar === 2 ? 'jaar' : 'jaren'}`, laatste.index < 0.85 ? 'is-slecht' : 'is-goed') : null,
      kpi('Maanden duidelijk lager', String(laag.length), laag.length ? laag.slice(-3).map((r) => fmtMaandKort(r.maand) + ' ' + r.maand.slice(0, 4)).join(', ') : 'onder 85% van normaal', laag.length ? 'is-slecht' : 'is-goed'),
      perJaar.length ? kpi('Opbrengst per kWh/m² zon', fmtGetal(perJaar[perJaar.length - 1].ratio, 2), `${perJaar[perJaar.length - 1].jaar}; ${perJaar.length > 1 ? `${perJaar[perJaar.length - 2].jaar}: ${fmtGetal(perJaar[perJaar.length - 2].ratio, 2)}` : 'eerste jaar'}`) : null),
    grafiek, uitlegGrafiek,
    h('p', { class: 'hint' }, [
      'Instraling = de hoeveelheid zonlicht die per m² op de grond viel in Eindhoven (Open-Meteo). Deel je de opbrengst daardoor, dan blijft over hoe goed je panelen het zonlicht omzetten, los van of het een zonnige maand was. ',
      'Omdat de zon in de winter lager staat dan in de zomer, vergelijkt de app elke maand alleen met dezelfde maand in andere jaren: 100% = zoals normaal. ',
      'Duidelijk lager (onder 85%, gemarkeerd) kan wijzen op vuile panelen, schaduw (bijv. een gegroeide boom), sneeuw of een omvormer die (een tijd) uit stond. Panelen worden ook langzaam minder, ongeveer een half procent per jaar. ',
      'Maanden met een * zijn nog niet compleet en tellen niet mee voor "normaal". Uitgesloten perioden (Analyse → Uitgesloten perioden) tellen niet mee.',
    ].join(''))),
  kaart('Per jaar', tabel([['Jaar'], ['Opbrengst (kWh)', 'num'], ['Instraling (kWh/m²)', 'num'], ['kWh per kWh/m²', 'num']], jaarRijen)),
  kaart('Per maand', tabel([['Maand'], ['Opbrengst (kWh)', 'num'], ['Instraling (kWh/m²)', 'num'], ['Verhouding', 'num verberg-smal'], ['Prestatie', 'num']], maandRijen))];
}

// ---------- 4. Thuisbatterij ----------

const batterijSoort = {
  key: 'batterij', groep: 'watals',
  kort: 'Thuisbatterij',
  uitleg: 'Wat levert een batterij op?',
  naam: 'Wat als je een thuisbatterij had',
  velden: (c, wijzig) => [
    veld('Grootte', keuze(c.btKwh, [['2.5', '2,5 kWh'], ['5', '5 kWh'], ['7.5', '7,5 kWh'], ['10', '10 kWh'], ['15', '15 kWh']], (v) => wijzig({ btKwh: v }))),
    getalVeld('Prijs per kWh (€, geïnstalleerd)', c.btPrijs, (v) => wijzig({ btPrijs: v })),
  ],
  resultaat(a, c, van, tot) {
    const cap = Number(c.btKwh) || 5; const kw = Math.min(5, cap / 2);
    const r = batterij(a, van, tot, { kwh: cap, kw, rendement: 0.9 });
    const t = r.totaal;
    if (!t.dagen) return geenGegevens('Thuisbatterij', 'Geen dagen met uurgegevens in deze periode.');
    const met = t.metVoor - t.metNa; const na = t.naVoor - t.naNa;
    const factor = 365 / (daysBetween(van, tot) + 1);
    const prijs = getal(c.btPrijs, '500') * cap;
    const maanden = r.maanden.filter((m) => m.dagen);
    const grafiek = staafGrafiek({
      labels: maanden.map((m) => m.label), korteLabels: maanden.map((m) => m.kort),
      waarden: maanden.map((m) => m.naVoor - m.naNa), vergelijk: maanden.map((m) => m.metVoor - m.metNa),
      fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), naam: 'Besparing vanaf 2027', vergelijkNaam: 'Besparing met saldering (nu)',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      cel(fmtGetal(x.ontladen, 0)), cel(euro(x.metVoor - x.metNa), `num verberg-smal${besparingKleur(x.metVoor - x.metNa)}`), cel(euro(x.naVoor - x.naNa), `num${besparingKleur(x.naVoor - x.naNa)}`));
    return kaart(`Thuisbatterij van ${fmtGetal(cap, 1)} kWh`,
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${t.dagen} dagen met uurgegevens`),
      kpis(
        kpi('Met saldering (nu)', plusMin(met), 'besparing in deze periode: saldering doet al wat een batterij doet', besparingKleur(met).trim()),
        kpi('Vanaf 2027', plusMin(na), `in deze periode; ongeveer ${euro(na * factor)} per jaar`, besparingKleur(na).trim()),
        kpi('Terugverdientijd', jaren(prijs / (na * factor)), `bij ${euro(prijs)} aanschaf, met de regels vanaf 2027`),
        kpi('Uit de batterij gebruikt', kwh(t.ontladen), `${fmtGetal(r.cycli, 0)} keer vol-leeg; ${kwh(t.geladen)} opgeslagen`)),
      grafiek,
      tabel([['Maand'], ['Uit batterij (kWh)', 'num'], ['Besparing nu', 'num verberg-smal'], ['Vanaf 2027', 'num']],
        [rij('Totaal', t, 'jaar-rij'), ...maanden.map((m) => rij(m.label, m))]),
      h('p', { class: 'hint' }, [
        `De app speelt uur voor uur na wat de batterij had gedaan: stroom die je anders teruglevert gaat de batterij in, en zodra je stroom afneemt komt die er weer uit (laden en ontladen met maximaal ${fmtGetal(kw, 1)} kW, 90% rendement heen en terug). `,
        'Met saldering levert dat bijna niets op: een teruggeleverde kWh is dan al evenveel waard als een afgenomen kWh, en je verliest 10% in de batterij. ',
        'Na 2027 krijg je voor teruglevering veel minder dan je voor afname betaalt; dan bespaart elke kWh uit de batterij het verschil. ',
        'Niet meegerekend: slim laden met goedkope nachtstroom of een dynamisch contract (kan meer opleveren), en dat de batterij na 10–15 jaar minder vasthoudt. Uurgegevens zijn een benadering: binnen een uur kun je zowel afnemen als terugleveren.',
      ].join('')));
  },
};

// ---------- 5. Dynamisch contract ----------

const dynamischSoort = {
  key: 'dynamisch', groep: 'watals',
  kort: 'Dynamisch contract',
  uitleg: 'Uurprijzen tegen je vaste tarief',
  naam: 'Wat als je een dynamisch contract had',
  velden: (c, wijzig) => [
    getalVeld('Inkoopvergoeding (€/kWh, zonder btw)', c.dyOpslag, (v) => wijzig({ dyOpslag: v }), 'opslag van de leverancier op de beursprijs'),
    getalVeld('Opslag op teruglevering (€/kWh)', c.dyTerug, (v) => wijzig({ dyTerug: v }), 'wat de leverancier inhoudt per teruggeleverde kWh'),
  ],
  resultaat(a, c, van, tot) {
    const nu = vandaag();
    return naOphalen('Dynamisch contract', prijzenOntbreken(van, tot, nu).length > 0,
      () => haalPrijzen(van, tot, nu), () => dynamischKaart(a, c, van, tot));
  },
};

function dynamischKaart(a, c, van, tot) {
  const opslag = getal(c.dyOpslag, '0,02'); const terugOpslag = getal(c.dyTerug, '0,02');
  const r = dynamisch(a, van, tot, beursprijzen(), { opslag, terugOpslag });
  const t = r.totaal;
  if (!r.na) return geenGegevens('Dynamisch contract', 'Er is geen contract met een regeling na saldering. Voeg dat toe bij Instellingen → Tarieven.');
  if (!t.dagen) return geenGegevens('Dynamisch contract', r.geenPrijs ? `Voor de ${r.geenPrijs} dagen met uurgegevens in deze periode zijn (nog) geen beursprijzen gevonden.` : 'Geen dagen met uurgegevens in deze periode.');
  const verschil = t.dyn - t.vast;
  const maanden = r.maanden.filter((m) => m.dagen);
  const grafiek = staafGrafiek({
    labels: maanden.map((m) => m.label), korteLabels: maanden.map((m) => m.kort),
    waarden: maanden.map((m) => m.dyn), vergelijk: maanden.map((m) => m.vast),
    fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), naam: 'Dynamisch', vergelijkNaam: 'Je eigen contract',
  });
  const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
    cel(euro(x.vast)), cel(euro(x.dyn)), cel(plusMin(x.dyn - x.vast), `num${besparingKleur(x.vast - x.dyn)}`),
    cel(x.afname ? tarief(x.afEuro / x.afname) : '–', 'num verberg-smal'), cel(x.terug ? tarief(x.teEuro / x.terug) : '–', 'num verberg-smal'));
  const dagen = daysBetween(van, tot) + 1;
  return kaart('Dynamisch contract tegenover je eigen contract',
    h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${t.dagen} dagen met uurgegevens en beursprijzen${r.geenPrijs ? ` (${r.geenPrijs} ${r.geenPrijs === 1 ? 'dag' : 'dagen'} zonder prijzen overgeslagen)` : ''}`),
    kpis(
      kpi('Je eigen contract', euro(t.vast), 'stroom afname en teruglevering, met de regels vanaf 2027'),
      kpi('Dynamisch', euro(t.dyn), `gemiddelde beursprijs ${tarief(t.beurs / t.dagen)} per kWh zonder btw`),
      kpi(verschil <= 0 ? 'Dynamisch goedkoper' : 'Dynamisch duurder', plusMin(verschil), dagen >= 360 ? 'per jaar' : `in deze ${dagen} dagen`, verschil <= 0 ? 'is-goed' : 'is-slecht'),
      t.negatief > 0.5 ? kpi('Teruggeleverd bij negatieve prijs', kwh(t.negatief), 'dan betaal je bij een dynamisch contract om terug te leveren', 'is-slecht') : null),
    grafiek,
    tabel([['Maand'], ['Eigen contract', 'num'], ['Dynamisch', 'num'], ['Verschil', 'num'], ['Afname per kWh', 'num verberg-smal'], ['Terug per kWh', 'num verberg-smal']],
      [rij('Totaal', t, 'jaar-rij'), ...maanden.map((m) => rij(m.label, m))]),
    h('p', { class: 'hint' }, [
      'Je echte verbruik per uur, doorgerekend met de uurprijs van de stroombeurs (EPEX, via EnergyZero). ',
      `Afname: (beursprijs + ${tarief(opslag)} inkoopvergoeding) plus 21% btw, plus energiebelasting. Teruglevering: beursprijs min ${tarief(terugOpslag)}; bij een negatieve beursprijs betaal je dus om terug te leveren. `,
      'Beide kanten volgens de regels vanaf 2027 (geen saldering), zodat je kunt kiezen voor het jaar dat komt. Vaste kosten (vastrecht, netbeheer, vermindering energiebelasting) zijn bij beide ongeveer gelijk en tellen niet mee. ',
      'De app laat je gedrag gelijk; met een dynamisch contract zou je juist je verbruik naar goedkope uren schuiven, en dat is extra winst. De beursprijzen worden op dit apparaat bewaard.',
    ].join('')));
}

// ---------- 6. Warmtepomp ----------

const warmtepompSoort = {
  key: 'warmtepomp', groep: 'watals',
  kort: 'Warmtepomp',
  uitleg: 'Hybride of volledig elektrisch',
  naam: 'Wat als je een warmtepomp had',
  velden: (c, wijzig) => [
    veld('Soort', keuze(c.wpType, [['hybride', 'Hybride (naast de cv-ketel)'], ['volledig', 'Volledig elektrisch (zonder gas)']], (v) => wijzig({ wpType: v, wpPrijs: v === 'volledig' ? '12000' : '4500' }))),
    veld('Verwarming in huis', keuze(c.wpAfgifte, [['radiatoren', 'Gewone radiatoren'], ['laag', 'Vloerverwarming of lage-temperatuurradiatoren']], (v) => wijzig({ wpAfgifte: v }))),
    c.wpType === 'hybride' ? getalVeld('Vermogen (kW warmte)', c.wpKw, (v) => wijzig({ wpKw: v })) : null,
    getalVeld('Aanschaf na subsidie (€)', c.wpPrijs, (v) => wijzig({ wpPrijs: v })),
  ],
  resultaat(a, c, van, tot) {
    const r = warmtepomp(a, van, tot, { type: c.wpType, kw: getal(c.wpKw, '4'), afgifte: c.wpAfgifte });
    const t = r.totaal;
    if (!r.fit) return geenGegevens('Warmtepomp', 'Er is geen stooklijn te bepalen (te weinig dagen met gas én temperatuur). Kies een periode met een stookseizoen.');
    if (!t.dagen) return geenGegevens('Warmtepomp', 'Geen dagen met gas én temperatuur in deze periode.');
    const factor = 365 / (daysBetween(van, tot) + 1);
    const prijs = getal(c.wpPrijs, '4500');
    const maanden = r.maanden.filter((m) => m.dagen);
    const grafiek = staafGrafiek({
      labels: maanden.map((m) => m.label), korteLabels: maanden.map((m) => m.kort),
      waarden: maanden.map((m) => m.gasEuro + m.vastGas), vergelijk: maanden.map((m) => m.stroomEuro),
      fmt: (v, as) => (as ? `€${fmtGetal(v, 0)}` : euro(v)), naam: 'Minder gas', vergelijkNaam: 'Extra stroom',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      cel(fmtGetal(x.gas, 0), 'num verberg-smal'), cel(fmtGetal(x.gasWeg, 0)), cel(fmtGetal(x.kwh, 0)), cel(euro(x.besparing), `num${besparingKleur(x.besparing)}`));
    const volledig = c.wpType === 'volledig';
    return kaart(volledig ? 'Volledig elektrische warmtepomp' : 'Hybride warmtepomp',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${t.dagen} dagen met gas en temperatuur`),
      kpis(
        kpi('Minder gas', m3(t.gasWeg), `${pct(t.gas ? t.gasWeg / t.gas : 0)} van je ${m3(t.gas)}; ${euro(t.gasEuro)}${volledig ? ` + ${euro(t.vastGas)} vaste gaskosten` : ''}`),
        kpi('Extra stroom', kwh(t.kwh), `${euro(t.stroomEuro)}; gemiddeld rendement (COP) ${fmtGetal(t.scop, 1)}`),
        kpi('Besparing', plusMin(t.besparing), `in deze periode; ongeveer ${euro(t.besparing * factor)} per jaar`, besparingKleur(t.besparing).trim()),
        kpi('Terugverdientijd', jaren(prijs / (t.besparing * factor)), `bij ${euro(prijs)} aanschaf na subsidie`)),
      grafiek,
      tabel([['Maand'], ['Gas nu (m³)', 'num verberg-smal'], ['Minder gas (m³)', 'num'], ['Extra stroom (kWh)', 'num'], ['Besparing', 'num']],
        [rij('Totaal', t, 'jaar-rij'), ...maanden.map((m) => rij(m.label, m))]),
      h('p', { class: 'hint' }, [
        `Uit je stooklijn haalt de app hoeveel gas je voor verwarming gebruikt en hoeveel voor warm water en koken (het vaste deel, ${m3(r.fit.vast, 2)} per dag). `,
        volledig
          ? `Volledig elektrisch: alle warmte en warm water komen van de warmtepomp (warm water met een rendement van ${fmtGetal(2.5, 1)}), en de vaste kosten van de gasaansluiting vervallen. Koken op inductie en de kosten van het afsluiten van gas zijn niet meegerekend. `
          : `Hybride: de warmtepomp verwarmt tot zijn vermogen (${fmtGetal(getal(c.wpKw, '4'), 1)} kW, hoogstens 20 uur per dag); de cv-ketel doet de rest en het warm water. `,
        `Eén m³ gas geeft via de ketel ongeveer ${fmtGetal(WARMTE_PER_M3, 1)} kWh warmte. Het rendement (COP) van de warmtepomp hangt af van de buitentemperatuur van die dag${c.wpAfgifte === 'radiatoren' ? ' en is met gewone radiatoren lager' : ''}. `,
        'De extra stroom kost het daggemiddelde van je tarief, zonder saldering (zoals vanaf 2027). In werkelijkheid hangt het af van hoe goed je huis geïsoleerd is; laat je bij twijfel adviseren.',
      ].join('')));
  },
};

// ---------- 7. CO₂ ----------

const co2Soort = {
  key: 'co2', groep: 'vergelijken',
  kort: 'CO₂-uitstoot',
  uitleg: 'Uitstoot van gas en stroom',
  naam: 'CO₂-uitstoot',
  velden: (c, wijzig) => [
    getalVeld('Stroom (kg CO₂ per kWh)', c.co2Stroom, (v) => wijzig({ co2Stroom: v }), 'gemiddelde Nederlandse stroom 2024 (CBS): 0,20'),
    getalVeld('Gas (kg CO₂ per m³)', c.co2Gas, (v) => wijzig({ co2Gas: v }), 'aardgas bij verbranding: 1,78'),
  ],
  resultaat(a, c, van, tot) {
    const fs = getal(c.co2Stroom, '0,20'); const fg = getal(c.co2Gas, '1,78');
    const r = co2(a, van, tot, { stroom: fs, gas: fg });
    const t = r.totaal;
    if (!t.dagen) return geenGegevens('CO₂-uitstoot', 'Geen gegevens in deze periode.');
    const maanden = r.maanden.filter((m) => m.dagen);
    const grafiek = staafGrafiek({
      labels: maanden.map((m) => m.label), korteLabels: maanden.map((m) => m.kort),
      waarden: maanden.map((m) => m.gas + m.afname), vergelijk: maanden.map((m) => m.terug),
      fmt: (v, as) => (as ? fmtGetal(v, 0) : kg(v)), naam: 'Uitstoot (gas + stroom van het net)', vergelijkNaam: 'Vermeden door teruglevering',
    });
    const rij = (label, x, cls) => h('tr', { class: cls }, h(cls ? 'th' : 'td', cls ? { scope: 'row' } : {}, label),
      cel(fmtGetal(x.gas, 0)), cel(fmtGetal(x.afname, 0)), cel(fmtGetal(x.terug, 0), 'num verberg-smal'), cel(fmtGetal(x.netto, 0)));
    return kaart('CO₂-uitstoot',
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)}`),
      kpis(
        kpi('Netto uitstoot', kg(t.netto), 'gas + stroom van het net − teruglevering'),
        kpi('Door gas', kg(t.gas), `${m3(t.m3)} × ${fmtGetal(fg, 2)} kg`),
        kpi('Door stroom van het net', kg(t.afname), `${kwh(t.kwhAf)} × ${fmtGetal(fs, 2)} kg`),
        kpi('Vermeden door je zonnepanelen', kg(t.terug), `${kwh(t.kwhTe)} teruggeleverd; zelf gebruikte zonnestroom scheelt daarnaast al afname`, 'is-goed')),
      grafiek,
      tabel([['Maand'], ['Gas (kg)', 'num'], ['Stroom (kg)', 'num'], ['Vermeden (kg)', 'num verberg-smal'], ['Netto (kg)', 'num']],
        [rij('Totaal', t, 'jaar-rij'), ...maanden.map((m) => rij(m.label, m))]),
      h('p', { class: 'hint' }, [
        'Gas: elke m³ aardgas geeft bij verbranding ongeveer 1,78 kg CO₂. Stroom: het gemiddelde van alle stroom die in Nederland is opgewekt (CBS, 2024: 0,20 kg per kWh); dat getal daalt elk jaar doordat er meer zon en wind bij komt. ',
        'Teruggeleverde zonnestroom vervangt stroom die anders elders is opgewekt; die uitstoot telt de app als vermeden. Beide getallen zijn hierboven aan te passen, bijvoorbeeld als je groene stroom koopt of een nieuwer getal wilt gebruiken.',
      ].join('')));
  },
};

// ---------- 8. Gemiddeld huishouden ----------

/** Gemiddeld jaarverbruik van woningen met een gasaansluiting, CBS 2025 (voorlopig). */
const CBS_PERSONEN = { 1: [1600, 830], 2: [2480, 1040], 3: [3040, 1160], 4: [3560, 1250], 5: [3930, 1390] };
const CBS_WONING = {
  appartement: ['Appartement', 1780, 750, 'Appart.'], tussenwoning: ['Tussenwoning', 2420, 980, 'Tussen'], hoekwoning: ['Hoekwoning', 2580, 1120, 'Hoek'],
  tweeondereenkap: ['Twee-onder-een-kap', 2960, 1250, '2-onder-1'], vrijstaand: ['Vrijstaande woning', 3750, 1630, 'Vrijst.'],
};

const huishoudenSoort = {
  key: 'huishouden', groep: 'vergelijken',
  kort: 'Tegenover gemiddeld',
  uitleg: 'Vergelijk met andere huishoudens',
  naam: 'Vergelijken met een gemiddeld huishouden',
  geenPeriode: true,
  velden: (c, wijzig) => [
    veld('Aantal personen', keuze(c.hhPersonen, [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 of meer']], (v) => wijzig({ hhPersonen: v }))),
    veld('Soort woning', keuze(c.hhWoning, Object.entries(CBS_WONING).map(([k, [t]]) => [k, t]), (v) => wijzig({ hhWoning: v }))),
  ],
  resultaat(a, c) {
    const tot = a.laatste; const van = addDays(tot, -364);
    const t = totaal(a, van, tot);
    if (t.dagenAfname < 300 && t.dagenGas < 300) return geenGegevens('Tegenover gemiddeld', 'Hiervoor is bijna een heel jaar aan gegevens nodig (minstens 300 dagen).');
    const z = zonPeriode(a, van, tot, { heleMaanden: true });
    const schaal = (v, nDagen) => (nDagen ? (v * 365) / nDagen : null);
    const afname = t.dagenAfname >= 300 ? schaal(t.afname, t.dagenAfname) : null;
    const netto = t.dagenAfname >= 300 ? schaal(t.afname - t.terug, t.dagenAfname) : null;
    const totaalVerbruik = afname != null && z?.eigen != null ? afname + z.eigen : null;
    const gas = t.dagenGas >= 300 ? schaal(t.gas, t.dagenGas) : null;
    const [pS, pG] = CBS_PERSONEN[c.hhPersonen] || CBS_PERSONEN[2];
    const [wNaam, wS, wG, wKort] = CBS_WONING[c.hhWoning] || CBS_WONING.tweeondereenkap;
    const pKort = `${c.hhPersonen === '5' ? '5+' : c.hhPersonen} pers.`;
    const pNaam = `${c.hhPersonen === '5' ? '5+' : c.hhPersonen} ${c.hhPersonen === '1' ? 'persoon' : 'personen'}`;
    const vergelijk = (jij, ref) => (jij == null ? '' : `${jij > ref ? '+' : '−'}${pct(Math.abs(jij - ref) / ref)} t.o.v. ${fmtGetal(ref, 0)}`);
    const kl = (jij, ref) => (jij == null ? '' : jij <= ref ? 'is-goed' : 'is-slecht');
    const grafiekStroom = staafGrafiek({
      labels: ['Jij: totaal verbruik', 'Jij: afname van het net', `Gemiddeld ${pNaam}`, `Gemiddeld ${wNaam.toLowerCase()}`],
      korteLabels: ['Jij totaal', 'Jij net', pKort, wKort],
      waarden: [totaalVerbruik, afname, pS, wS], markeer: [false, false, true, true],
      fmt: (v, as) => (as ? fmtGetal(v, 0) : kwh(v)), naam: 'Stroom per jaar',
    });
    const grafiekGas = staafGrafiek({
      labels: ['Jij', `Gemiddeld ${pNaam}`, `Gemiddeld ${wNaam.toLowerCase()}`], korteLabels: ['Jij', pKort, wKort],
      waarden: [gas, pG, wG], markeer: [false, true, true],
      fmt: (v, as) => (as ? fmtGetal(v, 0) : m3(v)), naam: 'Gas per jaar',
    });
    return kaart('Tegenover een gemiddeld huishouden',
      h('p', { class: 'hint' }, `Jouw laatste 365 dagen (${periodeTekst(van, tot)}), naar een heel jaar omgerekend als er dagen ontbreken`),
      kpis(
        totaalVerbruik != null ? kpi('Stroom: totaal verbruik', kwh(totaalVerbruik), `afname + zelf gebruikte zonnestroom; ${vergelijk(totaalVerbruik, pS)} (${pNaam})`, kl(totaalVerbruik, pS)) : null,
        afname != null ? kpi('Stroom van het net', kwh(afname), `${vergelijk(afname, pS)} (${pNaam}); netto na teruglevering ${kwh(netto)}`, kl(afname, pS)) : null,
        gas != null ? kpi('Gas', m3(gas), `${vergelijk(gas, pG)} (${pNaam}); ${vergelijk(gas, wG)} (${wNaam.toLowerCase()})`, kl(gas, Math.min(pG, wG))) : null),
      grafiekStroom, grafiekGas,
      h('p', { class: 'hint' }, [
        'Gemiddelden van het CBS over 2025 (voorlopige cijfers) voor woningen met een gasaansluiting; de helft van de huishoudens zit eronder. ',
        'Het CBS kijkt naar levering via het net; bij huishoudens met zonnepanelen is dat lager dan wat ze echt gebruiken. Daarom staat bij jou zowel je afname van het net als je totale verbruik (inclusief zelf gebruikte zonnestroom). ',
        'Gas per woningtype is bij het CBS gecorrigeerd voor koude en zachte winters; jouw gas is het echte verbruik. Grote verbruikers zoals een elektrische auto maken je stroomverbruik hoger dan gemiddeld.',
      ].join('')));
  },
};

// ---------- 9. Opvallende dagen ----------

const opvallendSoort = {
  key: 'opvallend', groep: 'patronen',
  kort: 'Opvallende dagen',
  uitleg: 'Dagen die uit de toon vallen',
  naam: 'Opvallende dagen',
  velden: (c, wijzig) => [
    veld('Wat', keuze(c.opMaat, [['basis', 'Stroom, zonder grote verbruikers'], ['afname', 'Stroom, alles'], ['gas', 'Gas (rekening houdend met het weer)']], (v) => wijzig({ opMaat: v }))),
    veld('Gevoeligheid', keuze(c.opGevoelig, [['laag', 'Laag: alleen grote uitschieters'], ['normaal', 'Normaal'], ['hoog', 'Hoog: ook kleinere afwijkingen']], (v) => wijzig({ opGevoelig: v }))),
    veld('Welke dagen', keuze(c.opRichting, [['beide', 'Hoger en lager'], ['hoger', 'Alleen hoger'], ['lager', 'Alleen lager']], (v) => wijzig({ opRichting: v }))),
  ],
  resultaat(a, c, van, tot) {
    const gas = c.opMaat === 'gas';
    const r = opvallend(a, van, tot, { maat: c.opMaat, gevoeligheid: c.opGevoelig });
    if (!r.bekeken) return geenGegevens('Opvallende dagen', gas ? 'Geen dagen met gas, temperatuur en een stooklijn in deze periode.' : 'Te weinig dagen met stroom (er zijn 4 eerdere weken nodig om mee te vergelijken).');
    const lijst = r.dagen.filter((d) => (c.opRichting === 'hoger' ? d.verschil > 0 : c.opRichting === 'lager' ? d.verschil < 0 : true));
    const hoger = r.dagen.filter((d) => d.verschil > 0).length; const lager = r.dagen.length - hoger;
    const eenheid = gas ? (v) => m3(v, 1) : (v) => kwh(v, 1);
    const WD = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
    const rijen = lijst.slice(0, 40).map((d) => h('tr', {},
      h('td', {}, `${WD[weekday(d.datum)]} ${fmtDatumKort(d.datum)} ${d.datum.slice(0, 4)}`),
      cel(fmtGetal(d.waarde, 1)), cel(fmtGetal(d.verwacht, 1)),
      cel(`${d.verschil > 0 ? '+' : '−'}${fmtGetal(Math.abs(d.verschil), 1)}${d.rel != null ? ` (${d.verschil > 0 ? '+' : '−'}${fmtGetal(Math.abs(d.rel) * 100, 0)}%)` : ''}`, `num${d.verschil > 0 ? ' is-slecht' : ' is-goed'}`),
      cel(d.opmerking || d.hoe, 'verberg-smal')));
    return kaart(`Opvallende dagen: ${gas ? 'gas' : 'stroom'}`,
      h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${r.bekeken} dagen bekeken`),
      kpis(
        kpi('Hoger dan verwacht', String(hoger), hoger ? `grootste: ${fmtDatumKort(r.dagen.find((d) => d.verschil > 0).datum)}` : 'geen', hoger ? 'is-slecht' : ''),
        kpi('Lager dan verwacht', String(lager), lager ? `grootste: ${fmtDatumKort(r.dagen.find((d) => d.verschil < 0).datum)}` : 'geen', lager ? 'is-goed' : ''),
        kpi('Deel van de dagen', pct(r.dagen.length / r.bekeken), gas ? 'gas, gecorrigeerd voor de temperatuur' : 'stroom, tegenover dezelfde weekdag')),
      lijst.length
        ? tabel([['Dag'], [`Echt (${gas ? 'm³' : 'kWh'})`, 'num'], ['Verwacht', 'num'], ['Verschil', 'num'], ['Opmerking of vergeleken met', 'verberg-smal']], rijen)
        : h('p', { class: 'muted' }, 'Geen opvallende dagen met deze keuzes.'),
      lijst.length > 40 ? h('p', { class: 'hint' }, `De 40 grootste van ${lijst.length} dagen staan hierboven.`) : null,
      h('p', { class: 'hint' }, [
        c.opMaat === 'basis' ? `Zonder grote verbruikers: uren waarin je meer dan ${fmtGetal(UUR_MAX, 0)} kWh afnam (zoals de auto laden) tellen niet mee, zodat je ziet of er iets anders aan stond of juist uit. ` : '',
        gas
          ? 'Verwacht = wat je stooklijn (laatste 365 dagen) bij de temperatuur van die dag voorspelt. Een dag is opvallend als hij veel verder van de lijn ligt dan dagen gewoonlijk doen. Denk aan: een feestje, niet thuis, de thermostaat vergeten, of een storing. '
          : 'Verwacht = het middelste verbruik op dezelfde weekdag in de 8 weken ervoor. Een dag is opvallend als hij veel meer afwijkt dan die weekdagen onderling. Een vaste gewoonte (elke dinsdag de auto laden) valt dus niet op, een dinsdag zónder wel. ',
        `Met ${eenheid(gas ? 1 : c.opMaat === 'basis' ? 1.5 : 2)} als minimum vallen kleine verschillen weg. Tik in Historie op een dag om er een opmerking bij te zetten; die verschijnt dan hier.`,
      ].join('')));
  },
};

/** De nieuwe soorten, in de volgorde waarin ze bij hun groep staan. */
export const WATALS_SOORTEN = [opvallendSoort, tijdvakSoort, schaalSoort, zonStralingSoort, batterijSoort, dynamischSoort, warmtepompSoort, co2Soort, huishoudenSoort];
