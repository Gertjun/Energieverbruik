// Historie → Maanden en Controle, plus het importrapport (ook getoond direct na een import).

import { h, formatWhen } from '../core/dom.js';
import { dagId } from './model.js';
import { maakImportOngedaan, bronNaam } from './importeren.js';
import {
  controleer, ontbrekendPerSoort, maandTotalen, vergelijkPeriode, steekproef, vingerafdruk,
  MAAT_NAAM,
} from './controle.js';
import { addDays, fmtDag, fmtDatumKort, fmtMaand, monthKey, daysBetween } from './tijd.js';
import { kaart, veld, fmtGetal, fmtKwh, fmtM3, fmtPct, leesGetal } from './ui.js';

const SOORT_NAAM = {
  'vattenfall-stroom': 'Vattenfall stroom', 'vattenfall-gas': 'Vattenfall gas',
  'homewizard-stroom': 'HomeWizard stroom', 'homewizard-gas': 'HomeWizard gas', excel: 'Excel',
  solaredge: 'SolarEdge opbrengst',
};
const fmtMaat = (maat, v, d) => (maat === 'gas' ? fmtM3(v, d ?? 2) : fmtKwh(v, d ?? 1));
/** Dag ('yyyy-mm-dd') of maand ('yyyy-mm') leesbaar, met jaartal. */
const jaarErbij = (iso) => (iso.length === 7 ? fmtMaand(iso) : `${fmtDatumKort(iso)} ${iso.slice(0, 4)}`);

/** Naar een dag in Historie → Dagen springen (opent de dag bovenaan). */
export function naarDag(staat, opnieuw, datum) {
  staat.tab = 'historie';
  staat.historieWeergave = 'dagen';
  staat.historieMaand = monthKey(datum);
  staat.open = datum;
  opnieuw();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const dagKnop = (staat, opnieuw, datum, tekst) => h('button', {
  type: 'button', class: 'link-knop', onClick: () => naarDag(staat, opnieuw, datum),
}, tekst ?? jaarErbij(datum));

// =============================================================
//  Maanden: totalen om naast je Excel (SOM per maand) te leggen
// =============================================================

export function renderMaanden(a) {
  const jaren = maandTotalen(a);
  if (!jaren.length) return [kaart('Nog geen gegevens', h('p', { class: 'muted' }, 'Lees eerst gegevens in via Invoer.'))];
  const dagenCel = (n, totaal) => h('td', { class: `num verberg-smal${n && n < totaal ? ' is-onvolledig' : ''}` }, n ? `${n}/${totaal}` : '–');
  const rijen = [];
  for (const j of jaren) {
    rijen.push(h('tr', { class: 'jaar-rij' },
      h('th', { scope: 'row' }, j.jaar),
      h('td', { class: 'num' }, j.dagenStroom ? fmtGetal(j.afname, 1) : '–'),
      h('td', { class: 'num' }, j.dagenStroom ? fmtGetal(j.terug, 1) : '–'),
      h('td', { class: 'num' }, j.dagenGas ? fmtGetal(j.gas, 2) : '–'),
      h('td', { class: 'num verberg-smal' }, ''), h('td', { class: 'num verberg-smal' }, '')));
    for (const m of j.maanden) {
      rijen.push(h('tr', {},
        h('td', { class: 'maand-naam' }, fmtMaand(m.maand)),
        h('td', { class: 'num' }, m.dagenStroom ? fmtGetal(m.afname, 1) : '–'),
        h('td', { class: 'num' }, m.dagenStroom ? fmtGetal(m.terug, 1) : '–'),
        h('td', { class: 'num' }, m.dagenGas ? fmtGetal(m.gas, 2) : '–'),
        dagenCel(m.dagenStroom, m.dagenInMaand), dagenCel(m.dagenGas, m.dagenInMaand)));
    }
  }
  return [kaart('Totalen per maand',
    h('p', { class: 'hint' }, 'Leg deze getallen naast een SOM per maand in je Excel. Komen ze overeen, dan is de import goed gegaan. De laatste kolommen tonen voor hoeveel dagen er stroom en gas is (oranje = niet de hele maand).'),
    h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-maanden' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Maand'), h('th', { class: 'num' }, 'kWh'), h('th', { class: 'num' }, 'terug'), h('th', { class: 'num' }, 'm³'),
        h('th', { class: 'num verberg-smal' }, 'dagen kWh'), h('th', { class: 'num verberg-smal' }, 'dagen m³'))),
      h('tbody', {}, rijen))))];
}

