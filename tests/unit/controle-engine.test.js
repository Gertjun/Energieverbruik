import test from 'node:test';
import assert from 'node:assert/strict';
import { controleer } from '../../js/energie/controle.js';

const analyse = (dag) => ({
  dagen: [dag],
  perDag: new Map([[dag.datum, { dag }]]),
});

test('controleer markeert negatieve meetwaarden als fout', () => {
  const result = controleer(analyse({
    datum: '2026-01-05', afname: -1, terug: 0, gas: 0,
  }));
  assert.ok(result.lijst.some((melding) =>
    melding.datum === '2026-01-05'
    && melding.soort === 'negatief'
    && melding.maat === 'afname'
    && melding.ernst === 'fout'));
});

test('controleer signaleert uurwaarden die niet optellen tot het dagtotaal', () => {
  const result = controleer(analyse({
    datum: '2026-01-05', afname: 2, terug: 0, gas: null,
    uurAfname: [0.5],
  }));
  assert.ok(result.lijst.some((melding) =>
    melding.soort === 'uursom'
    && melding.maat === 'afname'
    && melding.ernst === 'fout'));
});

test('controleer signaleert teruglevering tijdens nachtelijke uren', () => {
  const uurTerug = Array(24).fill(0);
  uurTerug[2] = 0.2;
  const result = controleer(analyse({
    datum: '2026-01-05', afname: 2, terug: 0.2, gas: null,
    uurTerug,
  }));
  assert.ok(result.lijst.some((melding) =>
    melding.soort === 'nacht'
    && melding.maat === 'terug'
    && melding.ernst === 'fout'));
});

test('controleer laat een geldige dag zonder afwijkingen ongemoeid', () => {
  const result = controleer(analyse({
    datum: '2026-01-05', afname: 2, terug: 0, gas: null,
    uurAfname: [2],
  }));
  assert.deepEqual(result.lijst, []);
  assert.equal(result.afgevinkt, 0);
});
