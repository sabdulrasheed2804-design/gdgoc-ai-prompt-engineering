import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, milestoneXp, MILESTONE_XP, XP_PER_LAB } from './stats.js';

test('a member with no lab runs gets all-zero stats, no NaN', () => {
  const stats = computeStats([], { totalLabs: 7 });
  assert.deepEqual(stats, { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, milestoneXp: 0, streak: 0 });
});

test('counts a lab once even after a failed attempt then a pass', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: false, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T11:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.labsPassed, 1);
  assert.equal(stats.xp, XP_PER_LAB);
});

test('does not double-count XP for two passing runs of the same lab', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-02T10:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.xp, XP_PER_LAB);
});

test('progressPct is the rounded percentage of distinct passed labs over totalLabs', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' },
  ];
  assert.equal(computeStats(labRuns, { totalLabs: 4 }).progressPct, 25);
});

test('streak counts consecutive active days ending today', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');
  const labRuns = [
    { labId: 'a', passed: true, timestamp: '2026-11-03T10:00:00.000Z' },
    { labId: 'b', passed: true, timestamp: '2026-11-04T10:00:00.000Z' },
    { labId: 'c', passed: true, timestamp: '2026-11-05T10:00:00.000Z' },
  ];
  assert.equal(computeStats(labRuns, { totalLabs: 7, now }).streak, 3);
});

test('streak is 0 when the most recent activity was not today', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');
  const labRuns = [{ labId: 'a', passed: true, timestamp: '2026-11-03T10:00:00.000Z' }];
  assert.equal(computeStats(labRuns, { totalLabs: 7, now }).streak, 0);
});

test('reviewed milestones add the XP the Worker recorded on them', () => {
  const labRuns = [{ labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' }];
  const milestones = [
    { week: 1, status: 'approved', xpAwarded: MILESTONE_XP.approved },
    { week: 2, status: 'excellent', xpAwarded: MILESTONE_XP.excellent },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7, milestones });
  assert.equal(stats.milestoneXp, MILESTONE_XP.approved + MILESTONE_XP.excellent);
  assert.equal(stats.xp, XP_PER_LAB + MILESTONE_XP.approved + MILESTONE_XP.excellent);
});

test('a submitted-but-unreviewed milestone, or one approved before XP existed, is worth 0 until a lead reviews it', () => {
  // xpAwarded is only ever set by the Worker on review -- a member cannot
  // earn XP by submitting, and an old approval with no xpAwarded stays in
  // step with the leaderboard (which was never bumped for it) rather than
  // showing XP on the dashboard that the ranking doesn't have.
  assert.equal(milestoneXp({ status: 'pending' }), 0);
  assert.equal(milestoneXp({ status: 'approved' }), 0);
  assert.equal(milestoneXp({ status: 'needs_work', xpAwarded: 0 }), 0);
  assert.equal(computeStats([], { totalLabs: 7, milestones: [{ status: 'approved' }] }).xp, 0);
});