// =============================================================
//  Controle
// =============================================================

export function renderControle(a, staat, opnieuw, ctx) {
  const importen = (ctx.data.importen || []).filter((i) => !i.deleted).sort((x, y) => y.createdAt - x.createdAt);
  if (!a.eerste && !importen.length) return [kaart('Nog geen gegevens', h('p', { class: 'muted' }, 'Lees eerst gegevens in via Invoer.'))];
  const c = controleer(a);
  const ontbrekend = ontbrekendPerSoort(a);
  return [
    samenvattingKaart(c, ontbrekend),
    c.lijst.length ? meldingenKaart(a, c, staat, opnieuw, ctx) : null,
    ontbrekendKaart(ontbrekend, staat, opnieuw),
    vergelijkKaart(a, staat, opnieuw),
    steekproefKaart(a, staat, opnieuw),
    importenKaart(importen, staat, opnieuw, ctx),
  ];
}

function samenvattingKaart(c, ontbrekend) {
  const fouten = c.lijst.filter((b) => b.ernst === 'fout').length;
  const letOp = c.lijst.length - fouten;
  const regel = (soort, o) => {
    if (!o.eerste) return h('li', {}, `${soort}: nog geen gegevens.`);
    return h('li', { class: o.totaal ? 'is-waarschuwing' : null },
      `${soort}: ${jaarErbij(o.eerste)} t/m ${jaarErbij(o.laatste)}, `,
      o.totaal ? `${o.totaal} dag${o.totaal === 1 ? '' : 'en'} ontbreken.` : 'geen dagen ontbreken.');
  };
  return kaart('Samenvatting',
    h('ul', { class: 'controle-samen' },
      h('li', { class: fouten ? 'is-slecht' : c.lijst.length ? 'is-waarschuwing' : 'is-goed' },
        c.lijst.length
          ? `${c.lijst.length} melding${c.lijst.length === 1 ? '' : 'en'}: ${fouten} waarschijnlijk fout, ${letOp} om na te kijken.`
          : 'Geen verdachte waarden gevonden.',
        c.afgevinkt ? h('span', { class: 'muted' }, ` (${c.afgevinkt} eerder afgevinkt)`) : null),
      regel('Stroom', ontbrekend.stroom),
      regel('Gas', ontbrekend.gas)),
    h('p', { class: 'hint' }, 'De app zoekt naar negatieve waarden, dagen die veel hoger zijn dan de dagen eromheen, veel gas voor de temperatuur, teruglevering ’s nachts, reeksen nullen en uurwaarden die niet optellen tot het dagtotaal.'));
}

function meldingenKaart(a, c, staat, opnieuw, ctx) {
  const max = staat.alleMeldingen ? c.lijst.length : 15;
  const items = c.lijst.slice(0, max).map((b) => {
    const dag = a.perDag.get(b.datum)?.dag;
    return h('li', { class: 'melding' },
      h('div', { class: 'melding-kop' },
        h('span', { class: `badge ${b.ernst === 'fout' ? 'badge-fout' : 'badge-letop'}` }, b.ernst === 'fout' ? 'fout?' : 'let op'),
        dagKnop(staat, opnieuw, b.datum, b.tot ? `${jaarErbij(b.datum)} t/m ${jaarErbij(b.tot)}` : null)),
      h('p', {}, b.tekst),
      dag?.opmerking ? h('p', { class: 'hint' }, `Opmerking: ${dag.opmerking}`) : null,
      h('div', { class: 'button-row' },
        h('button', {
          type: 'button', class: 'btn btn-small btn-ghost',
          onClick: () => vinkAf(ctx, b.tot ? daysBetween(b.datum, b.tot) + 1 : 1, b.datum),
        }, 'Klopt, niet meer melden')));
  });
  return kaart(`Meldingen (${c.lijst.length})`,
    h('p', { class: 'hint' }, 'Tik op de datum om de dag te bekijken of te corrigeren. Klopt de waarde wel (bijvoorbeeld de auto geladen of op vakantie), vink de melding dan af. Verandert de waarde later, dan komt de melding terug.'),
    h('ul', { class: 'melding-lijst' }, items),
    c.lijst.length > max || staat.alleMeldingen
      ? h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { staat.alleMeldingen = !staat.alleMeldingen; opnieuw(); } },
        staat.alleMeldingen ? 'Minder tonen' : `Alle ${c.lijst.length} meldingen tonen`)
      : null);
}

