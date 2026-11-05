// Invoer: Vattenfall- of HomeWizard-export inlezen, een dag handmatig invullen, maandgegevens.

import { h, today, parseEuro, formatEuro } from '../core/dom.js';
import { leesHomeWizard } from './import-homewizard.js';
import { leesVattenfall, isVattenfall } from './import-vattenfall.js';
import { zetHomeWizard, zetVattenfall, losVanImport } from './importeren.js';
import { importRapport, meldingenInPeriode } from './scherm-controle.js';
import { upsert, dagId, maandId } from './model.js';
import { addDays, fmtDatumKort, monthKey, maandPlus } from './tijd.js';
import { kaart, veld, leesGetal, toonGetal } from './ui.js';

export function renderInvoer(a, staat, opnieuw, ctx) {
  return [homewizardKaart(a, staat, opnieuw, ctx), dagKaart(a, ctx), maandKaart(a, ctx)];
}

function homewizardKaart(a, staat, opnieuw, ctx) {
  const input = h('input', {
    type: 'file', accept: '.csv,text/csv', multiple: true, class: 'visually-hidden', id: 'hw-bestand',
    onChange: async (e) => {
      const files = [...e.target.files];
      e.target.value = '';
      if (!files.length) return;
      const fouten = [];
      const resultaten = [];
      for (const f of files) {
        try {
          const tekst = await f.text();
          resultaten.push(isVattenfall(tekst)
            ? { res: leesVattenfall(tekst), naam: f.name, bron: 'vattenfall' }
            : { res: leesHomeWizard(tekst), naam: f.name, bron: 'homewizard' });
        } catch (err) {
          fouten.push(`${f.name}: ${err.message}`);
        }
      }
      staat.importFouten = fouten;
      staat.laatsteImports = [];
      if (resultaten.length) {
        const ids = [];
        // Vattenfall eerst: dan kan HomeWizard bij Vattenfall-dagbestanden nog de uurverdeling aanvullen.
        resultaten.sort((x, y) => (x.bron === y.bron ? 0 : x.bron === 'vattenfall' ? -1 : 1));
        await ctx.update((data) => {
          for (const r of resultaten) ids.push((r.bron === 'vattenfall' ? zetVattenfall : zetHomeWizard)(data, r.res, r.naam).id);
        });
        staat.laatsteImports = ids;
        ctx.toast('Ingelezen', 'ok');
        staat.weerOpnieuw = true;
      }
      opnieuw();
    },
  });
  const importen = (staat.laatsteImports || []).map((id) => (ctx.data.importen || []).find((i) => i.id === id && !i.deleted)).filter(Boolean);
  const melding = staat.importFouten?.length || importen.length
    ? h('div', { class: 'import-melding' },
      (staat.importFouten || []).map((t) => h('p', { class: 'form-error' }, t)),
      importen.map((imp) => {
        const n = meldingenInPeriode(a, imp.rapport.vanaf, imp.rapport.tot);
        return h('div', { class: 'rapport-blok' },
          h('h3', {}, `Importrapport ${imp.soort.startsWith('vattenfall') ? 'Vattenfall' : 'HomeWizard'} ${imp.soort.endsWith('stroom') ? 'stroom' : 'gas'}`),
          n ? h('p', { class: 'is-waarschuwing' }, `${n} controlemelding${n === 1 ? '' : 'en'} in deze periode.`) : h('p', { class: 'is-goed' }, 'Geen verdachte waarden in deze periode.'),
          importRapport(imp, staat, opnieuw, ctx, { metLink: true }));
      }))
    : null;
  return kaart('Export inlezen',
    h('p', { class: 'muted' }, a.laatste
      ? `Gegevens tot en met ${fmtDatumKort(a.laatste)}. Exporteer vanaf die dag (of eerder; dubbele dagen worden gewoon bijgewerkt).`
      : 'Lees je export van stroom en gas in, van Vattenfall of HomeWizard. Je kunt meerdere bestanden tegelijk kiezen.'),
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
    melding);
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
    h('p', { class: 'hint' }, 'De opbrengst van je zonnepanelen (uit de SolarEdge-app) en je termijnbedrag. Daarmee berekent de app je zelfvoorzienendheid en verwachte eindafrekening.'),
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

