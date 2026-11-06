import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './util.js';

test('escapeHtml escapes the five HTML-sensitive characters', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