/** Melding afvinken: de huidige waarden van de dag(en) gelden als gecontroleerd. */
export async function vinkAf(ctx, aantal, van) {
  await ctx.update((data) => {
    for (let i = 0; i < aantal; i++) {
      const rec = data.dagen.find((r) => r.id === dagId(addDays(van, i)) && !r.deleted);
      if (rec) { rec.gecontroleerd = vingerafdruk(rec); rec.updatedAt = Date.now(); }
    }
  });
  ctx.toast('Afgevinkt', 'ok');
}

function ontbrekendKaart(ontbrekend, staat, opnieuw) {
  const blok = (soort, o) => {
    if (!o.eerste) return null;
    if (!o.reeksen.length) return h('p', { class: 'is-goed' }, `${soort}: compleet.`);
    return h('div', {},
      h('p', {}, h('strong', {}, `${soort}: `), `${o.totaal} dag${o.totaal === 1 ? '' : 'en'} in ${o.reeksen.length} stuk${o.reeksen.length === 1 ? '' : 'ken'}`),
      h('ul', { class: 'gat-lijst' }, o.reeksen.slice(0, 20).map((r) => h('li', {},
        dagKnop(staat, opnieuw, r.van, r.van === r.tot ? jaarErbij(r.van) : `${jaarErbij(r.van)} t/m ${jaarErbij(r.tot)}`),
        r.dagen > 1 ? h('span', { class: 'muted' }, ` (${r.dagen} dagen)`) : null))),
      o.reeksen.length > 20 ? h('p', { class: 'hint' }, `… en nog ${o.reeksen.length - 20} stukken.`) : null);
  };
  return kaart('Ontbrekende dagen',
    h('p', { class: 'hint' }, 'Dagen zonder gegevens tussen de eerste en laatste dag. Vul ze aan met een nieuwe Vattenfall- of HomeWizard-export, of handmatig via Invoer.'),
    blok('Stroom', ontbrekend.stroom), blok('Gas', ontbrekend.gas));
}

