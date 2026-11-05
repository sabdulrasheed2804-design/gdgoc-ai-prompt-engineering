import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalMode, setMember, getMember } from './store.js';

test('local mode round-trips a member record', async () => {
  const firebaseConfig = null;
  assert.equal(isLocalMode(firebaseConfig), true);
  await setMember('uid1', { name: 'Ada' }, { firebaseConfig });
  const m = await getMember('uid1', { firebaseConfig });
  assert.equal(m.name, 'Ada');
});
