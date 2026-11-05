// Invoer: één plek om bestanden in te lezen (Vattenfall, HomeWizard, SolarEdge, oude Excel; de app herkent
// zelf welk bestand het is), een dag handmatig invullen, maandgegevens.

import { h, today, parseEuro, formatEuro } from '../core/dom.js';
import { leesHomeWizard } from './import-homewizard.js';
import { leesVattenfall, isVattenfall } from './import-vattenfall.js';
import { leesSolarEdge, isSolarEdge } from './import-solaredge.js';
import { leesExcel } from './import-excel.js';
import { zetHomeWizard, zetVattenfall, zetSolarEdge, zetExcel, losVanImport } from './importeren.js';
import { importRapport, meldingenInPeriode } from './scherm-controle.js';
import { upsert, dagId, maandId } from './model.js';
import { addDays, fmtDatumKort, monthKey, maandPlus } from './tijd.js';
import { kaart, veld, leesGetal, toonGetal } from './ui.js';

export function renderInvoer(a, staat, opnieuw, ctx) {
  return [bestandenKaart(a, staat, opnieuw, ctx), dagKaart(a, ctx), maandKaart(a, ctx)];
}

// Volgorde van verwerken bij meerdere bestanden tegelijk: de betrouwbaarste bron eerst.
// Vattenfall eerst, zodat HomeWizard bij Vattenfall-dagbestanden nog de uurverdeling kan aanvullen.
const BRON_VOLGORDE = { vattenfall: 0, homewizard: 1, excel: 2, solaredge: 3 };
const ZET = { vattenfall: zetVattenfall, homewizard: zetHomeWizard, excel: zetExcel, solaredge: zetSolarEdge };

/** Is dit een .xlsx (een zip-bestand: begint met "PK")? */
async function isXlsx(f) {
  if (/\.xlsx$/i.test(f.name)) return true;
  const b = new Uint8Array(await f.slice(0, 2).arrayBuffer());
  return b[0] === 0x50 && b[1] === 0x4b;
}

/** Gekozen bestanden herkennen (Vattenfall, HomeWizard, SolarEdge of Excel), inlezen en verwerken. */
async function verwerkBestanden(files, staat, opnieuw, ctx) {
  const fouten = [];
  const resultaten = [];
  for (const f of files) {
    try {
      if (await isXlsx(f)) { resultaten.push({ res: await leesExcel(await f.arrayBuffer()), naam: f.name, bron: 'excel' }); continue; }
      const tekst = await f.text();
      if (isSolarEdge(tekst)) resultaten.push({ res: leesSolarEdge(tekst, monthKey(today())), naam: f.name, bron: 'solaredge' });
      else if (isVattenfall(tekst)) resultaten.push({ res: leesVattenfall(tekst), naam: f.name, bron: 'vattenfall' });
      else resultaten.push({ res: leesHomeWizard(tekst), naam: f.name, bron: 'homewizard' });
    } catch (err) {
      fouten.push(`${f.name}: ${err.message}`);
    }
  }
  staat.importFouten = fouten;
  staat.laatsteImports = [];
  if (resultaten.length) {
    const ids = [];
    resultaten.sort((x, y) => BRON_VOLGORDE[x.bron] - BRON_VOLGORDE[y.bron]);
    await ctx.update((data) => {
      for (const r of resultaten) ids.push(ZET[r.bron](data, r.res, r.naam).id);
    });
    staat.laatsteImports = ids;
    ctx.toast('Ingelezen', 'ok');
    if (resultaten.some((r) => r.bron !== 'solaredge')) staat.weerOpnieuw = true;
  }
  opnieuw();
}

const RAPPORT_TITEL = {
  'vattenfall-stroom': 'Vattenfall stroom', 'vattenfall-gas': 'Vattenfall gas',
  'homewizard-stroom': 'HomeWizard stroom', 'homewizard-gas': 'HomeWizard gas', solaredge: 'SolarEdge opbrengst', excel: 'Excel',
};

/** Fouten en importrapporten van de laatst gekozen bestanden. */
function importMelding(a, staat, opnieuw, ctx) {
  const importen = (staat.laatsteImports || []).map((id) => (ctx.data.importen || []).find((i) => i.id === id && !i.deleted)).filter(Boolean);
  if (!staat.importFouten?.length && !importen.length) return null;
  return h('div', { class: 'import-melding' },
    (staat.importFouten || []).map((t) => h('p', { class: 'form-error' }, t)),
    importen.map((imp) => {
      const n = imp.soort === 'solaredge' ? 0 : meldingenInPeriode(a, imp.rapport.vanaf, imp.rapport.tot);
      return h('div', { class: 'rapport-blok' },
        h('h3', {}, `Importrapport ${RAPPORT_TITEL[imp.soort] || imp.soort}`),
        imp.soort === 'solaredge' ? null
          : n ? h('p', { class: 'is-waarschuwing' }, `${n} controlemelding${n === 1 ? '' : 'en'} in deze periode.`) : h('p', { class: 'is-goed' }, 'Geen verdachte waarden in deze periode.'),
        importRapport(imp, staat, opnieuw, ctx, { metLink: imp.soort !== 'solaredge' }));
    }));
}

