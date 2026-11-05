// Historie: tabel per dag, per maand te bladeren. Ontbrekende dagen zijn gemarkeerd.
// Tik op een dag om een opmerking toe te voegen of waarden te corrigeren.

import { h } from '../core/dom.js';
import { totaal, upsert, dagId } from './model.js';
import { eachDay, fmtDag, fmtDagLang, fmtMaand, maandStart, maandEinde, maandPlus, monthKey } from './tijd.js';
import { kaart, fmtGetal, fmtKwh, fmtM3, euro, leesGetal, toonGetal, veld } from './ui.js';

export function renderHistorie(a, staat, opnieuw, ctx) {
  if (!a.eerste) return [kaart('Nog geen gegevens', h('p', { class: 'muted' }, 'Lees eerst gegevens in via Invoer.'))];
  staat.historieMaand ??= monthKey(a.laatste);
  const m = staat.historieMaand;
  const van = maandStart(m);
  const tot = maandEinde(m) < a.laatste ? maandEinde(m) : a.laatste;

  const nav = h('div', { class: 'maand-nav' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorige maand', disabled: van <= a.eerste, onClick: () => { staat.historieMaand = maandPlus(m, -1); staat.open = null; opnieuw(); } }, '‹'),
    h('h2', { class: 'kaart-titel' }, fmtMaand(m)),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Volgende maand', disabled: maandEinde(m) >= a.laatste, onClick: () => { staat.historieMaand = maandPlus(m, 1); staat.open = null; opnieuw(); } }, '›'));

  const t = van <= tot ? totaal(a, van, tot) : null;
  const som = t && h('div', { class: 'maand-som' },
    h('span', {}, `Stroom ${fmtKwh(t.dagenAfname ? t.afname : null, 0)}`),
    h('span', {}, `Terug ${fmtKwh(t.dagenAfname ? t.terug : null, 0)}`),
    h('span', {}, `Gas ${fmtM3(t.dagenGas ? t.gas : null, 1)}`),
    h('span', {}, `Kosten ${t.zonderContract ? '–' : euro(t.kosten)}`));

  const rijen = [];
  const dagenLijst = van <= tot ? [...eachDay(van, tot)].reverse() : [];
  for (const datum of dagenLijst) {
    const x = a.perDag.get(datum);
    const voorEerste = datum < a.eerste;
    if (voorEerste) continue;
    const d = x?.dag;
    const geschat = x?.kosten.geschat;
    rijen.push(h('tr', {
      class: `${x ? '' : 'is-leeg'}${staat.open === datum ? ' is-open' : ''}`,
      tabindex: 0,
      onClick: () => { staat.open = staat.open === datum ? null : datum; opnieuw(); if (staat.open) window.scrollTo({ top: 0, behavior: 'smooth' }); },
      onKeydown: (e) => { if (e.key === 'Enter') { staat.open = staat.open === datum ? null : datum; opnieuw(); } },
    },
    h('td', {}, fmtDag(datum), d?.opmerking ? h('span', { class: 'opm-stip', title: d.opmerking, 'aria-label': 'heeft opmerking' }, ' ●') : null),
    x ? [
      h('td', { class: 'num' }, fmtGetal(d.afname, 1)),
      h('td', { class: 'num' }, fmtGetal(d.terug, 1)),
      h('td', { class: 'num' }, fmtGetal(d.gas, 2)),
      h('td', { class: 'num verberg-smal' }, x.weer ? fmtGetal(x.weer.tgem, 1) : '–'),
      h('td', { class: `num${geschat ? ' is-geschat' : ''}` }, x.kosten.contract ? euro(x.kosten.totaal) : '–'),
    ] : h('td', { colspan: 5, class: 'muted' }, 'geen gegevens')));
  }

  const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-dagen' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Dag'), h('th', { class: 'num' }, 'kWh'), h('th', { class: 'num' }, 'terug'),
      h('th', { class: 'num' }, 'm³'), h('th', { class: 'num verberg-smal' }, '°C'), h('th', { class: 'num' }, 'kosten'))),
    h('tbody', {}, rijen)));

  const bewerk = staat.open && staat.open >= van && staat.open <= tot
    ? kaart(null, bewerkDag(staat.open, a.perDag.get(staat.open), ctx, staat, opnieuw)) : null;
  return [bewerk, kaart(null, nav, som, tabel,
    h('p', { class: 'hint' }, 'Tik op een dag voor details, een opmerking of een correctie (verschijnt bovenaan). Cursieve kosten zijn geschat (geen uurverdeling bekend).'))];
}

function bewerkDag(datum, x, ctx, staat, opnieuw) {
  const d = x?.dag || {};
  const f = {
    afname: h('input', { inputmode: 'decimal', value: toonGetal(d.afname), autocomplete: 'off' }),
    terug: h('input', { inputmode: 'decimal', value: toonGetal(d.terug), autocomplete: 'off' }),
    gas: h('input', { inputmode: 'decimal', value: toonGetal(d.gas), autocomplete: 'off' }),
    opmerking: h('input', { value: d.opmerking || '', autocomplete: 'off', maxlength: 200 }),
  };
  const info = [];
  if (x?.weer) info.push(`Temperatuur ${fmtGetal(x.weer.tgem, 1)} °C (min ${fmtGetal(x.weer.tmin, 1)}, max ${fmtGetal(x.weer.tmax, 1)}), graaddag ${fmtGetal(x.graaddag, 1)}`);
  if (x?.kosten.contract) info.push(`Kosten: stroom ${euro(x.kosten.stroom)}, teruglevering ${euro(x.kosten.terug)}, gas ${euro(x.kosten.gas)}, vast ${euro(x.kosten.vast)}`);
  if (d.bron) info.push(`Bron: ${d.bron === 'homewizard' ? 'HomeWizard' : d.bron === 'excel' ? 'Excel' : 'handmatig'}${d.uurAfname ? ' (met uurverdeling)' : ''}`);

  return h('form', {
    class: 'stack bewerk-form',
    onSubmit: async (e) => {
      e.preventDefault();
      const w = { afname: leesGetal(f.afname.value), terug: leesGetal(f.terug.value), gas: leesGetal(f.gas.value) };
      if (Object.values(w).some((v) => Number.isNaN(v) || v < 0)) { ctx.toast('Vul geldige, positieve getallen in.', 'error'); return; }
      await ctx.update((data) => {
        const velden = { datum, opmerking: f.opmerking.value.trim() };
        const stroomAnders = w.afname !== (d.afname ?? null) || w.terug !== (d.terug ?? null);
        if (stroomAnders) Object.assign(velden, { afname: w.afname ?? undefined, terug: w.terug ?? undefined, uurAfname: undefined, uurTerug: undefined, bron: 'handmatig' });
        if (w.gas !== (d.gas ?? null)) velden.gas = w.gas ?? undefined;
        const rec = upsert(data.dagen, dagId(datum), velden);
        if (rec.bron == null) rec.bron = 'handmatig';
        for (const k of Object.keys(rec)) if (rec[k] === undefined) delete rec[k];
      });
      staat.open = null;
      ctx.toast('Opgeslagen', 'ok');
    },
  },
  h('strong', {}, fmtDagLang(datum)),
  info.map((t) => h('p', { class: 'hint' }, t)),
  h('div', { class: 'field-row drie' }, veld('Stroom (kWh)', f.afname), veld('Terug (kWh)', f.terug), veld('Gas (m³)', f.gas)),
  veld('Opmerking', f.opmerking),
  h('div', { class: 'button-row' },
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Opslaan'),
    h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => { staat.open = null; opnieuw(); } }, 'Sluiten')));
}
