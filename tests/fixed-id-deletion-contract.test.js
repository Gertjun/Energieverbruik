import test from 'node:test';
import assert from 'node:assert/strict';
import { merge as mergeApp } from '../js/energie/model.js';
import { zetExcel, zetSolarEdge, maakImportOngedaan } from '../js/energie/importeren.js';
import { reconcileData, SYSTEM_KEY } from '../js/core/deletions.js';

const datum = '2026-10-01';
const maand = '2026-10';
const excelInput = () => ({
  dagen: [{ datum, afname: 5.25, terug: 1.25, gas: 0.8 }],
  weer: [{ datum, tgem: 11.5 }],
  maanden: [{ maand, termijn: 42 }],
});
const solarInput = () => ({
  soort: 'dag', dagen: [{ datum, zon: 4.75 }],
  vanaf: datum, tot: datum, regels: 1, interval: 'dag',
  overgeslagen: [], meldingen: [],
});

test('import ongedaan maken → opnieuw importeren → synchroniseren herstelt vaste IDs in alle collecties', () => {
  const realNow = Date.now;
  let clock = 1_800_000_000_000;
  Date.now = () => ++clock;
  try {
    const data = { dagen: [], weer: [], maanden: [], zon: [], importen: [] };
    const eersteExcel = zetExcel(data, excelInput(), 'synthetisch.xlsx');
    const eersteSolar = zetSolarEdge(data, solarInput(), 'synthetisch-solaredge.csv');

    // Ongedaan maken gebruikt removeById en schrijft tombstones voor de vaste IDs.
    maakImportOngedaan(data, eersteSolar.id);
    maakImportOngedaan(data, eersteExcel.id);
    const verwijderdeSnapshot = structuredClone(data);

    const ids = {
      dagen: 'd:' + datum,
      weer: 'w:' + datum,
      maanden: 'm:' + maand,
      zon: 'z:' + datum,
    };
    for (const [collectie, id] of Object.entries(ids)) {
      const tombstone = verwijderdeSnapshot[collectie].find((record) => record.id === id);
      assert.equal(tombstone?.deleted, true, collectie + ' moet na ongedaan maken een tombstone hebben');
    }

    // Herimport maakt dezelfde vaste IDs opnieuw aan met een nieuw updatedAt.
    zetExcel(data, excelInput(), 'synthetisch-opnieuw.xlsx');
    zetSolarEdge(data, solarInput(), 'synthetisch-solaredge-opnieuw.csv');
    const hersteldeSnapshot = structuredClone(data);

    const mergeSync = (local, remote) => mergeApp(local, remote);
    const opLaptop = reconcileData(hersteldeSnapshot, verwijderdeSnapshot, mergeSync);
    for (const [collectie, id] of Object.entries(ids)) {
      const record = opLaptop[collectie].find((item) => item.id === id);
      assert.ok(record, collectie + ' record moet behouden blijven');
      assert.notEqual(record.deleted, true, collectie + ' record mag niet verwijderd blijven');
      assert.equal(Object.hasOwn(opLaptop[SYSTEM_KEY].deletions, collectie + ':' + id), false);
    }

    const opTelefoon = reconcileData(verwijderdeSnapshot, opLaptop, mergeSync);
    for (const [collectie, id] of Object.entries(ids)) {
      const record = opTelefoon[collectie].find((item) => item.id === id);
      assert.ok(record, collectie + ' record moet ook op het tweede apparaat behouden blijven');
      assert.notEqual(record.deleted, true);
      assert.equal(Object.hasOwn(opTelefoon[SYSTEM_KEY].deletions, collectie + ':' + id), false);
    }
  } finally {
    Date.now = realNow;
  }
});
