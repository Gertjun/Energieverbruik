// Analyse: zelf een grafiek en tabel samenstellen.
// Keuzes: wat (grootheid), indeling (dag/week/maand/jaar, uur van de dag, tijdvak), periode,
// en vergelijken met vorig jaar, een andere periode of een tweede grootheid (lijn, as rechts).
// Favorieten worden in de kluis bewaard (collectie `analyses`) en dus gesynchroniseerd.

import { h, saveFile, today } from '../core/dom.js';
import { alive, newRecord, removeById } from '../core/records.js';
import { staafGrafiek } from './grafiek.js';
import { MATEN, INDELINGEN, MAX_DAGEN_PER_DAG, SNEL, past, reeks, kanPerDag, zonderUitgesloten, snelPeriode, vorigJaar, anderePeriode, vlakStroomTarief, AANSLUITING, GRENS_FASE } from './analyse.js';
import { daysBetween, fmtDatumKort } from './tijd.js';
import { kaart, veld, fmtGetal, euro } from './ui.js';
import { SOORTEN, SOORT_STANDAARD } from './analyse-soorten.js';

const VERGELIJK = [
  ['geen', 'Niets'], ['vorigjaar', 'Dezelfde periode vorig jaar'], ['periode', 'Een andere periode'], ['maat', 'Een tweede grootheid'],
];
const STANDAARD = {
  soort: 'samenstellen', weglaten: true, weergave: 'totaal', maat: 'afname', indeling: 'maand', preset: 'laatste12', van: '', tot: '', vergelijk: 'vorigjaar', van2: '', maat2: 'temp',
  ...SOORT_STANDAARD,
};
const CONFIG_VELDEN = Object.keys(STANDAARD);

const fmtWaarde = (maat, perDag = false) => (v) => {
  if (perDag && v != null) return `${fmtWaarde(maat)(v)} per dag`;
  if (v == null) return '–';
  const m = MATEN[maat];
  return m.eenheid === '€' ? euro(v) : `${fmtGetal(v, m.d)} ${m.eenheid}`;
};
const fmtAs = (maat) => (v) => {
  const a = Math.abs(v);
  const d = a === 0 || a >= 10 ? 0 : a >= 1 ? 1 : 2;
  return MATEN[maat].eenheid === '€' ? `€${fmtGetal(v, d)}` : fmtGetal(v, d);
};
const fmtCel = (maat, v) => (v == null ? '–' : MATEN[maat].eenheid === '€' ? euro(v) : fmtGetal(v, MATEN[maat].d));
const periodeTekst = (van, tot) => `${fmtDatumKort(van)} ${van.slice(0, 4)} – ${fmtDatumKort(tot)} ${tot.slice(0, 4)}`;

function maatSelect(waarde, indeling, onChange, zonder) {
  const groepen = [...new Set(Object.values(MATEN).map((m) => m.groep))];
  return h('select', { onChange: (e) => onChange(e.target.value) },
    groepen.map((g) => h('optgroup', { label: g },
      Object.entries(MATEN).filter(([k, m]) => m.groep === g && k !== zonder).map(([k, m]) => h('option', {
        value: k, selected: k === waarde, disabled: !past(k, indeling),
      }, past(k, indeling) ? m.naam : `${m.naam} (niet bij deze indeling)`)))));
}

/** Zorgt dat grootheid en indeling bij elkaar passen. */
function corrigeer(c) {
  if (!past(c.maat, c.indeling)) c.indeling = MATEN[c.maat].per.includes('maand') ? 'maand' : MATEN[c.maat].per[0];
  if (c.vergelijk === 'maat' && (!past(c.maat2, c.indeling) || c.maat2 === c.maat)) {
    c.maat2 = Object.keys(MATEN).find((k) => k !== c.maat && past(k, c.indeling)) || c.maat;
  }
}

