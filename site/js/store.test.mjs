import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalMode, setMember, getMember } from './store.js';

test('local mode round-trips a member record', async () => {
  assert.equal(isLocalMode(), true);
  await setMember('uid1', { name: 'Ada' });
  const m = await getMember('uid1');
  assert.equal(m.name, 'Ada');
});
