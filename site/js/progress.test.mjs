import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeekUnlocks } from './progress.js';

const WEEKS = [
  { week: 1, lab: { id: 'w1-lab' } },
  { week: 2, lab: { id: 'w2-lab' } },
  { week: 3, lab: { id: 'w3-lab' } },
  { week: 4, lab: undefined }, // capstone-style week with no lab
];

test('week 1 is always unlocked, even with no lab runs at all', () => {
  const result = computeWeekUnlocks(WEEKS, []);
  assert.equal(result[0].unlocked, true);
});

test('a week stays locked until the previous week\'s lab is passed', () => {
  const result = computeWeekUnlocks(WEEKS, []);
  assert.equal(result[1].unlocked, false);
  assert.equal(result[2].unlocked, false);
});

test('passing a week\'s lab unlocks the next week but not the one after it', () => {
  const result = computeWeekUnlocks(WEEKS, [{ labId: 'w1-lab', passed: true }]);
  assert.equal(result[0].completed, true);
  assert.equal(result[1].unlocked, true);
  assert.equal(result[2].unlocked, false);
});

test('a failing lab run does not count as completing the week', () => {
  const result = computeWeekUnlocks(WEEKS, [{ labId: 'w1-lab', passed: false }]);
  assert.equal(result[0].completed, false);
  assert.equal(result[1].unlocked, false);
});

test('completing every lab in order unlocks all the way to the end', () => {
  const result = computeWeekUnlocks(WEEKS, [
    { labId: 'w1-lab', passed: true },
    { labId: 'w2-lab', passed: true },
    { labId: 'w3-lab', passed: true },
  ]);
  assert.ok(result.every((w) => w.unlocked));
});

test('a week with no lab is treated as complete once it is reached, so it never blocks a week after it', () => {
  const result = computeWeekUnlocks(WEEKS, [
    { labId: 'w1-lab', passed: true },
    { labId: 'w2-lab', passed: true },
    { labId: 'w3-lab', passed: true },
  ]);
  assert.equal(result[3].unlocked, true);
  assert.equal(result[3].completed, true);
});