export function renderAnalyse(a, staat, opnieuw, ctx) {
  if (!a.eerste) return [kaart('Nog geen gegevens', h('p', { class: 'muted' }, 'Lees eerst gegevens in via Invoer.'))];
  staat.analyse ??= { ...STANDAARD, favoriet: null };
  const c = staat.analyse;
  corrigeer(c);
  const wijzig = (velden) => { Object.assign(c, velden); corrigeer(c); opnieuw(); };
  const uitsluitKeus = uitsluitenDeel(a, c, wijzig, ctx);
  const volledigA = a;
  a = c.weglaten ? zonderUitgesloten(a) : a;

  // Periode
  const p = c.preset ? snelPeriode(c.preset, a) : { van: c.van || a.eerste, tot: c.tot || a.laatste };
  const van = p.van <= p.tot ? p.van : p.tot; const tot = p.van <= p.tot ? p.tot : p.van;

  const soort = SOORTEN.find((x) => x.key === c.soort) || SOORTEN[0];
  const soortKeus = veld('Soort analyse', h('select', { onChange: (e) => wijzig({ soort: e.target.value }) },
    SOORTEN.map((x) => h('option', { value: x.key, selected: x.key === soort.key }, x.naam))));
  const periodeKeus = soort.geenPeriode ? null : h('div', { class: 'field' }, h('span', {}, 'Periode'),
    h('div', { class: 'snelknoppen' }, SNEL.map(([k, t]) => h('button', {
      type: 'button', class: 'btn btn-small', 'aria-pressed': c.preset === k ? 'true' : 'false',
      onClick: () => wijzig({ preset: k }),
    }, t))),
    h('div', { class: 'field-row' },
      veld('Van', h('input', { type: 'date', value: van, min: a.eerste, onChange: (e) => { if (e.target.value) wijzig({ preset: null, van: e.target.value, tot }); } })),
      veld('Tot en met', h('input', { type: 'date', value: tot, onChange: (e) => { if (e.target.value) wijzig({ preset: null, van, tot: e.target.value }); } }))));

  if (soort.key !== 'samenstellen') {
    const keuzesAnders = kaart('Samenstellen', favorietenRegel(ctx, c, opnieuw),
      h('div', { class: 'analyse-keuzes' }, soortKeus, ...(soort.velden?.(c, wijzig, a) || [])), periodeKeus, uitsluitKeus);
    return [keuzesAnders, ...[].concat(soort.resultaat(a, c, van, tot)), uitsluitMelding(a, volledigA)];
  }

  const keuzes = kaart('Samenstellen',
    favorietenRegel(ctx, c, opnieuw),
    h('div', { class: 'analyse-keuzes' },
      soortKeus,
      veld('Wat', maatSelect(c.maat, c.indeling, (v) => wijzig({ maat: v }))),
      veld('Indeling', h('select', { onChange: (e) => wijzig({ indeling: e.target.value }) },
        INDELINGEN.map(([k, t]) => h('option', { value: k, selected: k === c.indeling, disabled: !past(c.maat, k) }, t)))),
      kanPerDag(c.maat, c.indeling) ? veld('Toon', h('select', { onChange: (e) => wijzig({ weergave: e.target.value }) },
        [['totaal', 'Totaal per periode'], ['perdag', 'Gemiddeld per dag']].map(([k, t]) => h('option', { value: k, selected: k === c.weergave }, t)))) : null,
      veld('Vergelijken met', h('select', { onChange: (e) => wijzig({ vergelijk: e.target.value }) },
        VERGELIJK.map(([k, t]) => h('option', { value: k, selected: k === c.vergelijk }, t)))),
      c.vergelijk === 'maat'
        ? veld('Tweede grootheid (lijn)', maatSelect(c.maat2, c.indeling, (v) => wijzig({ maat2: v }), c.maat))
        : null,
      c.vergelijk === 'periode'
        ? veld('Andere periode vanaf', h('input', {
          type: 'date', value: c.van2 || vorigJaar(c.indeling, van, tot).van,
          onChange: (e) => { if (e.target.value) wijzig({ van2: e.target.value }); },
        }), 'even lang als de gekozen periode')
        : null),
    periodeKeus, uitsluitKeus);

  if (c.indeling === 'dag' && daysBetween(van, tot) + 1 > MAX_DAGEN_PER_DAG) {
    return [keuzes, kaart(null, h('p', { class: 'muted' },
      `Per dag kan voor maximaal ${MAX_DAGEN_PER_DAG} dagen. Kies een kortere periode of een indeling per week of maand.`))];
  }
  return [keuzes, resultaat(a, c, van, tot), uitsluitMelding(a, volledigA)];
}

