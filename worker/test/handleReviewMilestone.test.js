import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleReviewMilestone } from '../src/index.js';
import { MILESTONE_XP } from '../../site/js/stats.js';

function makeFakeFirestore(docs = {}) {
  const store = { docs: { ...docs } };
  return {
    store,
    async getDocument(path) {
      return store.docs[path] ?? null;
    },
    async createDocument() {},
    async transactionalUpdate(path, computeNext) {
      const next = computeNext(store.docs[path] ?? null);
      store.docs[path] = next;
      return next;
    },
  };
}

const PENDING = { id: 'm1-w1', memberId: 'm1', week: 1, status: 'pending', repoUrl: 'https://github.com/x/y', notes: 'n' };

function seeded() {
  return makeFakeFirestore({
    'admins/lead': { role: 'lead' },
    'milestones/m1-w1': { ...PENDING },
    'leaderboard/m1': { name: 'Ada', xp: 20, labsPassed: 2, streak: 1 },
  });
}

test('a non-admin cannot review a milestone (403) and nothing is written', async () => {
  const firestore = seeded();
  await assert.rejects(
    () => handleReviewMilestone({ uid: 'member', submissionId: 'm1-w1', status: 'approved' }, firestore),
    (err) => err.status === 403
  );
  assert.equal(firestore.store.docs['milestones/m1-w1'].status, 'pending');
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 20);
});

test('rejects a status outside approved/excellent/needs_work (400)', async () => {
  const firestore = seeded();
  await assert.rejects(
    () => handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'legendary' }, firestore),
    (err) => err.status === 400
  );
});

test('rejects a submission id that could escape the milestones path (400)', async () => {
  const firestore = seeded();
  await assert.rejects(
    () => handleReviewMilestone({ uid: 'lead', submissionId: '../admins/lead', status: 'approved' }, firestore),
    (err) => err.status === 400
  );
});

test('404s for a milestone that does not exist', async () => {
  const firestore = seeded();
  await assert.rejects(
    () => handleReviewMilestone({ uid: 'lead', submissionId: 'nope-w9', status: 'approved' }, firestore),
    (err) => err.status === 404
  );
});

test('approving awards the approved XP to the member and records it on the milestone', async () => {
  const firestore = seeded();
  const result = await handleReviewMilestone(
    { uid: 'lead', submissionId: 'm1-w1', status: 'approved', feedback: 'Nice', reviewerName: 'Lead Ada' },
    firestore
  );

  const milestone = firestore.store.docs['milestones/m1-w1'];
  assert.equal(milestone.status, 'approved');
  assert.equal(milestone.feedback, 'Nice');
  assert.equal(milestone.reviewerName, 'Lead Ada');
  assert.equal(milestone.xpAwarded, MILESTONE_XP.approved);
  assert.equal(milestone.repoUrl, PENDING.repoUrl); // other fields preserved
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 20 + MILESTONE_XP.approved);
  assert.equal(firestore.store.docs['leaderboard/m1'].name, 'Ada'); // other fields preserved
  assert.deepEqual(result, { status: 'approved', xpAwarded: MILESTONE_XP.approved, xpDelta: MILESTONE_XP.approved });
});

test('re-approving the same milestone does not pay out twice', async () => {
  const firestore = seeded();
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'approved' }, firestore);
  const second = await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'approved' }, firestore);

  assert.equal(second.xpDelta, 0);
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 20 + MILESTONE_XP.approved);
});

test('upgrading approved -> excellent adds only the difference', async () => {
  const firestore = seeded();
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'approved' }, firestore);
  const result = await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'excellent' }, firestore);

  assert.equal(result.xpDelta, MILESTONE_XP.excellent - MILESTONE_XP.approved);
  assert.equal(firestore.store.docs['milestones/m1-w1'].xpAwarded, MILESTONE_XP.excellent);
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 20 + MILESTONE_XP.excellent);
});

test('sending an approved milestone back for revisions takes its XP away again', async () => {
  const firestore = seeded();
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'excellent' }, firestore);
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'needs_work' }, firestore);

  assert.equal(firestore.store.docs['milestones/m1-w1'].xpAwarded, 0);
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 20);
});

test('leaderboard xp never goes below zero even if its doc was out of step', async () => {
  const firestore = seeded();
  firestore.store.docs['milestones/m1-w1'].xpAwarded = MILESTONE_XP.excellent;
  firestore.store.docs['leaderboard/m1'].xp = 5;
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'needs_work' }, firestore);
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, 0);
});

test('creates the leaderboard projection if the member has none yet', async () => {
  const firestore = seeded();
  delete firestore.store.docs['leaderboard/m1'];
  await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'approved' }, firestore);
  assert.equal(firestore.store.docs['leaderboard/m1'].xp, MILESTONE_XP.approved);
});

test('the review is still recorded if the leaderboard write fails', async () => {
  const firestore = seeded();
  const original = firestore.transactionalUpdate.bind(firestore);
  firestore.transactionalUpdate = async (path, computeNext) => {
    if (path.startsWith('leaderboard/')) throw new Error('simulated Firestore failure');
    return original(path, computeNext);
  };

  const result = await handleReviewMilestone({ uid: 'lead', submissionId: 'm1-w1', status: 'approved' }, firestore);
  assert.equal(result.status, 'approved');
  assert.equal(firestore.store.docs['milestones/m1-w1'].status, 'approved');
});

test('truncates over-long feedback and defaults a missing reviewer name', async () => {
  const firestore = seeded();
  await handleReviewMilestone(
    { uid: 'lead', submissionId: 'm1-w1', status: 'approved', feedback: 'x'.repeat(5000) },
    firestore
  );
  const milestone = firestore.store.docs['milestones/m1-w1'];
  assert.equal(milestone.feedback.length, 2000);
  assert.equal(milestone.reviewerName, 'Lead');
});
