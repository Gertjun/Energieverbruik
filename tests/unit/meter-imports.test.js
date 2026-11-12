import test from 'node:test';
import assert from 'node:assert/strict';
import { leesHomeWizard, standenNaarDagen } from '../../js/energie/import-homewizard.js';
import { isVattenfall, leesVattenfall } from '../../js/energie/import-vattenfall.js';
import { zetHomeWizard, zetVattenfall } from '../../js/energie/importeren.js';

function legeData() {
  return { dagen: [], importen: [], weer: [], maanden: [], zon: [] };
}

function homeWizardUurCsv() {
  const regels = ['time,import t1,import t2,export t1,export t2'];
  for (let uur = 0; uur <= 24; uur++) {
    const datum = uur === 24 ? '2026-01-02' : '2026-01-01';
    regels.push(`${datum} ${String(uur % 24).padStart(2, '0')}:00:00,${uur},0,0,0`);
  }
  return regels.join('\n');
}

test('HomeWizard leest Nederlandse CSV-notatie en gasmeterstanden', () => {
  const regels = ['time,total gas', '2026-01-01 00:00:00,1,25', '2026-01-02 00:00:00,1,50'];
  // HomeWizard gebruikt puntkomma bij decimale komma.
  const csv = ['time;total gas', '2026-01-01 00:00:00;1,25', '2026-01-02 00:00:00;1,50'].join('\n');
  const result = leesHomeWizard(csv);
  assert.equal(result.soort, 'gas');
  assert.equal(result.dagen.length, 1);
  assert.equal(result.dagen[0].gas, 0.25);
  assert.equal(result.dagen[0].uurGas.length, 24);
});

test('HomeWizard signaleert dubbele meetmomenten en ongeldige regels', () => {
  const csv = [
    'time,import t1,import t2,export t1,export t2',
    '2026-01-01 00:00:00,0,0,0,0',
    '2026-01-01 00:00:00,1,0,0,0',
    'ongeldige regel',
    '2026-01-02 00:00:00,24,0,0,0',
  ].join('\n');
  const result = leesHomeWizard(csv);
  assert.equal(result.dubbeleTijden, 1);
  assert.equal(result.ongeldig.aantal, 1);
  assert.equal(result.dagen[0].afname, 24);
});

test('standenNaarDagen verdeelt verbruik over ontbrekende uren en markeert de dag', () => {
  const standen = new Map([
    ['2026-01-01 00', [0]],
    ['2026-01-01 04', [8]],
    ['2026-01-02 00', [56]],
  ]);
  const result = standenNaarDagen(standen, 'gas');
  assert.equal(result.dagen[0].gas, 56);
  assert.equal(result.dagen[0].gat, true);
  assert.equal(result.gatDagen.includes('2026-01-01'), true);
  assert.equal(result.dagen[0].uurGas[0], 2);
});

test('Vattenfall herkent de exportkop en leest dagtotalen in Nederlandse notatie', () => {
  const csv = [
    'Datum;Tijd;Meterstand levering (kWh);Verbruik (kWh);Stand teruglevering (kWh);Teruglevering (kWh)',
    '02-01-2026;00:00;1.234,500;4,250;100,000;0,500',
    '01-01-2026;00:00;1.230,250;3,000;99,500;0,250',
  ].join('\n');
  assert.equal(isVattenfall(csv), true);
  const result = leesVattenfall(csv);
  assert.equal(result.soort, 'stroom');
  assert.equal(result.interval, 'dag');
  assert.deepEqual(result.dagen.map((d) => d.datum), ['2026-01-01', '2026-01-02']);
  assert.equal(result.dagen[0].afname, 3);
  assert.equal(result.dagen[1].terug, 0.5);
});

test('Vattenfall herkent gas en telt ontbrekende dagen in een dagbestand', () => {
  const csv = [
    'Datum;Tijd;Meterstand levering (m³);Verbruik (m³)',
    '03-01-2026;00:00;102,5;1,2',
    '01-01-2026;00:00;100,0;0,8',
  ].join('\n');
  const result = leesVattenfall(csv);
  assert.equal(result.soort, 'gas');
  assert.deepEqual(result.ontbrekend, ['2026-01-02']);
  assert.equal(result.dagen[0].gas, 0.8);
});

test('Vattenfall slaat lege meetregels over en rapporteert ongeldige waarden', () => {
  const csv = [
    'Datum;Tijd;Meterstand levering (m³);Verbruik (m³)',
    '01-01-2026;00:00;100,0;0,5',
    '02-01-2026;00:00;;',
    '03-01-2026;00:00;onbekend;0,5',
  ].join('\n');
  const result = leesVattenfall(csv);
  assert.equal(result.leeg, 1);
  assert.equal(result.ongeldig.aantal, 1);
});

test('Vattenfall-waarden krijgen voorrang op HomeWizard en afwijkingen worden vastgelegd', () => {
  const data = legeData();
  const home = leesHomeWizard(homeWizardUurCsv());
  zetHomeWizard(data, home, 'homewizard.csv');
  assert.equal(data.dagen[0].bron, 'homewizard');

  const vat = {
    soort: 'stroom',
    dagen: [{ datum: '2026-01-01', afname: 30, terug: 0, gat: false }],
    onvolledig: [], gatDagen: [], teruglopend: false,
    vanaf: '2026-01-01', tot: '2026-01-01', interval: 'dag',
    regels: 1, dubbeleTijden: 0, ongeldig: { aantal: 0, voorbeelden: [] },
  };
  const imp = zetVattenfall(data, vat, 'vattenfall.csv');
  assert.equal(data.dagen[0].afname, 30);
  assert.equal(data.dagen[0].bron, 'vattenfall');
  assert.equal(imp.rapport.gewijzigd, 1);
  assert.equal(imp.rapport.overlap.aantalAfwijkend, 1);
});

test('HomeWizard overschrijft geen bestaande Vattenfall-waarden', () => {
  const data = legeData();
  const vat = {
    soort: 'gas',
    dagen: [{ datum: '2026-01-01', gas: 5, gat: false, uurGas: Array(24).fill(5 / 24) }],
    onvolledig: [], gatDagen: [], teruglopend: false,
    vanaf: '2026-01-01', tot: '2026-01-01',
    regels: 1, dubbeleTijden: 0, ongeldig: { aantal: 0, voorbeelden: [] },
  };
  zetVattenfall(data, vat, 'vattenfall.csv');

  const home = {
    soort: 'gas',
    dagen: [{ datum: '2026-01-01', gas: 4, gat: false, uurGas: Array(24).fill(4 / 24) }],
    onvolledig: [], gatDagen: [], teruglopend: false,
    vanaf: '2026-01-01', tot: '2026-01-01',
    regels: 1, dubbeleTijden: 0, ongeldig: { aantal: 0, voorbeelden: [] },
  };
  const imp = zetHomeWizard(data, home, 'homewizard.csv');
  assert.equal(data.dagen[0].gas, 5);
  assert.equal(data.dagen[0].bronGas, 'vattenfall');
  assert.equal(imp.rapport.voorrang, 1);
  assert.equal(imp.rapport.overlap.aantalAfwijkend, 1);
});
