import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { handleGradeLab } from '../src/index.js';

const FAKE_ENV = { GEMINI_API_KEY: 'fake', GEMINI_MODEL: 'fake-model' };

function makeFakeFirestore({ usage = {} } = {}) {
  const store = { docs: {}, labRuns: [] };
  for (const [uid, value] of Object.entries(usage)) store.docs[`apiUsage/${uid}`] = value;
  return {
    store,
    async getDocument(path) {
      return store.docs[path] ?? null;
    },
    async createDocument(collection, data) {
      if (collection === 'labRuns') store.labRuns.push(data);
    },
    async transactionalUpdate(path, computeNext) {
      const next = computeNext(store.docs[path] ?? null);
      store.docs[path] = next;
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
  assert.equal(firestore.store.docs['apiUsage/u2'], undefined);
});

test('accumulates tokensToday across calls instead of overwriting it', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({
    text: '{"answer":"x","confidence":"low"}',
    tokensUsed: 100,
  }));

  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.docs['apiUsage/u3'].tokensToday, 600);
  assert.equal(firestore.store.labRuns.length, 2);
});

test('writes a portfolio entry on a first passing submission', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  await handleGradeLab({ uid: 'u4', week: 1, labId: 'w1-json-lab', promptText: 'first try' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u4/entries/1'];
  assert.equal(entry.promptText, 'first try');
  assert.equal(entry.published, false);
  assert.equal(entry.rubricScore, 1);
});

test('keeps the first passing entry when a later submission also passes (grading is pass/fail, so ties always score 1)', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  await handleGradeLab({ uid: 'u5', week: 1, labId: 'w1-json-lab', promptText: 'first winning prompt' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u5', week: 1, labId: 'w1-json-lab', promptText: 'second winning prompt' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u5/entries/1'];
  assert.equal(entry.promptText, 'first winning prompt');
});

test('preserves an existing published flag across a later passing resubmission', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  await handleGradeLab({ uid: 'u7', week: 1, labId: 'w1-json-lab', promptText: 'first try' }, FAKE_ENV, firestore);
  firestore.store.docs['portfolio/u7/entries/1'].published = true; // the member published it
  await handleGradeLab({ uid: 'u7', week: 1, labId: 'w1-json-lab', promptText: 'second try' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u7/entries/1'];
  assert.equal(entry.published, true);
});

test('does not write a portfolio entry for a failing submission', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 5 }));

  await handleGradeLab({ uid: 'u6', week: 1, labId: 'w1-json-lab', promptText: 'bad' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.docs['portfolio/u6/entries/1'], undefined);
});

test('derives week from labId on the server, ignoring a client-supplied week', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  await handleGradeLab({ uid: 'u8', week: 7, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.labRuns[0].week, 1);
  assert.ok(firestore.store.docs['portfolio/u8/entries/1']);
  assert.equal(firestore.store.docs['portfolio/u8/entries/7'], undefined);
});

test('still charges tokens and returns a result even if the portfolio write fails', async () => {
  const firestore = makeFakeFirestore();
  const originalTransactionalUpdate = firestore.transactionalUpdate.bind(firestore);
  firestore.transactionalUpdate = async (path, computeNext) => {
    if (path.startsWith('portfolio/')) throw new Error('simulated Firestore failure');
    return originalTransactionalUpdate(path, computeNext);
  };
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  const result = await handleGradeLab({ uid: 'u9', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(result.passed, true);
  assert.equal(firestore.store.docs['apiUsage/u9'].tokensToday, 30);
  assert.equal(firestore.store.docs['portfolio/u9/entries/1'], undefined);
});
