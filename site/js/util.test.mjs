import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, isHttpUrl } from './util.js';

test('escapeHtml escapes the five HTML-sensitive characters', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('isHttpUrl accepts http(s) URLs and rejects everything else', () => {
  assert.equal(isHttpUrl('https://example.com'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
  assert.equal(isHttpUrl('javascript:alert(1)'), false);
  assert.equal(isHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isHttpUrl(''), false);
  assert.equal(isHttpUrl(undefined), false);
  assert.equal(isHttpUrl(null), false);
});
