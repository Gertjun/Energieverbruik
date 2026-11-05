// Historie: tabel per dag, per maand te bladeren. Ontbrekende dagen zijn gemarkeerd.
// Tik op een dag om een opmerking toe te voegen of waarden te corrigeren.
// Daarnaast: Maanden (totalen om met Excel te vergelijken) en Controle.

import { h } from '../core/dom.js';
import { totaal, upsert, dagId } from './model.js';
import { losVanImport, bronNaam } from './importeren.js';
import { controleer } from './controle.js';
import { renderMaanden, renderControle, vinkAf } from './scherm-controle.js';
import { daysBetween, eachDay, fmtDag, fmtDagLang, fmtMaand, maandStart, maandEinde, maandPlus, monthKey } from './tijd.js';
import { kaart, segmented, fmtGetal, euro, leesGetal, toonGetal, veld } from './ui.js';

const WEERGAVEN = [['dagen', 'Dagen'], ['maanden', 'Maanden'], ['controle', 'Controle']];

export function renderHistorie(a, staat, opnieuw, ctx) {
  staat.historieWeergave ??= 'dagen';
  const keuze = h('div', { class: 'weergave-keuze' }, segmented(WEERGAVEN, staat.historieWeergave, (k) => {
    staat.historieWeergave = k; staat.open = null; opnieuw();
  }, 'Weergave'));
  let inhoud;
  if (staat.historieWeergave === 'maanden') inhoud = renderMaanden(a);
  else if (staat.historieWeergave === 'controle') inhoud = renderControle(a, staat, opnieuw, ctx);
  else inhoud = renderDagen(a, staat, opnieuw, ctx);
  return [keuze, ...inhoud];
}

function renderDagen(a, staat, opnieuw, ctx) {
  if (!a.eerste) return [kaart('Nog geen gegevens', h('p', { class: 'muted' }, 'Lees eerst gegevens in via Invoer.'))];
  const meldingen = controleer(a).perDag;
  staat.historieMaand ??= monthKey(a.laatste);
  const m = staat.historieMaand;
  const van = maandStart(m);
  const tot = maandEinde(m) < a.laatste ? maandEinde(m) : a.laatste;

  const nav = h('div', { class: 'maand-nav' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Vorige maand', disabled: van <= a.eerste, onClick: () => { staat.historieMaand = maandPlus(m, -1); staat.open = null; opnieuw(); } }, '‹'),
    h('h2', { class: 'kaart-titel' }, fmtMaand(m)),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Volgende maand', disabled: maandEinde(m) >= a.laatste, onClick: () => { staat.historieMaand = maandPlus(m, 1); staat.open = null; opnieuw(); } }, '›'));

  const t = van <= tot ? totaal(a, van, tot) : null;
  const temps = [];
  if (t) for (const datum of eachDay(van, tot)) { const w = a.perDag.get(datum)?.weer; if (w?.tgem != null) temps.push(w.tgem); }
  const som = t && h('tr', { class: 'jaar-rij' },
    h('th', { scope: 'row' }, fmtMaand(m)),
    h('td', { class: 'num' }, t.dagenAfname ? fmtGetal(t.afname, 1) : '–'),
    h('td', { class: 'num' }, t.dagenAfname ? fmtGetal(t.terug, 1) : '–'),
    h('td', { class: 'num' }, t.dagenGas ? fmtGetal(t.gas, 2) : '–'),
    h('td', { class: 'num', title: 'totaal gas ÷ totaal graaddagen (stookdagen)' }, t.graaddagen > 0 ? fmtGetal(t.gasStookdagen / t.graaddagen, 2) : '–'),
    h('td', { class: 'num verberg-smal', title: 'gemiddelde temperatuur' }, temps.length ? fmtGetal(temps.reduce((x, y) => x + y, 0) / temps.length, 1) : '–'),
    h('td', { class: `num${t.geschat ? ' is-geschat' : ''}` }, t.zonderContract ? '–' : euro(t.kosten)));

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
    h('td', {}, fmtDag(datum),
      d?.opmerking ? h('span', { class: 'opm-stip', title: d.opmerking, 'aria-label': 'heeft opmerking' }, ' ●') : null,
      meldingen.has(datum) ? h('span', { class: 'meld-stip', title: meldingen.get(datum).map((b) => b.tekst).join(' '), 'aria-label': 'controlemelding' }, ' ⚠') : null),
    x ? [
      h('td', { class: 'num' }, fmtGetal(d.afname, 1)),
      h('td', { class: 'num' }, fmtGetal(d.terug, 1)),
      h('td', { class: 'num' }, fmtGetal(d.gas, 2)),
      h('td', { class: 'num' }, x.gasPerGd != null ? fmtGetal(x.gasPerGd, 2) : '–'),
      h('td', { class: 'num verberg-smal' }, x.weer ? fmtGetal(x.weer.tgem, 1) : '–'),
      h('td', { class: `num${geschat ? ' is-geschat' : ''}` }, x.kosten.contract ? euro(x.kosten.totaal) : '–'),
    ] : h('td', { colspan: 6, class: 'muted' }, 'geen gegevens')));
  }

  const tabel = h('div', { class: 'tabel-wrap' }, h('table', { class: 'tabel tabel-dagen' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Dag'), h('th', { class: 'num' }, 'kWh'), h('th', { class: 'num' }, 'terug'),
      h('th', { class: 'num' }, 'm³'), h('th', { class: 'num', title: 'm³ gas per gewogen graaddag' }, 'm³/gd'), h('th', { class: 'num verberg-smal' }, '°C'), h('th', { class: 'num' }, 'kosten'))),
    h('tbody', {}, som, rijen)));

  const bewerk = staat.open && staat.open >= van && staat.open <= tot
    ? kaart(null, bewerkDag(staat.open, a.perDag.get(staat.open), ctx, staat, opnieuw, meldingen.get(staat.open))) : null;
  return [bewerk, kaart(null, nav, tabel,
    h('p', { class: 'hint' }, 'De vette eerste regel is het maandtotaal (m³/gd = totaal gas ÷ totaal graaddagen, °C = gemiddelde). Tik op een dag voor details, een opmerking of een correctie (verschijnt bovenaan). m³/gd = gas per gewogen graaddag (– als het te warm was om te stoken). Cursieve kosten zijn geschat (geen uurverdeling bekend). ⚠ = controlemelding, zie Controle.'))];
}