/** Korte regel onder het resultaat als er dagen zijn weggelaten. */
function uitsluitMelding(a, volledigA) {
  if (!a.weggelaten) return null;
  return h('p', { class: 'hint analyse-uitgesloten-melding' }, `${a.weggelaten} ${a.weggelaten === 1 ? 'dag' : 'dagen'} in uitgesloten perioden ${a.weggelaten === 1 ? 'is' : 'zijn'} weggelaten (${volledigA.uitgesloten.map((u) => periodeTekst(u.van, u.tot)).join('; ')}).`);
}

/** Beheer van uitgesloten perioden (gesynchroniseerd) en de keuze om ze weg te laten. */
function uitsluitenDeel(a, c, wijzig, ctx) {
  const lijst = a.uitgesloten;
  const van = h('input', { type: 'date', min: a.eerste || undefined });
  const tot = h('input', { type: 'date', min: a.eerste || undefined });
  const reden = h('input', { type: 'text', maxlength: 80, placeholder: 'bijv. huis leeg, verbouwing', autocomplete: 'off' });
  return h('details', { class: 'uitleg uitsluiten', open: staatOpen.uitsluiten || null, onToggle: (e) => { staatOpen.uitsluiten = e.target.open; } },
    h('summary', {}, `Uitgesloten perioden${lijst.length ? ` (${lijst.length})` : ''}`),
    h('p', { class: 'hint' }, 'Perioden die niet representatief zijn (huis leeg, verbouwing, panelen uit) kun je hier uitsluiten. Analyse laat die dagen dan weg, alsof er niets gemeten is, ook in vergelijkingen met vorig jaar. Historie en Overzicht tonen ze gewoon. Wordt gesynchroniseerd.'),
    lijst.length ? h('label', { class: 'check-regel' },
      h('input', { type: 'checkbox', checked: !!c.weglaten, onChange: (e) => wijzig({ weglaten: e.target.checked }) }),
      h('span', {}, 'Uitgesloten perioden weglaten in de analyse')) : null,
    lijst.length ? h('ul', { class: 'uitsluit-lijst' }, lijst.map((u) => h('li', {},
      h('span', {}, h('strong', {}, periodeTekst(u.van, u.tot)), u.reden ? ` · ${u.reden}` : ''),
      h('button', {
        type: 'button', class: 'btn btn-small', 'aria-label': `Uitsluiting ${periodeTekst(u.van, u.tot)} verwijderen`,
        onClick: async () => {
          if (!ctx.confirm(`Uitsluiting ${periodeTekst(u.van, u.tot)} verwijderen?`)) return;
          await ctx.update((d) => { removeById(d.uitgesloten, u.id); });
        },
      }, 'Verwijderen')))) : null,
    h('div', { class: 'uitsluit-nieuw' },
      veld('Van', van), veld('Tot en met', tot), veld('Reden (optioneel)', reden),
      h('button', {
        type: 'button', class: 'btn',
        onClick: async () => {
          if (!van.value || !tot.value) { ctx.toast('Vul een begin- en einddatum in.', 'error'); return; }
          const [v, t] = van.value <= tot.value ? [van.value, tot.value] : [tot.value, van.value];
          await ctx.update((d) => { d.uitgesloten ??= []; d.uitgesloten.push(newRecord({ van: v, tot: t, reden: reden.value.trim() })); });
          ctx.toast('Periode uitgesloten', 'ok');
        },
      }, 'Periode uitsluiten')));
}
const staatOpen = {};

