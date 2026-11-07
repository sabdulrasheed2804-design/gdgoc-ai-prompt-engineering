import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduledDate, annotateWeekStatus } from './pacing.js';

const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8].map((week) => ({ week, title: `W${week}` }));

test('scheduledDate adds 7 days per week number, relative to week 1', () => {
  assert.equal(scheduledDate(1, '2026-11-12'), '2026-11-12');
  assert.equal(scheduledDate(2, '2026-11-12'), '2026-11-19');
  assert.equal(scheduledDate(3, '2026-11-12'), '2026-11-26');
});

test('before the program starts, week 1 is current and the rest are upcoming', () => {
  const result = annotateWeekStatus(WEEKS, { weekStart: '2026-11-12', today: '2026-11-07' });
  assert.equal(result.find((w) => w.week === 1).status, 'current');
  assert.ok(result.filter((w) => w.week > 1).every((w) => w.status === 'upcoming'));
});

test('a week on its scheduled date is current; earlier weeks are past, later ones upcoming', () => {
  const result = annotateWeekStatus(WEEKS, { weekStart: '2026-11-12', today: '2026-11-26' });
  assert.equal(result.find((w) => w.week === 3).status, 'current');
  assert.ok(result.filter((w) => w.week < 3).every((w) => w.status === 'past'));
  assert.ok(result.filter((w) => w.week > 3).every((w) => w.status === 'upcoming'));
});

test('once the program has ended, the last week stays current and nothing is upcoming', () => {
  const result = annotateWeekStatus(WEEKS, { weekStart: '2026-11-12', today: '2027-06-01' });
  assert.equal(result.find((w) => w.week === 8).status, 'current');
  assert.ok(result.filter((w) => w.week < 8).every((w) => w.status === 'past'));
  assert.ok(result.every((w) => w.status !== 'upcoming'));
});
