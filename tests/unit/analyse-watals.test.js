import test from 'node:test';
import assert from 'node:assert/strict';
import {
  maandVakjes,
  prijsSleutel,
  uurTarief,
  cop,
  opvallend,
} from '../../js/energie/analyse-watals.js';

test('maandVakjes knipt de eerste en laatste maand af op de gekozen periode', () => {
  const result = maandVakjes('2026-01-20', '2026-03-05');
  assert.deepEqual(result.map(({ maand, van, tot }) => ({ maand, van, tot })), [
    { maand: '2026-01', van: '2026-01-20', tot: '2026-01-31' },
    { maand: '2026-02', van: '2026-02-01', tot: '2026-02-28' },
    { maand: '2026-03', van: '2026-03-01', tot: '2026-03-05' },
  ]);
});

test('prijsSleutel gebruikt een tweecijferig uur', () => {
  assert.equal(prijsSleutel('2026-10-01', 5), '2026-10-01T05');
  assert.equal(prijsSleutel('2026-10-01', 15), '2026-10-01T15');
});

test('uurTarief telt levering en energiebelasting op en behandelt ontbrekende tarieven als nul', () => {
  const contract = { stroomLevering: { winterNormaal: 0.2 }, stroomEb: 0.1 };
  assert.equal(uurTarief(contract, '2026-01-05', 0), 0.3);
  assert.equal(uurTarief(null, '2026-01-05', 0), 0);
  assert.equal(uurTarief({}, '2026-01-05', 0), 0);
});

test('COP wordt begrensd op realistische minimum- en maximumwaarden', () => {
  assert.equal(cop(0, 'vloerverwarming'), 3.3);
  assert.equal(cop(0, 'radiatoren'), 2.6999999999999997);
  assert.equal(cop(-30, 'radiatoren'), 1.8);
  assert.equal(cop(50, 'vloerverwarming'), 5);
});

test('opvallend herkent een afwijkende stroomdag ten opzichte van dezelfde weekdagen', () => {
  const referentie = [
    '2025-11-10', '2025-11-17', '2025-11-24', '2025-12-01',
    '2025-12-08', '2025-12-15', '2025-12-22', '2025-12-29',
  ];
  const perDag = new Map(referentie.map((datum) => [datum, { dag: { afname: 3 } }]));
  perDag.set('2026-01-05', { dag: { afname: 10, opmerking: 'Testdag' } });

  const result = opvallend({ perDag }, '2026-01-05', '2026-01-05', { maat: 'afname' });

  assert.equal(result.bekeken, 1);
  assert.equal(result.dagen.length, 1);
  assert.deepEqual(
    {
      datum: result.dagen[0].datum,
      waarde: result.dagen[0].waarde,
      verwacht: result.dagen[0].verwacht,
      verschil: result.dagen[0].verschil,
      opmerking: result.dagen[0].opmerking,
    },
    {
      datum: '2026-01-05',
      waarde: 10,
      verwacht: 3,
      verschil: 7,
      opmerking: 'Testdag',
    },
  );
});

test('opvallend negeert dagen zonder voldoende vergelijkingsdagen', () => {
  const perDag = new Map([
    ['2026-01-05', { dag: { afname: 10 } }],
    ['2025-12-29', { dag: { afname: 3 } }],
    ['2025-12-22', { dag: { afname: 3 } }],
  ]);
  const result = opvallend({ perDag }, '2026-01-05', '2026-01-05', { maat: 'afname' });
  assert.equal(result.bekeken, 0);
  assert.deepEqual(result.dagen, []);
});
