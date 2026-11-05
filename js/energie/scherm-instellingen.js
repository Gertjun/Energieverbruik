// Instellingen van de app: tarieven (contracten), weerlocatie en export. Bestanden inlezen (ook Excel) gebeurt bij Invoer.
// Synchronisatie, beveiliging en back-up zitten in de instellingen van de template (tandwiel).

import { h, saveFile, today } from '../core/dom.js';
import { newRecord, updateById, removeById } from '../core/records.js';
import { APP } from '../config.js';
import { TIJDVAKKEN } from './tarief.js';
import { fmtDatumKort } from './tijd.js';
import { kaart, veld, leesGetal, toonGetal, fmtGetal } from './ui.js';

const PRIJS_VELDEN = [
  ...TIJDVAKKEN.map((t) => [`stroomLevering.${t.key}`, `${t.label} (${t.uren})`, 'levering per kWh']),
  ['stroomEb', 'Energiebelasting stroom', 'per kWh'],
  ['gasLevering', 'Gas levering', 'per m³'],
  ['gasEb', 'Energiebelasting gas', 'per m³'],
  ['vastStroom.levering', 'Vaste leveringskosten stroom', 'per dag'],
  ['vastStroom.netbeheer', 'Netbeheerkosten stroom', 'per dag'],
  ['vastStroom.verminderingEb', 'Vermindering energiebelasting', 'per dag (wordt afgetrokken)'],
  ['vastGas.levering', 'Vaste leveringskosten gas', 'per dag'],
  ['vastGas.netbeheer', 'Netbeheerkosten gas', 'per dag'],
  ['terug.vergoeding', 'Terugleververgoeding', 'per kWh (bij saldering: voor het overschot)'],
  ['terug.kostenPerKwh', 'Terugleverkosten', 'per kWh (na saldering)'],
  ['terug.vasteKostenJaar', 'Vaste terugleverkosten', 'per jaar (bij saldering)'],
];

const lees = (obj, pad) => pad.split('.').reduce((o, k) => o?.[k], obj);
function zet(obj, pad, v) {
  const delen = pad.split('.');
  let o = obj;
  for (const k of delen.slice(0, -1)) o = (o[k] ??= {});
  o[delen[delen.length - 1]] = v;
}

export function renderInstellingen(a, staat, opnieuw, ctx) {
  return [contractenKaart(a, staat, opnieuw, ctx), exportKaart(a, ctx), weerKaart(ctx), overKaart()];
}

function contractenKaart(a, staat, opnieuw, ctx) {
  const lijst = [...a.contracten].sort((x, y) => (x.van < y.van ? 1 : -1));
  return kaart('Tarieven',
    h('p', { class: 'hint' }, 'Elk contract geldt van de begindatum tot en met de einddatum. Zo kloppen de kosten ook als je tarieven veranderen. Bedragen inclusief btw, zoals op je tariefkaart.'),
    lijst.map((c) => contractBlok(c, staat, opnieuw, ctx)),
    h('div', { class: 'button-row' }, h('button', {
      class: 'btn', type: 'button',
      onClick: async () => {
        const basis = structuredClone(lijst[0] || {});
        for (const k of ['id', 'createdAt', 'updatedAt']) delete basis[k];
        const rec = newRecord({ ...basis, naam: 'Nieuw contract', van: today(), tot: '' });
        await ctx.update((d) => { d.contracten.push(rec); });
        staat.openContract = rec.id;
        opnieuw();
      },
    }, 'Nieuw contract (kopie van het laatste)')));
}

function contractBlok(c, staat, opnieuw, ctx) {
  const naam = h('input', { value: c.naam || '', required: true, autocomplete: 'off' });
  const van = h('input', { type: 'date', value: c.van || '', required: true });
  const tot = h('input', { type: 'date', value: c.tot || '' });
  const regeling = h('select', {},
    h('option', { value: 'saldering', selected: c.terug?.regeling === 'saldering' }, 'Saldering (tot 1-1-2027)'),
    h('option', { value: 'perKwh', selected: c.terug?.regeling !== 'saldering' }, 'Per kWh (vanaf 1-1-2027)'));
  const prijzen = PRIJS_VELDEN.map(([pad, label, eenheid]) => {
    const input = h('input', { inputmode: 'decimal', value: toonGetal(lees(c, pad)), autocomplete: 'off' });
    return { pad, input, el: veld(label, input, eenheid) };
  });
  return h('details', { class: 'contract', open: staat.openContract === c.id },
    h('summary', {}, h('strong', {}, c.naam || 'Contract'), h('span', { class: 'muted' }, ` · ${fmtDatumKort(c.van)} t/m ${c.tot ? fmtDatumKort(c.tot) : 'heden'}`)),
    h('form', {
      class: 'stack',
      onSubmit: async (e) => {
        e.preventDefault();
        const wijz = { naam: naam.value.trim(), van: van.value, tot: tot.value };
        if (wijz.tot && wijz.tot < wijz.van) { ctx.toast('De einddatum ligt voor de begindatum.', 'error'); return; }
        const kopie = structuredClone(c);
        for (const p of prijzen) {
          const v = leesGetal(p.input.value);
          if (Number.isNaN(v)) { ctx.toast(`Ongeldig getal bij ${p.pad}.`, 'error'); return; }
          zet(kopie, p.pad, v ?? 0);
        }
        kopie.terug.regeling = regeling.value;
        await ctx.update((d) => {
          updateById(d.contracten, c.id, {
            ...wijz, stroomLevering: kopie.stroomLevering, stroomEb: kopie.stroomEb, gasLevering: kopie.gasLevering,
            gasEb: kopie.gasEb, vastStroom: kopie.vastStroom, vastGas: kopie.vastGas, terug: kopie.terug,
          });
        });
        staat.openContract = null;
        ctx.toast('Tarieven opgeslagen', 'ok');
      },
    },
    veld('Naam', naam),
    h('div', { class: 'field-row' }, veld('Geldig vanaf', van), veld('Geldig tot en met', tot, 'leeg = geen einddatum')),
    veld('Teruglevering', regeling),
    h('div', { class: 'prijs-raster' }, prijzen.map((p) => p.el)),
    h('div', { class: 'button-row' },
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Opslaan'),
      h('button', {
        class: 'btn btn-danger', type: 'button',
        onClick: async () => {
          if (!ctx.confirm(`Contract "${c.naam}" verwijderen?`)) return;
          await ctx.update((d) => { removeById(d.contracten, c.id); });
        },
      }, 'Verwijderen'))));
}

