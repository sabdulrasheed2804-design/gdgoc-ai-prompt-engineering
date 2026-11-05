import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute, createRunner } from './router.js';

test('resolveRoute returns the key matching the hash', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '#roadmap', 'dashboard'), 'roadmap');
});

test('resolveRoute falls back on an empty hash', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '', 'dashboard'), 'dashboard');
});

test('resolveRoute falls back on a hash matching no route', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '#nonsense', 'dashboard'), 'dashboard');
});

test('resolveRoute falls back on a hash matching an inherited property name, not Object.prototype', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '#constructor', 'dashboard'), 'dashboard');
});

test('a slower route call is not allowed to overwrite a faster, later call (stale-render race)', async () => {
  const mountEl = { innerHTML: '' };
  let resolveSlow;
  const run = createRunner({
    slow: async (el, isStale) => {
      await new Promise((resolve) => { resolveSlow = resolve; });
      if (isStale()) return;
      el.innerHTML = 'SLOW';
    },
    fast: async (el) => {
      el.innerHTML = 'FAST';
    },
  }, 'slow');

  const slowPromise = run('#slow', mountEl);
  const fastResult = await run('#fast', mountEl);
  resolveSlow();
  const slowResult = await slowPromise;

  assert.equal(mountEl.innerHTML, 'FAST');
  assert.equal(slowResult.stale, true);
  assert.equal(fastResult.stale, false);
});

test('a route that throws renders an error message instead of leaving mountEl unchanged', async () => {
  const mountEl = { innerHTML: 'previous content' };
  const run = createRunner({ dashboard: async () => { throw new Error('boom'); } }, 'dashboard');

  const result = await run('#dashboard', mountEl);

  assert.match(mountEl.innerHTML, /refresh/i);
  assert.equal(result.stale, false);
});