function vergelijkKaart(a, staat, opnieuw) {
  const v = (staat.vergelijk ??= { van: a.eerste ? addDays(a.laatste, -364) : '', tot: a.laatste || '', afname: '', terug: '', gas: '' });
  if (v.van && a.eerste && v.van < a.eerste) v.van = a.eerste;
  const f = {
    van: h('input', { type: 'date', value: v.van, required: true }),
    tot: h('input', { type: 'date', value: v.tot, required: true }),
    afname: h('input', { inputmode: 'decimal', autocomplete: 'off', value: v.afname, placeholder: 'kWh' }),
    terug: h('input', { inputmode: 'decimal', autocomplete: 'off', value: v.terug, placeholder: 'kWh' }),
    gas: h('input', { inputmode: 'decimal', autocomplete: 'off', value: v.gas, placeholder: 'm³' }),
  };
  let uitkomst = null;
  if (v.resultaat) {
    const OORDEEL = { goed: ['is-goed', 'klopt'], klein: ['is-waarschuwing', 'klein verschil'], groot: ['is-slecht', 'groot verschil'], onbekend: ['muted', ''] };
    uitkomst = h('div', { class: 'stack' },
      h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { class: 'num' }, 'App'), h('th', { class: 'num' }, 'Opgegeven'), h('th', { class: 'num' }, 'Verschil'), h('th', {}, ''))),
        h('tbody', {}, v.resultaat.map((r) => h('tr', {},
          h('td', {}, MAAT_NAAM[r.maat]),
          h('td', { class: 'num' }, fmtMaat(r.maat, r.app, 0)),
          h('td', { class: 'num' }, fmtMaat(r.maat, r.ander, 0)),
          h('td', { class: 'num' }, `${r.verschil > 0 ? '+' : ''}${fmtGetal(r.verschil, r.maat === 'gas' ? 1 : 0)}${r.pct != null ? ` (${r.pct > 0 ? '+' : ''}${fmtPct(r.pct)})` : ''}`),
          h('td', { class: OORDEEL[r.oordeel][0] }, OORDEEL[r.oordeel][1])))))),
      v.resultaat.some((r) => r.ontbreekt)
        ? h('p', { class: 'hint is-waarschuwing' }, `In deze periode ontbreken dagen (${v.resultaat.filter((r) => r.ontbreekt).map((r) => `${MAAT_NAAM[r.maat].toLowerCase()}: ${r.ontbreekt}`).join(', ')}). Dan ligt het app-totaal lager; vul die dagen eerst aan.`)
        : null);
  }
  return kaart('Vergelijken met jaarafrekening of meterstanden',
    h('p', { class: 'hint' }, 'Vul het verbruik in van je jaarafrekening, of het verschil tussen twee meterstanden (normaal + dal opgeteld). De app telt zijn dagwaarden over dezelfde periode op. Binnen 1% is goed.'),
    h('form', {
      class: 'stack',
      onSubmit: (e) => {
        e.preventDefault();
        Object.assign(v, { van: f.van.value, tot: f.tot.value, afname: f.afname.value, terug: f.terug.value, gas: f.gas.value });
        if (!v.van || !v.tot || v.tot < v.van) { v.resultaat = null; v.fout = 'Kies een geldige periode.'; opnieuw(); return; }
        const opgegeven = { afname: leesGetal(v.afname), terug: leesGetal(v.terug), gas: leesGetal(v.gas) };
        if (Object.values(opgegeven).some((x) => Number.isNaN(x))) { v.resultaat = null; v.fout = 'Vul geldige getallen in.'; opnieuw(); return; }
        if (Object.values(opgegeven).every((x) => x == null)) { v.resultaat = null; v.fout = 'Vul minstens één waarde in.'; opnieuw(); return; }
        v.fout = null;
        v.resultaat = vergelijkPeriode(a, v.van, v.tot, opgegeven);
        opnieuw();
      },
    },
    h('div', { class: 'field-row' }, veld('Van', f.van), veld('Tot en met', f.tot)),
    h('div', { class: 'field-row drie' }, veld('Stroom (kWh)', f.afname), veld('Terug (kWh)', f.terug), veld('Gas (m³)', f.gas)),
    h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Vergelijken')),
    v.fout ? h('p', { class: 'form-error' }, v.fout) : null),
    uitkomst);
}

function steekproefKaart(a, staat, opnieuw) {
  if (!a.eerste) return null;
  staat.steekproefSeed ??= Math.floor(Math.random() * 1e9);
  const lijst = steekproef(a, staat.steekproefSeed);
  return kaart('Steekproef',
    h('p', { class: 'hint' }, 'Zoek deze dagen op in Mijn Vattenfall, je Excel of de HomeWizard-app en vergelijk de getallen. Naast willekeurige dagen staan er lastige dagen tussen: de eerste en laatste dag en de wissel van zomer- en wintertijd.'),
    h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Dag'), h('th', { class: 'num' }, 'kWh'), h('th', { class: 'num' }, 'terug'), h('th', { class: 'num' }, 'm³'), h('th', { class: 'verberg-smal' }, 'Waarom'))),
      h('tbody', {}, lijst.map(({ datum, reden }) => {
        const d = a.perDag.get(datum).dag;
        return h('tr', {},
          h('td', {}, dagKnop(staat, opnieuw, datum, `${fmtDag(datum)} ${datum.slice(0, 4)}`)),
          h('td', { class: 'num' }, fmtGetal(d.afname, 3)),
          h('td', { class: 'num' }, fmtGetal(d.terug, 3)),
          h('td', { class: 'num' }, fmtGetal(d.gas, 3)),
          h('td', { class: 'verberg-smal muted' }, reden));
      })))),
    h('div', { class: 'button-row' }, h('button', {
      type: 'button', class: 'btn', onClick: () => { staat.steekproefSeed = Math.floor(Math.random() * 1e9); opnieuw(); },
    }, 'Andere dagen')));
}

