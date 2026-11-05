import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpsError } from 'firebase-functions/v2/https';
import { gemini } from '../gemini.js';
import { handleGradeLab, DAILY_TOKEN_CAP } from '../index.js';

function makeFakeDb({ usage = {} } = {}) {
  const store = { usage: { ...usage }, labRuns: [] };
  let transactionQueue = Promise.resolve();

  function usageRef(uid) {
    return {
      _uid: uid,
      get: async () => ({
        exists: uid in store.usage,
        data: () => store.usage[uid],
      }),
      // non-transactional direct write, matching a real Firestore
      // DocumentReference -- used by code that doesn't go through a
      // transaction, so a regression to that path is still reproducible here
      set: async (data) => { store.usage[uid] = data; },
    };
  }

  return {
    store,
    collection(name) {
      if (name === 'apiUsage') return { doc: (uid) => usageRef(uid) };
      if (name === 'labRuns') return { add: async (data) => { store.labRuns.push(data); } };
      throw new Error(`unexpected collection ${name}`);
    },
    // Firestore transactions on the same document are serialized (via
    // retry-until-no-conflict); a fake that ran callbacks concurrently
    // would hide the exact lost-update bug this is meant to catch.
    runTransaction(fn) {
      const run = transactionQueue.then(() => fn({
        get: (ref) => ref.get(),
        set: (ref, data) => { store.usage[ref._uid] = data; },
      }));
      transactionQueue = run.catch(() => {});
      return run;
    },
  };
}

const today = new Date().toISOString().slice(0, 10);

test('rejects with resource-exhausted when the daily cap is already reached, without calling Gemini', async () => {
  const db = makeFakeDb({ usage: { u1: { tokensToday: DAILY_TOKEN_CAP, lastResetDate: today } } });
  const spy = test.mock.method(gemini, 'callGemini');

  await assert.rejects(
    () => handleGradeLab({ uid: 'u1', week: 1, labId: 'w1-json-lab', promptText: 'x' }, { db }),
    (err) => err instanceof HttpsError && err.code === 'resource-exhausted'
  );
  assert.equal(spy.mock.calls.length, 0);
  assert.equal(db.store.labRuns.length, 0);
});

test('does not write a labRuns record when Gemini fails', async () => {
  const db = makeFakeDb();
  test.mock.method(gemini, 'callGemini', async () => { throw new Error('network down'); });

  await assert.rejects(
    () => handleGradeLab({ uid: 'u2', week: 1, labId: 'w1-json-lab', promptText: 'x' }, { db }),
    (err) => err instanceof HttpsError && err.code === 'unavailable'
  );
  assert.equal(db.store.labRuns.length, 0);
  assert.equal(db.store.usage.u2, undefined);
});

test('accumulates tokensToday across concurrent calls instead of losing an update', async () => {
  const db = makeFakeDb();
  test.mock.method(gemini, 'callGemini', async () => ({
    text: '{"answer":"x","confidence":"low"}',
    tokensUsed: 100,
  }));

  // Both calls start before either finishes, so both see the same initial
  // usage snapshot -- this is what a non-transactional read-then-set loses.
  await Promise.all([
    handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, { db }),
    handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, { db }),
  ]);

  assert.equal(db.store.usage.u3.tokensToday, 600); // 3 rubric questions x 100 tokens x 2 calls
  assert.equal(db.store.labRuns.length, 2);
});
