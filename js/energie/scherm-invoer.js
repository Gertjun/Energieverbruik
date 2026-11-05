// Invoer: Vattenfall- of HomeWizard-export inlezen, een dag handmatig invullen, maandgegevens
// (met import van de SolarEdge-export voor de zonne-opbrengst).

import { h, today, parseEuro, formatEuro } from '../core/dom.js';
import { leesHomeWizard } from './import-homewizard.js';
import { leesVattenfall, isVattenfall } from './import-vattenfall.js';
import { leesSolarEdge, isSolarEdge } from './import-solaredge.js';
import { zetHomeWizard, zetVattenfall, zetSolarEdge, losVanImport } from './importeren.js';
import { importRapport, meldingenInPeriode } from './scherm-controle.js';
import { upsert, dagId, maandId } from './model.js';
import { addDays, fmtDatumKort, monthKey, maandPlus } from './tijd.js';
import { kaart, veld, leesGetal, toonGetal } from './ui.js';

export function renderInvoer(a, staat, opnieuw, ctx) {
  return [homewizardKaart(a, staat, opnieuw, ctx), dagKaart(a, ctx), maandKaart(a, staat, opnieuw, ctx)];
}

const BRON_VOLGORDE = { vattenfall: 0, homewizard: 1, solaredge: 2 };
const ZET = { vattenfall: zetVattenfall, homewizard: zetHomeWizard, solaredge: zetSolarEdge };

/**
 * Gekozen bestanden herkennen (Vattenfall, HomeWizard of SolarEdge), inlezen en verwerken.
 * `plek` bepaalt in welke kaart het rapport verschijnt ('export' of 'maand').
 */
async function verwerkBestanden(files, staat, opnieuw, ctx, plek) {
  const fouten = [];
  const resultaten = [];
  for (const f of files) {
    try {
      const tekst = await f.text();
      if (isSolarEdge(tekst)) resultaten.push({ res: leesSolarEdge(tekst, monthKey(today())), naam: f.name, bron: 'solaredge' });
      else if (isVattenfall(tekst)) resultaten.push({ res: leesVattenfall(tekst), naam: f.name, bron: 'vattenfall' });
      else resultaten.push({ res: leesHomeWizard(tekst), naam: f.name, bron: 'homewizard' });
    } catch (err) {
      fouten.push(`${f.name}: ${err.message}`);
    }
  }
  staat.importPlek = plek;
  staat.importFouten = fouten;
  staat.laatsteImports = [];
  if (resultaten.length) {
    const ids = [];
    // Vattenfall eerst: dan kan HomeWizard bij Vattenfall-dagbestanden nog de uurverdeling aanvullen.
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
  'homewizard-stroom': 'HomeWizard stroom', 'homewizard-gas': 'HomeWizard gas', solaredge: 'SolarEdge opbrengst',
};

/** Fouten en importrapporten van de laatste keuze, in de kaart waar het bestand gekozen is. */
function importMelding(a, staat, opnieuw, ctx, plek) {
  if ((staat.importPlek || 'export') !== plek) return null;
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

function homewizardKaart(a, staat, opnieuw, ctx) {
  const input = h('input', {
    type: 'file', accept: '.csv,text/csv', multiple: true, class: 'visually-hidden', id: 'hw-bestand',
    onChange: (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (files.length) verwerkBestanden(files, staat, opnieuw, ctx, 'export');
    },
  });
  return kaart('Export inlezen',
    h('p', { class: 'muted' }, a.laatste
      ? `Gegevens tot en met ${fmtDatumKort(a.laatste)}. Exporteer vanaf die dag (of eerder; dubbele dagen worden gewoon bijgewerkt).`
      : 'Lees je export van stroom en gas in, van Vattenfall of HomeWizard. Je kunt meerdere bestanden tegelijk kiezen (ook een SolarEdge-export).'),
    h('p', { class: 'hint' }, 'Vattenfall gaat voor: dat zijn de meetgegevens waarop je rekening gebaseerd is. HomeWizard vult aan waar Vattenfall (nog) niets heeft, zoals gisteren en vandaag.'),
    h('details', { class: 'uitleg' },
      h('summary', {}, 'Hoe download ik bij Vattenfall?'),
      h('ol', {},
        h('li', {}, 'Log in op Mijn Vattenfall (website of app) en ga naar Verbruik.'),
        h('li', {}, 'Kies Stroom, de periode en "per kwartier", en download als CSV.'),
        h('li', {}, 'Doe hetzelfde voor Gas, "per uur".'),
        h('li', {}, 'Kies de bestanden hieronder. Een download per dag kan ook, maar dan is er geen uurverdeling.'))),
    h('details', { class: 'uitleg' },
      h('summary', {}, 'Hoe exporteer ik uit HomeWizard?'),
      h('ol', {},
        h('li', {}, 'Open de HomeWizard Energy-app.'),
        h('li', {}, 'Ga naar Instellingen → Grafieken.'),
        h('li', {}, 'Kies de grafiek van je P1-meter (stroom), tik op "Grafiekgegevens exporteren" en kies per kwartier.'),
        h('li', {}, 'Doe hetzelfde voor gas.'),
        h('li', {}, 'Bewaar de bestanden in Bestanden en kies ze hieronder.'))),
    input,
    h('label', { class: 'btn btn-primary btn-block', for: 'hw-bestand' }, 'Bestanden kiezen (.csv)'),
    importMelding(a, staat, opnieuw, ctx, 'export'));
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

function maandKaart(a, staat, opnieuw, ctx) {
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
    h('p', { class: 'hint' }, 'De opbrengst van je zonnepanelen en je termijnbedrag. Daarmee berekent de app je zelfvoorzienendheid en verwachte eindafrekening.'),
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
    a.maanden.size ? h('p', { class: 'hint' }, `Laatst ingevuld: ${[...a.maanden.values()].filter((m) => m.zon != null).map((m) => m.maand).sort().slice(-1)[0] || '–'} (opbrengst).`) : null,
    solarEdgeDeel(a, staat, opnieuw, ctx));
}

function solarEdgeDeel(a, staat, opnieuw, ctx) {
  const input = h('input', {
    type: 'file', accept: '.csv,text/csv', class: 'visually-hidden', id: 'se-bestand',
    onChange: (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (files.length) verwerkBestanden(files, staat, opnieuw, ctx, 'maand');
    },
  });
  return h('div', { class: 'stack' },
    h('h3', {}, 'Opbrengst uit SolarEdge inlezen'),
    h('p', { class: 'hint' }, 'Alle maanden in één keer, in plaats van overtikken. SolarEdge gaat voor: een eerder ingevulde opbrengst wordt overschreven en verschillen zie je in het rapport. De lopende maand wordt overgeslagen tot hij compleet is.'),
    h('details', { class: 'uitleg' },
      h('summary', {}, 'Hoe exporteer ik uit SolarEdge?'),
      h('ol', {},
        h('li', {}, 'Log op de laptop in op het SolarEdge-monitoringportaal (monitoring.solaredge.com).'),
        h('li', {}, 'Zoek de grafiek waarin je de energie per maand van verschillende jaren vergelijkt.'),
        h('li', {}, 'Kies daar exporteren als CSV. Het bestand heet ongeveer "comparative-month-chart-data_….csv".'),
        h('li', {}, 'Kies het bestand hieronder. Je kunt dit elke maand opnieuw doen; dubbele maanden worden gewoon bijgewerkt.'))),
    input,
    h('label', { class: 'btn btn-block', for: 'se-bestand' }, 'SolarEdge-bestand kiezen (.csv)'),
    importMelding(a, staat, opnieuw, ctx, 'maand'));
}

