import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDashboard } from './dashboard.js';

test('renders the member name and all four stats', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: 'Ada' },
    stats: { labsPassed: 2, totalLabs: 7, progressPct: 29, xp: 20, streak: 3 },
  });
  assert.match(el.innerHTML, /Ada/);
  assert.match(el.innerHTML, /2\/7/);
  assert.match(el.innerHTML, /29/);
  assert.match(el.innerHTML, /20/);
  assert.match(el.innerHTML, /3/);
});

test('escapes a member name containing HTML', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: '<script>' },
    stats: { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 },
  });
  assert.doesNotMatch(el.innerHTML, /<script>/);
});

test('falls back to a generic greeting when the member has no name', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: null },
    stats: { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 },
  });
  assert.match(el.innerHTML, /Welcome back/);
});
