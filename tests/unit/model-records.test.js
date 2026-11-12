import test from 'node:test';
import assert from 'node:assert/strict';
import { dagId, maandId, weerId, zonId, merge, migrate, upsert } from '../../js/energie/model.js';
import { alive, mergeCollections, removeById } from '../../js/core/records.js';
import { SYSTEM_KEY, reconcileData } from '../../js/core/deletions.js';

test('datumgebonden records hebben stabiele ids', () => {
  assert.equal(dagId('2026-11-11'), 'd:2026-11-11');
  assert.equal(weerId('2026-11-11'), 'w:2026-11-11');
  assert.equal(maandId('2026-11'), 'm:2026-11');
  assert.equal(zonId('2026-11-11'), 'z:2026-11-11');
});

test('upsert voegt toe en werkt een bestaand record bij', () => {
  const records = [];
  upsert(records, 'd:2026-11-11', { datum: '2026-11-11', afname: 4 });
  const createdAt = records[0].createdAt;
  upsert(records, 'd:2026-11-11', { afname: 5 });
  assert.equal(records.length, 1);
  assert.equal(records[0].afname, 5);
  assert.equal(records[0].createdAt, createdAt);
  assert.ok(records[0].updatedAt >= createdAt);
});

test('samenvoegen kiest per id de nieuwste wijziging; bij gelijke tijd wint lokaal', () => {
  const merged = mergeCollections(
    [{ id: 'a', updatedAt: 3, value: 'local' }],
    [{ id: 'a', updatedAt: 2, value: 'remote' }, { id: 'b', updatedAt: 1 }],
  );
  assert.equal(merged.find((r) => r.id === 'a').value, 'local');
  assert.equal(merged.length, 2);
});

test('verwijderen maakt een tombstone en alive filtert die uit', () => {
  const records = [{ id: 'a', updatedAt: 1 }, { id: 'b', updatedAt: 1 }];
  removeById(records, 'a');
  assert.equal(records[0].deleted, true);
  assert.deepEqual(alive(records).map((r) => r.id), ['b']);
});

test('model merge behoudt collecties en de nieuwste instellingen', () => {
  const local = { schema: 4, dagen: [{ id: 'd', updatedAt: 2, afname: 3 }], instellingen: { updatedAt: 5, plaats: 'Oss' } };
  const remote = { schema: 5, dagen: [{ id: 'd', updatedAt: 1, afname: 2 }], instellingen: { updatedAt: 4, plaats: 'Eindhoven' } };
  const merged = merge(local, remote);
  assert.equal(merged.schema, 5);
  assert.equal(merged.dagen[0].afname, 3);
  assert.equal(merged.instellingen.plaats, 'Oss');
});

test('migrate behoudt oude tombstones zodat Core de verwijdering kan vastleggen', () => {
  const now = Date.now();
  const deletedAt = now - 181 * 86_400_000;
  const syncState = {
    version: 1,
    devices: { 'synthetic-offline-device': { createdAt: 1, lastSeenAt: 2, acknowledged: {} } },
    deletions: {},
  };
  const migrated = migrate({
    schema: 5,
    dagen: [{ id: 'synthetic-old-day', deleted: true, updatedAt: deletedAt }],
    [SYSTEM_KEY]: syncState,
  });

  assert.equal(migrated.schema, 5);
  assert.equal(migrated.dagen.length, 1);
  assert.equal(migrated.dagen[0].deleted, true);
  assert.deepEqual(migrated[SYSTEM_KEY], syncState);

  const reconciled = reconcileData(migrated, {
    schema: 5,
    dagen: [],
    [SYSTEM_KEY]: syncState,
  }, merge);
  assert.equal(reconciled[SYSTEM_KEY].deletions['dagen:synthetic-old-day'], deletedAt);
  assert.equal(reconciled.dagen.length, 1, 'offline apparaat heeft de verwijdering nog niet bevestigd');
});