function exportKaart(a, ctx) {
  const csv = () => {
    const kop = ['datum', 'stroom_kwh', 'terug_kwh', 'gas_m3', 'temp_gem', 'graaddag', 'gas_per_graaddag', 'kosten_eur', 'kosten_geschat', 'bron', 'opmerking'];
    const esc = (v) => (/[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const rijen = [kop.join(';')];
    for (const [datum, x] of a.perDag) {
      rijen.push([
        datum, fmtGetal(x.dag.afname, 3), fmtGetal(x.dag.terug, 3), fmtGetal(x.dag.gas, 3),
        x.weer ? fmtGetal(x.weer.tgem, 1) : '', x.graaddag != null ? fmtGetal(x.graaddag, 2) : '', x.gasPerGd != null ? fmtGetal(x.gasPerGd, 3) : '',
        x.kosten.contract ? fmtGetal(x.kosten.totaal, 2) : '', x.kosten.geschat ? 'ja' : 'nee', x.dag.bron || '', x.dag.opmerking || '',
      ].map((v) => esc(v === '–' ? '' : v)).join(';'));
    }
    return `﻿${rijen.join('\r\n')}`;
  };
  return kaart('Exporteren',
    h('p', { class: 'hint' }, 'CSV opent direct in Excel (puntkomma, Nederlandse notatie). JSON bevat alle gegevens van de app.'),
    h('div', { class: 'button-row' },
      h('button', { class: 'btn', type: 'button', disabled: !a.dagen.length, onClick: () => saveFile(`energieverbruik-${today()}.csv`, csv(), 'text/csv') }, 'CSV per dag'),
      h('button', { class: 'btn', type: 'button', onClick: () => saveFile(`energieverbruik-${today()}.json`, JSON.stringify(ctx.data, null, 2)) }, 'Alles als JSON')));
}

function weerKaart(ctx) {
  const i = ctx.data.instellingen || {};
  const plaats = h('input', { value: i.plaats || '', autocomplete: 'off' });
  const lat = h('input', { inputmode: 'decimal', value: toonGetal(i.lat) });
  const lon = h('input', { inputmode: 'decimal', value: toonGetal(i.lon) });
  return kaart('Temperatuur',
    h('p', { class: 'hint' }, 'Dagtemperaturen worden automatisch opgehaald bij Open-Meteo voor deze locatie. Temperaturen uit je Excel (KNMI) blijven staan.'),
    h('form', {
      class: 'stack',
      onSubmit: async (e) => {
        e.preventDefault();
        const la = leesGetal(lat.value); const lo = leesGetal(lon.value);
        if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) { ctx.toast('Vul geldige coördinaten in.', 'error'); return; }
        await ctx.update((d) => { d.instellingen = { plaats: plaats.value.trim(), lat: la, lon: lo, updatedAt: Date.now() }; });
        ctx.toast('Locatie opgeslagen', 'ok');
      },
    },
    veld('Plaats', plaats),
    h('div', { class: 'field-row' }, veld('Breedtegraad', lat), veld('Lengtegraad', lon)),
    h('div', { class: 'button-row' }, h('button', { class: 'btn', type: 'submit' }, 'Opslaan'))));
}

function overKaart() {
  return kaart('Synchronisatie en beveiliging',
    h('p', { class: 'hint' }, 'Koppelen met GitHub, Face ID, wachtwoord en back-up staan onder het tandwiel rechtsboven.'),
    h('div', { class: 'button-row' }, h('button', { class: 'btn', type: 'button', onClick: () => document.getElementById('btn-settings')?.click() }, 'Open instellingen')),
    h('p', { class: 'hint' }, `${APP.name} · versie ${APP.version}`));
}
