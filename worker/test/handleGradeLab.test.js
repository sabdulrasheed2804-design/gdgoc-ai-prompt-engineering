import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { handleGradeLab } from '../src/index.js';

const FAKE_ENV = { GEMINI_API_KEY: 'fake', GEMINI_MODEL: 'fake-model' };

function makeFakeFirestore({ usage = {} } = {}) {
  const store = { usage: { ...usage }, labRuns: [] };
  return {
    store,
    async getDocument(path) {
      const uid = path.split('/')[1];
      return store.usage[uid] ?? null;
    },
    async createDocument(collection, data) {
      if (collection === 'labRuns') store.labRuns.push(data);
    },
    async transactionalUpdate(path, computeNext) {
      const uid = path.split('/')[1];
      const next = computeNext(store.usage[uid] ?? null);
      store.usage[uid] = next;
      return next;
    },
  };
}

const today = new Date().toISOString().slice(0, 10);

test('rejects with a 429 when the daily cap is already reached, without calling Gemini', async () => {
  const firestore = makeFakeFirestore({ usage: { u1: { tokensToday: 50000, lastResetDate: today } } });
  const spy = test.mock.method(gemini, 'callGemini');

  await assert.rejects(
    () => handleGradeLab({ uid: 'u1', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore),
    (err) => err.status === 429
  );
  assert.equal(spy.mock.calls.length, 0);
  assert.equal(firestore.store.labRuns.length, 0);
});

test('does not write a labRuns record when Gemini fails', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => { throw new Error('network down'); });

  await assert.rejects(
    () => handleGradeLab({ uid: 'u2', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore),
    (err) => err.status === 503
  );
  assert.equal(firestore.store.labRuns.length, 0);
  assert.equal(firestore.store.usage.u2, undefined);
});

test('accumulates tokensToday across calls instead of overwriting it', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({
    text: '{"answer":"x","confidence":"low"}',
    tokensUsed: 100,
  }));

  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.usage.u3.tokensToday, 600);
  assert.equal(firestore.store.labRuns.length, 2);
});