function bewerkDag(datum, x, ctx, staat, opnieuw, meldingen = []) {
  const d = x?.dag || {};
  const f = {
    afname: h('input', { inputmode: 'decimal', value: toonGetal(d.afname), autocomplete: 'off' }),
    terug: h('input', { inputmode: 'decimal', value: toonGetal(d.terug), autocomplete: 'off' }),
    gas: h('input', { inputmode: 'decimal', value: toonGetal(d.gas), autocomplete: 'off' }),
    opmerking: h('input', { value: d.opmerking || '', autocomplete: 'off', maxlength: 200 }),
  };
  const info = [];
  if (x?.weer) info.push(`Temperatuur ${fmtGetal(x.weer.tgem, 1)} °C (min ${fmtGetal(x.weer.tmin, 1)}, max ${fmtGetal(x.weer.tmax, 1)}), graaddag ${fmtGetal(x.graaddag, 1)}${x.gasPerGd != null ? `, gas per graaddag ${fmtGetal(x.gasPerGd, 3)} m³` : ''}`);
  if (x?.kosten.contract) info.push(`Kosten: stroom ${euro(x.kosten.stroom)}, teruglevering ${euro(x.kosten.terug)}, gas ${euro(x.kosten.gas)}, vast ${euro(x.kosten.vast)}`);
  if (d.piek) info.push(`Piekvermogen (hoogste kwartier): L1 ${fmtGetal(d.piek.f[0], 0)} W, L2 ${fmtGetal(d.piek.f[1], 0)} W, L3 ${fmtGetal(d.piek.f[2], 0)} W; hoogste fase om ${d.piek.t}`);
  const bronnen = [];
  if (d.afname != null) bronnen.push(`stroom ${bronNaam(d.bron)}${d.uurAfname ? ' (met uurverdeling)' : ''}`);
  if (d.gas != null) bronnen.push(`gas ${bronNaam(d.bronGas || d.bron)}`);
  if (bronnen.length) info.push(`Bron: ${bronnen.join(', ')}`);

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
        const gasAnders = w.gas !== (d.gas ?? null);
        if (gasAnders) Object.assign(velden, { gas: w.gas ?? undefined, bronGas: 'handmatig' });
        const rec = upsert(data.dagen, dagId(datum), velden);
        if (rec.bron == null && rec.afname != null) rec.bron = 'handmatig';
        // Handmatig gewijzigd: een import ongedaan maken laat deze waarden voortaan staan.
        if (stroomAnders) losVanImport(rec, 's');
        if (gasAnders) losVanImport(rec, 'g');
        if (velden.opmerking !== (d.opmerking || '')) losVanImport(rec, 'o');
        for (const k of Object.keys(rec)) if (rec[k] === undefined) delete rec[k];
      });
      staat.open = null;
      ctx.toast('Opgeslagen', 'ok');
    },
  },
  h('strong', {}, fmtDagLang(datum)),
  info.map((t) => h('p', { class: 'hint' }, t)),
  meldingen.length ? h('div', { class: 'dag-meldingen' },
    meldingen.map((b) => h('p', { class: b.ernst === 'fout' ? 'is-slecht' : 'is-waarschuwing' }, `⚠ ${b.tekst}`)),
    h('button', {
      type: 'button', class: 'btn btn-small btn-ghost',
      onClick: () => {
        const b = meldingen.find((m) => m.tot);
        return b ? vinkAf(ctx, daysBetween(b.datum, b.tot) + 1, b.datum) : vinkAf(ctx, 1, datum);
      },
    }, 'Klopt, niet meer melden')) : null,
  h('div', { class: 'field-row drie' }, veld('Stroom (kWh)', f.afname), veld('Terug (kWh)', f.terug), veld('Gas (m³)', f.gas)),
  veld('Opmerking', f.opmerking),
  h('div', { class: 'button-row' },
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Opslaan'),
    h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => { staat.open = null; opnieuw(); } }, 'Sluiten')));
}
