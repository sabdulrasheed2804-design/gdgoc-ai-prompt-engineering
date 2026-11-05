import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from './router.js';

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