function resultaat(a, c, van, tot) {
  const perDag = c.weergave === 'perdag';
  const r = reeks(a, c.maat, c.indeling, van, tot, perDag);
  let r2 = null; let naam2 = null; let van2 = null; let tot2 = null;
  if (c.vergelijk === 'vorigjaar' || c.vergelijk === 'periode') {
    ({ van: van2, tot: tot2 } = c.vergelijk === 'vorigjaar'
      ? vorigJaar(c.indeling, van, tot)
      : anderePeriode(van, tot, c.van2 || vorigJaar(c.indeling, van, tot).van));
    r2 = reeks(a, c.maat, c.indeling, van2, tot2, perDag);
    naam2 = c.vergelijk === 'vorigjaar' ? 'Vorig jaar' : 'Andere periode';
  } else if (c.vergelijk === 'maat') {
    r2 = reeks(a, c.maat2, c.indeling, van, tot, perDag);
  }
  const lijnMaat = c.vergelijk === 'maat';
  const eh = (maat, rr) => `${MATEN[maat].eenheid}${rr?.perDag ? ' per dag' : ''}`;
  const n = r.vakjes.length;
  const w2 = (i) => (r2 ? r2.vakjes[i]?.v ?? null : null);

  const m = MATEN[c.maat];
  const grafiek = n ? staafGrafiek({
    labels: r.vakjes.map((v) => v.label),
    korteLabels: r.vakjes.map((v) => v.kort),
    waarden: r.vakjes.map((v) => v.v),
    markeer: r.vakjes.map((v) => !!v.geschat),
    vergelijk: r2 && !lijnMaat ? r.vakjes.map((_, i) => w2(i)) : null,
    lijn: lijnMaat ? { waarden: r.vakjes.map((_, i) => w2(i)), fmt: (v, as) => (as ? fmtAs(c.maat2)(v) : fmtWaarde(c.maat2, r2.perDag)(v)), naam: MATEN[c.maat2].naam } : null,
    fmt: (v, as) => (as ? fmtAs(c.maat)(v) : fmtWaarde(c.maat, r.perDag)(v)),
    grens: c.maat === 'piek' ? { waarde: GRENS_FASE, naam: `${AANSLUITING.ampere} A per fase` }
      : c.maat === 'piekSom' ? { waarde: GRENS_FASE * AANSLUITING.fasen, naam: `${AANSLUITING.fasen}×${AANSLUITING.ampere} A` } : null,
    naam: lijnMaat ? m.naam : periodeTekst(van, tot),
    vergelijkNaam: r2 && !lijnMaat ? periodeTekst(van2, tot2) : 'Vorig jaar',
  }) : h('p', { class: 'muted' }, 'Geen gegevens in deze periode.');

  // Tabel
  const kop = [h('th', {}, c.indeling === 'uur' ? 'Uur' : c.indeling === 'tijdvak' ? 'Tijdvak' : c.indeling === 'weekdag' ? 'Dag' : 'Periode'),
    h('th', { class: 'num' }, `${lijnMaat ? m.naam : 'Waarde'} (${eh(c.maat, r)})`)];
  if (r2 && !lijnMaat) kop.push(h('th', { class: 'num' }, `${naam2} (${eh(c.maat, r)})`), h('th', { class: 'num' }, 'Verschil'), h('th', { class: 'num verberg-smal' }, '%'));
  if (lijnMaat) kop.push(h('th', { class: 'num' }, `${MATEN[c.maat2].naam} (${eh(c.maat2, r2)})`));

  const cellen = (v, geschat, v2) => {
    const out = [h('td', { class: `num${geschat ? ' is-geschat' : ''}` }, fmtCel(c.maat, v))];
    if (r2 && !lijnMaat) {
      const versch = v != null && v2 != null ? v - v2 : null;
      const pct = versch != null && v2 ? versch / Math.abs(v2) : null;
      out.push(h('td', { class: 'num' }, fmtCel(c.maat, v2)),
        h('td', { class: 'num' }, versch == null ? '–' : `${versch > 0 ? '+' : ''}${fmtCel(c.maat, versch)}`),
        h('td', { class: 'num verberg-smal' }, pct == null ? '–' : `${pct > 0 ? '+' : ''}${fmtGetal(pct * 100, 0)}%`));
    }
    if (lijnMaat) out.push(h('td', { class: 'num' }, fmtCel(c.maat2, v2)));
    return out;
  };
  const totaalRij = h('tr', { class: 'jaar-rij' }, h('th', { scope: 'row' }, r.totaal.label),
    cellen(r.totaal.v, r.totaal.geschat, r2 ? r2.totaal.v : null));
  const rijen = r.vakjes.map((vk, i) => h('tr', {}, h('td', {}, vk.label), cellen(vk.v, vk.geschat, w2(i))));
  // Extra samenvattende regels (bijv. werkdagen en weekend), direct onder het totaal.
  const extraRijen = (r.extra || []).map((x, i) => h('tr', { class: 'extra-rij' }, h('th', { scope: 'row' }, x.label),
    cellen(x.v, x.geschat, r2?.extra?.[i]?.v ?? null)));
  const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-analyse' },
    h('thead', {}, h('tr', {}, kop)), h('tbody', {}, totaalRij, extraRijen, rijen)));

  const csvKnop = h('button', {
    class: 'btn', type: 'button', disabled: !n,
    onClick: () => saveFile(`analyse-${c.maat}-${c.indeling}-${today()}.csv`, csv(c, r, r2, naam2, lijnMaat), 'text/csv'),
  }, 'Tabel als CSV');

  const titel = lijnMaat
    ? `${m.naam} en ${MATEN[c.maat2].naam.toLowerCase()}`
    : m.naam;
  const hints = ['Cursieve waarden zijn (deels) geschat.'];
  if (c.indeling === 'uur') hints.push('Per uur = gemiddelde per dag over de gekozen periode; dagen zonder uurdata volgen het gemiddelde uurprofiel.');
  if (r.perDag) hints.push('Gemiddeld per dag = totaal gedeeld door het aantal dagen met gegevens in die periode. Zo zijn een korte maand, een onvolledige week of een periode met ontbrekende dagen eerlijk te vergelijken.');
  if (c.indeling === 'weekdag') hints.push(`Per dag van de week = gemiddelde per dag over de gekozen periode${MATEN[c.maat].agg === 'max' ? ' (piekvermogen: de hoogste)' : c.maat === 'basis' ? ' (sluipverbruik: de mediaan)' : ''}. Feestdagen tellen als gewone weekdag.`);
  if (c.indeling === 'tijdvak') hints.push('Tijdvakken die in de periode niet voorkomen (bijv. zomer in januari) blijven leeg.');
  if ([c.maat, c.maat2].includes('gasPerGd')) hints.push('Gas per graaddag alleen bij voldoende graaddagen (dag 1, week 3, maand/jaar 5).');
  if (c.maat === 'piek' || c.maat === 'piekSom') {
    const grens = c.maat === 'piek' ? GRENS_FASE : GRENS_FASE * AANSLUITING.fasen;
    const boven = r.vakjes.filter((vk) => vk.v != null && vk.v > grens).length;
    hints.push(`Piekvermogen komt uit de HomeWizard-export: het hoogste vermogen per kwartier${c.maat === 'piek' ? ' op de zwaarst belaste fase' : ', van de drie fasen opgeteld (de pieken kunnen binnen het kwartier op verschillende momenten vallen, dus dit is een bovengrens)'}. De rode lijn is wat je aansluiting (${AANSLUITING.fasen}×${AANSLUITING.ampere} A) continu aankan: ${fmtGetal(grens, 0)} W. Een korte piek erboven is normaal; een zekering slaat pas bij langere overbelasting door.${boven ? ` In ${boven} ${boven === 1 ? 'periode' : 'perioden'} kwam de piek erboven.` : ''} Teruglevering telt niet mee. Dagen zonder HomeWizard-gegevens blijven leeg; lees de HomeWizard-export opnieuw in voor de pieken van eerdere dagen.`);
    if (r.totaal.wanneer) hints.push(`Hoogste piek: ${fmtGetal(r.totaal.v, 0)} W op ${fmtDatumKort(r.totaal.wanneer)} ${r.totaal.wanneer.slice(0, 4)}${c.maat === 'piek' ? ` om ${a.perDag.get(r.totaal.wanneer).dag.piek.t}` : ''}.`);
  }
  if (c.maat === 'basis' && r.totaal.v != null) {
    const kwh = (r.totaal.v * 8760) / 1000; const tarief = vlakStroomTarief(a, tot);
    hints.push(`Sluipverbruik = laagste uurverbruik tussen 00:00 en 05:00 (dan schijnt de zon niet), alleen voor dagen met uurgegevens. Per week, maand of jaar de mediaan van de dagen, zodat een nacht met bijvoorbeeld de auto aan de lader niet meetelt. ${fmtGetal(r.totaal.v, 0)} W is ongeveer ${fmtGetal(kwh, 0)} kWh per jaar${tarief ? `, zo'n ${euro(kwh * tarief)} per jaar` : ''}.`);
  } else if (c.maat2 === 'basis' && c.vergelijk === 'maat') {
    hints.push('Sluipverbruik = laagste uurverbruik tussen 00:00 en 05:00, alleen voor dagen met uurgegevens; per week/maand/jaar de mediaan.');
  }
  if (c.vergelijk === 'vorigjaar' && ['dag', 'week'].includes(c.indeling)) hints.push('Vorig jaar = 52 weken eerder, zodat dezelfde weekdagen naast elkaar staan.');

  return kaart(titel,
    h('p', { class: 'hint' }, `${periodeTekst(van, tot)} · ${INDELINGEN.find(([k]) => k === c.indeling)[1].toLowerCase()}`),
    grafiek, tabel,
    h('div', { class: 'button-row' }, csvKnop),
    h('p', { class: 'hint' }, hints.join(' ')));
}

