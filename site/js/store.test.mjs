import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalMode, setMember, getMember, recordLabRun, getLabRuns } from './store.js';

test('local mode round-trips a member record', async () => {
  const firebaseConfig = null;
  assert.equal(isLocalMode(firebaseConfig), true);
  await setMember('uid1', { name: 'Ada' }, { firebaseConfig });
  const m = await getMember('uid1', { firebaseConfig });
  assert.equal(m.name, 'Ada');
});

test("getLabRuns returns only the given member's runs, in local mode", async () => {
  await recordLabRun('member-a', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  await recordLabRun('member-b', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  const runs = await getLabRuns('member-a', { firebaseConfig: null });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].memberId, 'member-a');
});
