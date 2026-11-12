import test from 'node:test';
import assert from 'node:assert/strict';
import { leesHomeWizard } from '../../js/energie/import-homewizard.js';

function csvMetUurstanden() {
  const regels = ['time,import t1,import t2,export t1,export t2'];
  for (let uur = 0; uur <= 24; uur++) {
    const dag = uur === 24 ? '2026-01-02' : '2026-01-01';
    const tijd = `${dag} ${String(uur % 24).padStart(2, '0')}:00:00`;
    regels.push(`${tijd},${uur},0,0,0`);
  }
  return regels.join('\n');
}

test('HomeWizard-uurstanden worden omgezet naar 24 uurwaarden en dagtotalen', () => {
  const result = leesHomeWizard(csvMetUurstanden());
  assert.equal(result.soort, 'stroom');
  assert.equal(result.dagen.length, 1);
  assert.equal(result.dagen[0].datum, '2026-01-01');
  assert.equal(result.dagen[0].afname, 24);
  assert.equal(result.dagen[0].terug, 0);
  assert.equal(result.dagen[0].uurAfname.length, 24);
  assert.equal(result.dagen[0].uurAfname.reduce((sum, value) => sum + value, 0), 24);
  assert.equal(result.vanaf, '2026-01-01');
  assert.equal(result.tot, '2026-01-01');
});

test('HomeWizard-import geeft een begrijpelijke fout bij een onbekend CSV-formaat', () => {
  assert.throws(
    () => leesHomeWizard('datum,waarde\n2026-01-01,12'),
    /Dit lijkt geen HomeWizard-export/,
  );
});

test('HomeWizard-import weigert een bestand zonder meterstanden', () => {
  assert.throws(
    () => leesHomeWizard('time,import t1,import t2,export t1,export t2\n'),
    /Het bestand is leeg/,
  );
});