import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, isWeekend, isZomer, isoWeekKey } from '../../js/energie/tijd.js';
import { contractOp, graaddag, kostenDag, standaardContracten, tijdvak } from '../../js/energie/tarief.js';

test('datumhulpen rekenen over maand-, jaar- en schrikkeldaggrenzen', () => {
  assert.equal(addDays('2026-03-31', 1), '2026-04-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
});

test('zomer, winter en weekend volgen de afgesproken kalendergrenzen', () => {
  assert.equal(isZomer('2026-04-01'), true);
  assert.equal(isZomer('2026-09-30'), true);
  assert.equal(isZomer('2026-10-01'), false);
  assert.equal(isWeekend('2026-06-06'), true);
  assert.equal(isWeekend('2026-06-08'), false);
  assert.equal(isoWeekKey('2021-01-01'), '2020-W53');
});

test('tijdvakken gebruiken de juiste uur- en seizoensgrenzen', () => {
  assert.equal(tijdvak('2026-06-01', 11), 'zomerNormaal');
  assert.equal(tijdvak('2026-06-01', 12), 'zomerDalWeek');
  assert.equal(tijdvak('2026-06-06', 12), 'zomerDalWeekend');
  assert.equal(tijdvak('2026-01-05', 0), 'winterNormaal');
  assert.equal(tijdvak('2026-01-05', 1), 'winterDalNacht');
  assert.equal(tijdvak('2026-01-05', 6), 'winterNormaal');
  assert.equal(tijdvak('2026-01-05', 12), 'winterDalDag');
  assert.equal(tijdvak('2026-01-05', 16), 'winterNormaal');
});

test('contractOp kiest het contract met de laatste geldige begindatum', () => {
  const contracts = [
    { id: 'oud', van: '2025-01-01', tot: '2026-12-31' },
    { id: 'nieuw', van: '2026-07-01', tot: '' },
  ];
  assert.equal(contractOp(contracts, '2026-06-30').id, 'oud');
  assert.equal(contractOp(contracts, '2026-07-01').id, 'nieuw');
  assert.equal(contractOp(contracts, '2024-12-31'), null);
});

test('graaddagen passen de maandweging toe en begrenzen warme dagen op nul', () => {
  assert.equal(graaddag('2026-01-10', 8), 11);
  assert.equal(graaddag('2026-05-10', 8), 8);
  assert.equal(graaddag('2026-07-10', 22), 0);
  assert.equal(graaddag('2026-07-10', Number.NaN), null);
});

test('kostenDag rekent uurverbruik per tijdvak met zesdecimalige tarieven', () => {
  const contract = standaardContracten()[0];
  const uurAfname = Array(24).fill(0);
  const uurTerug = Array(24).fill(0);
  uurAfname[0] = 1;
  uurAfname[12] = 1;
  const result = kostenDag({
    datum: '2026-06-01',
    afname: 2,
    terug: 0,
    gas: 0,
    uurAfname,
    uurTerug,
  }, contract, {});
  assert.ok(Math.abs(result.stroom - (0.172062 + 0.110848 + 0.067276 + 0.110848)) < 1e-10);
  assert.equal(result.terug, 0);
  assert.equal(result.geschat, false);
  assert.equal(result.contract, true);
});

test('kostenDag markeert een dag zonder contract niet als berekend', () => {
  const result = kostenDag({ datum: '2026-06-01', afname: 1, terug: 0, gas: 0 }, null, {});
  assert.equal(result.contract, false);
  assert.equal(result.totaal, 0);
});