import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from './stats.js';

test('a member with no lab runs gets all-zero stats, no NaN', () => {
  const stats = computeStats([], { totalLabs: 7 });
  assert.deepEqual(stats, { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 });
});

test('counts a lab once even after a failed attempt then a pass', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: false, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T11:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.labsPassed, 1);
  assert.equal(stats.xp, 10);
});

test('does not double-count XP for two passing runs of the same lab', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-02T10:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.xp, 10);
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