function bestandenKaart(a, staat, opnieuw, ctx) {
  const input = h('input', {
    type: 'file', multiple: true, class: 'visually-hidden', id: 'bestand-inlezen',
    accept: '.csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    onChange: (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (files.length) verwerkBestanden(files, staat, opnieuw, ctx);
    },
  });
  const uitleg = (titel, stappen) => h('details', { class: 'uitleg' }, h('summary', {}, titel), h('ol', {}, stappen.map((t) => h('li', {}, t))));
  return kaart('Bestanden inlezen',
    h('p', { class: 'muted' }, 'Kies een of meer bestanden van Vattenfall, HomeWizard of SolarEdge (of je oude Excel). De app ziet zelf welk bestand het is en wat erin staat.'),
    a.laatste ? h('p', { class: 'hint' }, `Stroom en gas tot en met ${fmtDatumKort(a.laatste)}. Exporteer vanaf die dag (of eerder; dubbele dagen en maanden worden gewoon bijgewerkt).`) : null,
    h('details', { class: 'uitleg' },
      h('summary', {}, 'Welke gegevens gaan voor bij verschillen?'),
      h('ul', {},
        h('li', {}, h('strong', {}, 'Stroom en gas: '), 'Vattenfall gaat voor (de meetgegevens waarop je rekening gebaseerd is), dan HomeWizard, dan Excel, dan wat je zelf invult. HomeWizard vult aan waar Vattenfall (nog) niets heeft, zoals gisteren en vandaag.'),
        h('li', {}, h('strong', {}, 'Zonne-opbrengst: '), 'alleen SolarEdge levert die; dat gaat voor de Excel en wat je zelf invult.'),
        h('li', {}, 'Verschillen met wat er al stond, zie je in het importrapport. Elke import kun je ongedaan maken.'))),
    uitleg('Hoe download ik bij Vattenfall?', [
      'Log in op Mijn Vattenfall (website of app) en ga naar Verbruik.',
      'Kies Stroom, de periode en "per kwartier", en download als CSV.',
      'Doe hetzelfde voor Gas, "per uur".',
      'Een download per dag kan ook, maar dan is er geen uurverdeling.']),
    uitleg('Hoe exporteer ik uit HomeWizard?', [
      'Open de HomeWizard Energy-app.',
      'Ga naar Instellingen → Grafieken.',
      'Kies de grafiek van je P1-meter (stroom), tik op "Grafiekgegevens exporteren" en kies per kwartier.',
      'Doe hetzelfde voor gas.',
      'Bewaar de bestanden in Bestanden.']),
    uitleg('Hoe exporteer ik uit SolarEdge?', [
      'Log op de laptop in op het SolarEdge Monitoring platform (monitoring.solaredge.com).',
      'Open de grafiek waarin je de energie per maand van verschillende jaren vergelijkt.',
      'Kies exporteren als CSV. Het bestand heet ongeveer "comparative-month-chart-data_….csv".',
      'De lopende maand wordt overgeslagen tot hij compleet is; exporteer dus na de 1e van de maand.']),
    uitleg('Oude Excel', [
      'Eenmalig je oude Excel-bestand (.xlsx): dagverbruik, opmerkingen, temperaturen (blad DATA), termijnbedragen en zonne-opbrengst (blad Kosten).',
      'Excel vult alleen aan; wat er al stond uit Vattenfall, HomeWizard of SolarEdge blijft staan. Vaker inlezen telt niets dubbel.']),
    input,
    h('label', { class: 'btn btn-primary btn-block', for: 'bestand-inlezen' }, 'Bestanden kiezen'),
    importMelding(a, staat, opnieuw, ctx));
}

