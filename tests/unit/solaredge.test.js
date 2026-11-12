import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dagUitTekst,
  isSolarEdge,
  leesSolarEdge,
  maandUitTekst,
  nulReeksen,
} from '../../js/energie/import-solaredge.js';

test('SolarEdge herkent Nederlandse en Engelse maandnamen', () => {
  assert.equal(maandUitTekst('jan. 2025'), '2025-01');
  assert.equal(maandUitTekst('March 2025'), '2025-03');
  assert.equal(maandUitTekst('mei 2025'), '2025-05');
  assert.equal(maandUitTekst('onbekend 2025'), null);
});

test('SolarEdge herkent datumformaten en weigert ongeldige kalenderdatums', () => {
  assert.deepEqual(dagUitTekst('1 okt. 2026 08:30'), { datum: '2026-10-01', tijd: '08:30' });
  assert.deepEqual(dagUitTekst('Oct 1, 2026'), { datum: '2026-10-01', tijd: '00:00' });
  assert.deepEqual(dagUitTekst('2026-10-01'), { datum: '2026-10-01', tijd: '00:00' });
  assert.deepEqual(dagUitTekst('01-10-2026'), { datum: '2026-10-01', tijd: '00:00' });
  assert.equal(dagUitTekst('31-02-2026'), null);
});

test('SolarEdge herkent alleen exports met tijdkolom en opbrengstkolom', () => {
  assert.equal(isSolarEdge('Meettijd,Productie (kWh)\n1 okt. 2026,4'), true);
  assert.equal(isSolarEdge('Datum,Verbruik (kWh)\n1 okt. 2026,4'), false);
});

test('SolarEdge dagbestand telt Wh per dag op en houdt de onderste dubbele regel', () => {
  const csv = [
    'Meettijd,Productie (Wh),Verbruik (kWh)',
    '"1 okt. 2026 08:00",1000,0',
    '"1 okt. 2026 08:00",1500,0',
    '"1 okt. 2026 09:00",500,0',
    '"2 okt. 2026 00:00",2000,0',
    '"2 okt. 2026 01:00",500,0',
  ].join('\n');
  const result = leesSolarEdge(csv, '2026-11-12');
  assert.equal(result.soort, 'dag');
  assert.equal(result.interval, 'uur');
  assert.deepEqual(result.dagen, [
    { datum: '2026-10-01', zon: 2 },
    { datum: '2026-10-02', zon: 2.5 },
  ]);
  assert.equal(result.vanaf, '2026-10-01');
  assert.equal(result.tot, '2026-10-02');
  assert.equal(result.overgeslagen.find((x) => x.reden.startsWith('Tijdstippen'))?.aantal, 1);
});

test('SolarEdge maandbestand verwerkt Nederlandse decimale en duizendtallen', () => {
  const csv = [
    'Meettijd,Energy (kWh)',
    '"jan. 2025","1.234,5"',
    '"feb. 2025","0"',
    '"mrt. 2025","190,25"',
  ].join('\n');
  const result = leesSolarEdge(csv, '2026-11-12');
  assert.equal(result.soort, 'maand');
  assert.deepEqual(result.maanden, [
    { maand: '2025-01', zon: 1234.5 },
    { maand: '2025-02', zon: 0 },
    { maand: '2025-03', zon: 190.25 },
  ]);
});

test('nulReeksen meldt alleen aaneengesloten reeksen van minimaal drie dagen', () => {
  const dagen = [
    { datum: '2026-06-01', zon: 0 },
    { datum: '2026-06-02', zon: 0 },
    { datum: '2026-06-03', zon: 0 },
    { datum: '2026-06-04', zon: 4 },
    { datum: '2026-06-05', zon: 0 },
  ];
  assert.deepEqual(nulReeksen(dagen), ['1 jun t/m 3 jun 2026']);
});