function importenKaart(importen, staat, opnieuw, ctx) {
  return kaart('Imports',
    importen.length
      ? h('p', { class: 'hint' }, 'Alle keren dat je een bestand hebt ingelezen, nieuwste eerst. Tik op een import voor het rapport. De laatste 10 imports kun je ongedaan maken.')
      : h('p', { class: 'hint' }, 'Imports vanaf versie 1.1.0 verschijnen hier met een rapport. Gegevens die eerder zijn ingelezen, worden hierboven wel gecontroleerd.'),
    importen.map((imp) => h('details', { class: 'import-item', open: staat.openImport === imp.id },
      h('summary', {},
        h('strong', {}, SOORT_NAAM[imp.soort] || imp.soort),
        h('span', { class: 'muted' }, ` · ${formatWhen(imp.createdAt)}`),
        imp.ongedaan ? h('span', { class: 'badge' }, 'teruggedraaid') : null),
      importRapport(imp, staat, opnieuw, ctx))));
}

// =============================================================
//  Importrapport
// =============================================================

export function importRapport(imp, staat, opnieuw, ctx, { metLink = false } = {}) {
  const r = imp.rapport || {};
  const tal = (n, enkel, meer) => `${fmtGetal(n, 0)} ${n === 1 ? enkel : meer}`;
  const zon = imp.soort === 'solaredge';
  const eenh = zon ? ['maand', 'maanden'] : ['dag', 'dagen'];
  const getallen = [
    ['In bestand', zon ? tal(r.maandenInBestand || 0, ...eenh) : r.dagenInBestand != null ? tal(r.dagenInBestand, 'dag', 'dagen') : '–'],
    ['Nieuw', tal(r.nieuw || 0, ...eenh)],
    ['Bijgewerkt', tal(r.gewijzigd || 0, ...eenh)],
    ['Al gelijk', tal(r.gelijk || 0, ...eenh)],
  ];
  if (imp.soort === 'excel' || r.voorrang) {
    getallen.push(['Betere bron ging voor', tal(r.voorrang || 0, 'dag', 'dagen')]);
  }
  if (r.uurverdeling) getallen.push(['Uurverdeling aangevuld', tal(r.uurverdeling, 'dag', 'dagen')]);
  if (imp.soort === 'excel') {
    getallen.push(['Temperaturen', tal(r.weer || 0, 'dag', 'dagen')]);
    getallen.push(['Maanden (termijn/zon)', fmtGetal(r.maanden || 0, 0)]);
  }

  const zonJaren = Object.entries(r.zonPerJaar || {}).sort();
  const zonTotalen = zonJaren.length ? h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Opbrengst in bestand'), h('th', { class: 'num' }, 'kWh'))),
    h('tbody', {}, zonJaren.map(([j, v]) => h('tr', {}, h('td', {}, j), h('td', { class: 'num' }, fmtGetal(v, 0))))))) : null;
  const jaren = Object.entries(r.totalen || {}).sort();
  const metStroom = jaren.some(([, t]) => t.dagenStroom); const metGas = jaren.some(([, t]) => t.dagenGas);
  const totalen = jaren.length && (metStroom || metGas) ? h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Totaal in bestand'),
      metStroom ? [h('th', { class: 'num' }, 'kWh'), h('th', { class: 'num' }, 'terug')] : null,
      metGas ? h('th', { class: 'num' }, 'm³') : null)),
    h('tbody', {}, jaren.map(([j, t]) => h('tr', {},
      h('td', {}, j),
      metStroom ? [
        h('td', { class: 'num' }, t.dagenStroom ? `${fmtGetal(t.afname, 1)}` : '–'),
        h('td', { class: 'num' }, t.dagenStroom ? `${fmtGetal(t.terug, 1)}` : '–')] : null,
      metGas ? h('td', { class: 'num' }, t.dagenGas ? fmtGetal(t.gas, 2) : '–') : null))))) : null;

  const lijstjes = [];
  for (const o of r.overgeslagen || []) {
    lijstjes.push(h('li', { class: 'is-waarschuwing' }, `${o.reden}: ${o.aantal}.`,
      o.voorbeelden?.length ? h('span', { class: 'muted' }, ` Bijvoorbeeld ${o.voorbeelden.map((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? jaarErbij(v) : v)).join('; ')}.`) : null));
  }
  for (const m of r.meldingen || []) lijstjes.push(h('li', { class: 'is-waarschuwing' }, m));
  if (r.dubbeleTijden) lijstjes.push(h('li', { class: 'muted' }, `${r.dubbeleTijden} tijdstip(pen) kwam(en) twee keer voor; bij de overgang naar wintertijd is dat normaal. Het dubbele uur telt volledig mee.`));
  for (const [soort, dagen] of Object.entries(r.ontbrekend || {})) {
    if (!dagen?.length) continue;
    lijstjes.push(h('li', { class: 'is-waarschuwing' }, `In het bestand ontbreken ${tal(dagen.length, 'dag', 'dagen')} ${soort}`,
      h('span', { class: 'muted' }, `: ${dagen.slice(0, 5).map(jaarErbij).join(', ')}${dagen.length > 5 ? ' …' : ''}.`)));
  }
  if (!lijstjes.length) lijstjes.push(h('li', { class: 'is-goed' }, 'Niets overgeslagen, geen bijzonderheden.'));

  const o = r.overlap || { vergeleken: 0, afwijkend: [] };
  let overlap = null;
  if (o.vergeleken) {
    const aantal = o.aantalAfwijkend ?? o.afwijkend.length;
    const excel = imp.soort === 'excel';
    // Oude Excel-imports (vóór 1.2.0) hebben geen `behouden`; daar bleef de bestaande waarde altijd staan.
    const behouden = (x) => x.behouden ?? excel;
    const ietsBehouden = o.afwijkend.some(behouden);
    overlap = h('div', { class: 'stack' },
      h('p', { class: aantal ? 'is-waarschuwing' : 'is-goed' },
        `${tal(o.vergeleken, 'waarde', 'waarden')} vergeleken met wat er al stond: `,
        aantal ? `${aantal} wijk${aantal === 1 ? 't' : 'en'} af.` : 'alles komt overeen.'),
      aantal ? h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel' },
        h('thead', {}, h('tr', {}, h('th', {}, zon ? 'Maand' : 'Dag'), zon ? null : h('th', {}, ''),
          h('th', { class: 'num' }, zon ? 'Eerder (kWh)' : 'Eerder'), h('th', { class: 'num' }, zon ? 'SolarEdge' : 'Dit bestand'))),
        h('tbody', {}, o.afwijkend.slice(0, staat.alleAfwijkend === imp.id ? 50 : 8).map((x) => h('tr', {},
          h('td', {}, x.datum.length === 7 ? jaarErbij(x.datum) : dagKnop(staat, opnieuw, x.datum, fmtDatumKort(x.datum))),
          zon ? null : h('td', {}, MAAT_NAAM[x.maat].toLowerCase()),
          h('td', { class: 'num' }, `${behouden(x) ? '✓ ' : ''}${fmtGetal(x.oud, zon ? 0 : 2)}${x.bron ? ` (${bronNaam(x.bron)})` : ''}`),
          h('td', { class: 'num' }, `${behouden(x) ? '' : '✓ '}${fmtGetal(x.nieuw, zon ? 0 : 2)}`)))))) : null,
      aantal > 8 && staat.alleAfwijkend !== imp.id
        ? h('button', { type: 'button', class: 'btn btn-ghost btn-small', onClick: () => { staat.alleAfwijkend = imp.id; staat.openImport = imp.id; opnieuw(); } }, `Toon ${Math.min(aantal, 50)} verschillen`) : null,
      aantal && zon ? h('p', { class: 'hint' }, '✓ = de waarde die is aangehouden. SolarEdge gaat voor; eerder ingevulde waarden (Excel of handmatig) zijn vervangen.') : null,
      aantal && !zon ? h('p', { class: 'hint' }, `✓ = de waarde die is aangehouden.${ietsBehouden ? ' Waar de eerdere waarde bleef staan, kwam die uit een betere bron (Vattenfall gaat voor HomeWizard, HomeWizard voor Excel). Klopt het bestand toch beter, pas de dag dan aan in Historie.' : ''}`) : null);
  }

  let actie = null;
  if (imp.ongedaan) {
    const t = imp.ongedaanTelling || {};
    actie = h('p', { class: 'hint' }, `Teruggedraaid ${formatWhen(imp.ongedaan)}: ${tal(t.teruggezet || 0, ...eenh)} teruggezet${t.behouden ? `, ${t.behouden} waarde(n) bleven staan omdat ze daarna opnieuw zijn ingelezen of gewijzigd` : ''}.`);
  } else if (imp.herstel && imp.veranderd !== false) {
    actie = h('div', { class: 'button-row' }, h('button', {
      type: 'button', class: 'btn btn-danger btn-small',
      onClick: async () => {
        if (!ctx.confirm('Deze import ongedaan maken? Waarden die deze import heeft gezet, krijgen weer hun oude waarde. Wat je daarna zelf hebt aangepast of opnieuw hebt ingelezen, blijft staan.')) return;
        let telling;
        try {
          await ctx.update((data) => { telling = maakImportOngedaan(data, imp.id); });
        } catch (err) { ctx.toast(err.message, 'error'); return; }
        if (telling) ctx.toast(`Teruggedraaid: ${tal(telling.teruggezet, ...eenh)}`, 'ok');
        staat.weerOpnieuw = true;
        staat.openImport = imp.id;
        opnieuw();
      },
    }, 'Import ongedaan maken'));
  } else if (imp.herstelVervallen) {
    actie = h('p', { class: 'hint' }, 'Deze import is niet meer terug te draaien (alleen de laatste 10 imports).');
  }

  return h('div', { class: 'import-rapport stack' },
    h('p', { class: 'muted' },
      imp.bestand ? `${imp.bestand} · ` : '',
      r.vanaf ? `${jaarErbij(r.vanaf)} t/m ${jaarErbij(r.tot)}` : zon ? 'geen maanden' : 'geen dagen',
      r.regels ? ` · ${fmtGetal(r.regels, 0)} regels gelezen` : ''),
    h('dl', { class: 'rapport-getallen' }, getallen.map(([k, w]) => h('div', {}, h('dt', {}, k), h('dd', {}, w)))),
    totalen,
    zonTotalen,
    h('ul', { class: 'rapport-lijst' }, lijstjes),
    overlap,
    metLink ? h('div', { class: 'button-row' }, h('button', {
      type: 'button', class: 'btn btn-small',
      onClick: () => { staat.tab = 'historie'; staat.historieWeergave = 'controle'; staat.open = null; opnieuw(); window.scrollTo({ top: 0 }); },
    }, 'Alle controles bekijken')) : null,
    actie);
}

/** Kort overzicht van de gevonden meldingen binnen de periode van een import (voor direct na het inlezen). */
export function meldingenInPeriode(a, van, tot) {
  if (!van) return 0;
  return controleer(a).lijst.filter((b) => (b.tot || b.datum) >= van && b.datum <= tot).length;
}