function csv(c, r, r2, naam2, lijnMaat) {
  const getal = (maat, v) => (v == null ? '' : v.toFixed(Math.max(MATEN[maat].d, 2)).replace('.', ','));
  const eh = (maat, rr) => `${MATEN[maat].eenheid}${rr?.perDag ? ' per dag' : ''}`;
  const kop = ['Periode', `${MATEN[c.maat].naam} (${eh(c.maat, r)})`];
  if (r2 && !lijnMaat) kop.push(`${naam2} (${eh(c.maat, r)})`);
  if (lijnMaat) kop.push(`${MATEN[c.maat2].naam} (${eh(c.maat2, r2)})`);
  const regel = (label, v, v2) => [label, getal(c.maat, v), ...(r2 ? [getal(lijnMaat ? c.maat2 : c.maat, v2)] : [])];
  const regels = [kop, ...r.vakjes.map((vk, i) => regel(vk.label, vk.v, r2?.vakjes[i]?.v)), regel(r.totaal.label, r.totaal.v, r2?.totaal.v),
    ...(r.extra || []).map((x, i) => regel(x.label, x.v, r2?.extra?.[i]?.v))];
  return `﻿${regels.map((rij) => rij.map((x) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(';')).join('\r\n')}\r\n`;
}

// ---------- Favorieten ----------