function dagKaart(a, ctx) {
  const datum = h('input', { type: 'date', value: addDays(today(), -1), max: today(), required: true });
  const f = {
    afname: h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: '0,0' }),
    terug: h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: '0,0' }),
    gas: h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: '0,00' }),
    opmerking: h('input', { autocomplete: 'off', maxlength: 200, placeholder: 'bijv. vakantie, thermostaat lager' }),
  };
  const vul = () => {
    const d = a.perDag.get(datum.value)?.dag;
    f.afname.value = toonGetal(d?.afname); f.terug.value = toonGetal(d?.terug);
    f.gas.value = toonGetal(d?.gas); f.opmerking.value = d?.opmerking || '';
  };
  datum.addEventListener('change', vul);
  vul();
  return kaart('Dag handmatig',
    h('p', { class: 'hint' }, 'Voor een dag zonder export, of om een opmerking toe te voegen. Kosten van handmatige dagen zijn een schatting.'),
    h('form', {
      class: 'stack',
      onSubmit: async (e) => {
        e.preventDefault();
        const w = { afname: leesGetal(f.afname.value), terug: leesGetal(f.terug.value), gas: leesGetal(f.gas.value) };
        if (Object.values(w).some((v) => Number.isNaN(v) || v < 0)) { ctx.toast('Vul geldige, positieve getallen in.', 'error'); return; }
        const opm = f.opmerking.value.trim();
        if (w.afname == null && w.terug == null && w.gas == null && !opm) { ctx.toast('Vul minstens één waarde in.', 'error'); return; }
        const dag = datum.value;
        const oud = a.perDag.get(dag)?.dag;
        await ctx.update((data) => {
          const velden = { datum: dag, opmerking: opm };
          if (w.afname !== (oud?.afname ?? null) || w.terug !== (oud?.terug ?? null)) {
            Object.assign(velden, { afname: w.afname ?? undefined, terug: w.terug ?? (w.afname != null ? 0 : undefined), uurAfname: undefined, uurTerug: undefined, bron: 'handmatig' });
          }
          const gasAnders = w.gas !== (oud?.gas ?? null);
          if (gasAnders) Object.assign(velden, { gas: w.gas ?? undefined, bronGas: 'handmatig' });
          const rec = upsert(data.dagen, dagId(dag), velden);
          if (rec.afname != null) rec.bron ??= 'handmatig';
          if (velden.bron) losVanImport(rec, 's');
          if (gasAnders) losVanImport(rec, 'g');
          if (opm !== (oud?.opmerking || '')) losVanImport(rec, 'o');
          for (const k of Object.keys(rec)) if (rec[k] === undefined) delete rec[k];
        });
        ctx.toast(`${fmtDatumKort(dag)} opgeslagen`, 'ok');
      },
    },
    veld('Datum', datum),
    h('div', { class: 'field-row drie' }, veld('Stroom (kWh)', f.afname), veld('Terug (kWh)', f.terug), veld('Gas (m³)', f.gas)),
    veld('Opmerking', f.opmerking),
    h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Opslaan'))));
}

function maandKaart(a, ctx) {
  const maand = h('input', { type: 'month', value: maandPlus(monthKey(today()), -1), required: true });
  const zon = h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: 'kWh' });
  const termijn = h('input', { inputmode: 'decimal', autocomplete: 'off', placeholder: '€' });
  const vul = () => {
    const m = a.maanden.get(maand.value);
    zon.value = toonGetal(m?.zon);
    termijn.value = m?.termijn != null ? formatEuro(m.termijn).replace('€', '').trim() : '';
  };
  maand.addEventListener('change', vul);
  vul();
  return kaart('Maandgegevens',
    h('p', { class: 'hint' }, 'Je termijnbedrag, en de opbrengst van je zonnepanelen als je die niet via een SolarEdge-bestand inleest (bovenaan bij Bestanden inlezen). Daarmee berekent de app je zelfvoorzienendheid en verwachte eindafrekening.'),
    h('form', {
      class: 'stack',
      onSubmit: async (e) => {
        e.preventDefault();
        const z = leesGetal(zon.value);
        const t = termijn.value.trim() ? parseEuro(termijn.value) : null;
        if (Number.isNaN(z) || (z != null && z < 0)) { ctx.toast('Vul een geldige opbrengst in.', 'error'); return; }
        if (termijn.value.trim() && t == null) { ctx.toast('Vul een geldig bedrag in.', 'error'); return; }
        if (!/^\d{4}-\d{2}$/.test(maand.value)) { ctx.toast('Kies een maand.', 'error'); return; }
        await ctx.update((data) => {
          const rec = upsert(data.maanden, maandId(maand.value), { maand: maand.value, zon: z, termijn: t });
          delete rec.imp; // handmatig ingevuld: een Excel-import ongedaan maken laat dit staan
        });
        ctx.toast('Opgeslagen', 'ok');
      },
    },
    veld('Maand', maand),
    h('div', { class: 'field-row' }, veld('Zonne-opbrengst (kWh)', zon), veld('Termijnbedrag (€)', termijn)),
    h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Opslaan'))),
    a.maanden.size ? h('p', { class: 'hint' }, `Laatst ingevuld: ${[...a.maanden.values()].filter((m) => m.zon != null).map((m) => m.maand).sort().slice(-1)[0] || '–'} (opbrengst).`) : null);
}
