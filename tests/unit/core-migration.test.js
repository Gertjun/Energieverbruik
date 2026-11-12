import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, merge } from '../../js/energie/model.js';
import { SYSTEM_KEY, reconcileData } from '../../js/core/deletions.js';

test('Core-migratie registreert legacy tombstones voordat een offline apparaat ze heeft bevestigd', () => {
  const deletedAt = Date.now() - 181 * 86_400_000;
  const state = {
    version: 1,
    devices: { 'synthetic-offline-device': { createdAt: 1, lastSeenAt: 2, acknowledged: {} } },
    deletions: {},
  };
  const migrated = migrate({
    schema: 5,
    dagen: [{ id: 'synthetic-old-day', deleted: true, updatedAt: deletedAt }],
    [SYSTEM_KEY]: state,
  });
  const reconciled = reconcileData(migrated, { schema: 5, dagen: [], [SYSTEM_KEY]: state }, merge);

  assert.equal(reconciled.schema, 5);
  assert.equal(reconciled[SYSTEM_KEY].deletions['dagen:synthetic-old-day'], deletedAt);
  assert.equal(reconciled.dagen.length, 1);
});