/** De keuzes die een favoriet bepalen; velden die niet meedoen worden leeggemaakt. */
function configVan(c) {
  const out = Object.fromEntries(CONFIG_VELDEN.map((k) => [k, c[k] ?? STANDAARD[k]]));
  if (out.preset) { out.van = ''; out.tot = ''; }
  if (out.vergelijk !== 'periode') out.van2 = '';
  if (out.vergelijk !== 'maat') out.maat2 = STANDAARD.maat2;
  return out;
}
const zelfde = (x, y) => JSON.stringify(configVan(x)) === JSON.stringify(configVan(y));

function favorietenRegel(ctx, c, opnieuw) {
  const lijst = alive(ctx.data.analyses || []).sort((x, y) => (x.naam || '').localeCompare(y.naam || '', 'nl'));
  return h('div', { class: 'favorieten' },
    lijst.map((f) => h('span', { class: `favoriet${zelfde(f.config || {}, c) ? ' is-actief' : ''}` },
      h('button', { type: 'button', title: 'Openen', onClick: () => { Object.assign(c, STANDAARD, f.config); opnieuw(); } }, f.naam),
      h('button', {
        type: 'button', 'aria-label': `Favoriet ${f.naam} verwijderen`, title: 'Verwijderen',
        onClick: async () => {
          if (!ctx.confirm(`Favoriet "${f.naam}" verwijderen?`)) return;
          await ctx.update((d) => { removeById(d.analyses, f.id); });
        },
      }, '✕'))),
    h('button', {
      class: 'btn btn-small', type: 'button',
      onClick: async () => {
        const sd = SOORTEN.find((x) => x.key === c.soort);
        const voorstel = sd && sd.key !== 'samenstellen' ? sd.naam : `${MATEN[c.maat].naam} ${INDELINGEN.find(([k]) => k === c.indeling)[1].toLowerCase()}`;
        const naam = window.prompt('Naam van deze favoriet:', voorstel)?.trim();
        if (!naam) return;
        await ctx.update((d) => { d.analyses ??= []; d.analyses.push(newRecord({ naam, config: configVan(c) })); });
        ctx.toast('Favoriet bewaard', 'ok');
      },
    }, '☆ Bewaar als favoriet'));
}
