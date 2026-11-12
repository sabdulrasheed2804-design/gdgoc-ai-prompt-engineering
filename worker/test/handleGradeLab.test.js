import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { handleGradeLab } from '../src/index.js';
import { mockCorrectAnswers } from './helpers.js';

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
  mockCorrectAnswers('w1-json-lab', 100);

  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u3', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.docs['apiUsage/u3'].tokensToday, 600);
  assert.equal(firestore.store.labRuns.length, 2);
});

test('writes a portfolio entry on a first passing submission', async () => {
  const firestore = makeFakeFirestore();
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u4', week: 1, labId: 'w1-json-lab', promptText: 'first try' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u4/entries/1'];
  assert.equal(entry.promptText, 'first try');
  assert.equal(entry.published, false);
  assert.equal(entry.rubricScore, 1);
});

test('keeps the first passing entry when a later submission also passes (grading is pass/fail, so ties always score 1)', async () => {
  const firestore = makeFakeFirestore();
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u5', week: 1, labId: 'w1-json-lab', promptText: 'first winning prompt' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u5', week: 1, labId: 'w1-json-lab', promptText: 'second winning prompt' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u5/entries/1'];
  assert.equal(entry.promptText, 'first winning prompt');
});

test('preserves an existing published flag across a later passing resubmission', async () => {
  const firestore = makeFakeFirestore();
  mockCorrectAnswers('w1-json-lab');

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
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u8', week: 7, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.labRuns[0].week, 1);
  assert.ok(firestore.store.docs['portfolio/u8/entries/1']);
  assert.equal(firestore.store.docs['portfolio/u8/entries/7'], undefined);
});

test('writes leaderboard xp/labsPassed/streak on a first passing submission', async () => {
  const firestore = makeFakeFirestore();
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u10', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['leaderboard/u10'];
  assert.equal(entry.xp, 10);
  assert.equal(entry.labsPassed, 1);
  assert.equal(entry.streak, 1);
  assert.equal(entry.lastActiveDate, today);
});

test('updates leaderboard streak/lastActiveDate on a failing submission too, without xp', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 5 }));

  await handleGradeLab({ uid: 'u11', week: 1, labId: 'w1-json-lab', promptText: 'bad' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['leaderboard/u11'];
  assert.equal(entry.xp, 0);
  assert.equal(entry.labsPassed, 0);
  assert.equal(entry.streak, 1);
  assert.equal(entry.lastActiveDate, today);
});

test('does not double-count xp/labsPassed on a second pass for the same week', async () => {
  const firestore = makeFakeFirestore();
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u12', week: 1, labId: 'w1-json-lab', promptText: 'first' }, FAKE_ENV, firestore);
  await handleGradeLab({ uid: 'u12', week: 1, labId: 'w1-json-lab', promptText: 'second' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['leaderboard/u12'];
  assert.equal(entry.xp, 10);
  assert.equal(entry.labsPassed, 1);
});

test('increments streak when the previous active day was yesterday, resets after a gap', async () => {
  const yesterday = new Date(new Date(`${today}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  const firestore = makeFakeFirestore();
  firestore.store.docs['leaderboard/u13'] = { xp: 0, labsPassed: 0, streak: 5, lastActiveDate: yesterday };
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 5 }));

  await handleGradeLab({ uid: 'u13', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);
  assert.equal(firestore.store.docs['leaderboard/u13'].streak, 6);

  const firestore2 = makeFakeFirestore();
  firestore2.store.docs['leaderboard/u14'] = { xp: 0, labsPassed: 0, streak: 5, lastActiveDate: '2000-01-01' };
  await handleGradeLab({ uid: 'u14', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore2);
  assert.equal(firestore2.store.docs['leaderboard/u14'].streak, 1);
});

test('preserves self-written name/level/department fields already on the leaderboard doc', async () => {
  const firestore = makeFakeFirestore();
  firestore.store.docs['leaderboard/u15'] = { name: 'Ada', level: '300', department: 'CS' };
  mockCorrectAnswers('w1-json-lab');

  await handleGradeLab({ uid: 'u15', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['leaderboard/u15'];
  assert.equal(entry.name, 'Ada');
  assert.equal(entry.level, '300');
  assert.equal(entry.department, 'CS');
  assert.equal(entry.xp, 10);
});

test('still returns a result even if the leaderboard write fails', async () => {
  const firestore = makeFakeFirestore();
  const originalTransactionalUpdate = firestore.transactionalUpdate.bind(firestore);
  firestore.transactionalUpdate = async (path, computeNext) => {
    if (path.startsWith('leaderboard/')) throw new Error('simulated Firestore failure');
    return originalTransactionalUpdate(path, computeNext);
  };
  mockCorrectAnswers('w1-json-lab');

  const result = await handleGradeLab({ uid: 'u16', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(result.passed, true);
  assert.equal(firestore.store.docs['leaderboard/u16'], undefined);
});

test('still charges tokens and returns a result even if the portfolio write fails', async () => {
  const firestore = makeFakeFirestore();
  const originalTransactionalUpdate = firestore.transactionalUpdate.bind(firestore);
  firestore.transactionalUpdate = async (path, computeNext) => {
    if (path.startsWith('portfolio/')) throw new Error('simulated Firestore failure');
    return originalTransactionalUpdate(path, computeNext);
  };
  mockCorrectAnswers('w1-json-lab');

  const result = await handleGradeLab({ uid: 'u9', week: 1, labId: 'w1-json-lab', promptText: 'x' }, FAKE_ENV, firestore);

  assert.equal(result.passed, true);
  assert.equal(firestore.store.docs['apiUsage/u9'].tokensToday, 30);
  assert.equal(firestore.store.docs['portfolio/u9/entries/1'], undefined);
});
