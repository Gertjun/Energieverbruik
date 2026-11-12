import test from 'node:test';
import assert from 'node:assert/strict';
import {
  vingerafdruk,
  isAfgevinkt,
  ontbrekendPerSoort,
  vergelijkPeriode,
} from '../../js/energie/controle.js';

test('vingerafdruk verandert zodra een meetwaarde wijzigt', () => {
  const dag = { afname: 4.25, terug: 1.1, gas: 2.5 };
  const origineel = vingerafdruk(dag);
  assert.equal(isAfgevinkt({ ...dag, gecontroleerd: origineel }), true);
  assert.equal(isAfgevinkt({ ...dag, afname: 4.26, gecontroleerd: origineel }), false);
  assert.equal(isAfgevinkt({ ...dag, gecontroleerd: 'oude-vorm' }), false);
});

test('ontbrekendPerSoort vindt afzonderlijke gaten voor stroom en gas', () => {
  const a = {
    dagen: [
      { datum: '2026-01-01', afname: 2, gas: 1 },
      { datum: '2026-01-03', afname: 3, gas: null },
      { datum: '2026-01-04', afname: null, gas: 2 },
    ],
  };
  const result = ontbrekendPerSoort(a);

  assert.deepEqual(result.stroom, {
    eerste: '2026-01-01',
    laatste: '2026-01-03',
    reeksen: [{ van: '2026-01-02', tot: '2026-01-02', dagen: 1 }],
    totaal: 1,
  });
  assert.deepEqual(result.gas, {
    eerste: '2026-01-01',
    laatste: '2026-01-04',
    reeksen: [{ van: '2026-01-02', tot: '2026-01-03', dagen: 2 }],
    totaal: 2,
  });
});

test('ontbrekendPerSoort geeft lege reeksen als er geen meetwaarden zijn', () => {
  const result = ontbrekendPerSoort({ dagen: [{ datum: '2026-01-01' }] });
  assert.deepEqual(result.stroom, { eerste: null, laatste: null, reeksen: [], totaal: 0 });
  assert.deepEqual(result.gas, { eerste: null, laatste: null, reeksen: [], totaal: 0 });
});

test('vergelijkPeriode vergelijkt totalen en rapporteert ontbrekende meetdagen', () => {
  const a = {
    perDag: new Map([
      ['2026-01-01', { dag: { afname: 2, terug: 0.5, gas: 1 } }],
      ['2026-01-02', { dag: { afname: 3, terug: 0, gas: null } }],
    ]),
  };
  const result = vergelijkPeriode(a, '2026-01-01', '2026-01-03', {
    afname: 5,
    terug: 0.5,
    gas: 1,
  });

  assert.deepEqual(result, [
    { maat: 'afname', app: 5, ander: 5, verschil: 0, pct: 0, oordeel: 'goed', ontbreekt: 1 },
    { maat: 'terug', app: 0.5, ander: 0.5, verschil: 0, pct: 0, oordeel: 'goed', ontbreekt: 1 },
    { maat: 'gas', app: 1, ander: 1, verschil: 0, pct: 0, oordeel: 'goed', ontbreekt: 2 },
  ]);
});

test('vergelijkPeriode classificeert kleine en grote afwijkingen', () => {
  const a = {
    perDag: new Map([
      ['2026-01-01', { dag: { afname: 102, terug: 0, gas: 0 } }],
    ]),
  };
  const result = vergelijkPeriode(a, '2026-01-01', '2026-01-01', {
    afname: 100,
    terug: 0,
  });

  assert.equal(result[0].oordeel, 'klein');
  assert.equal(result[1].oordeel, 'onbekend');
});
