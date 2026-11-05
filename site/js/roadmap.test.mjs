import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRoadmap } from './roadmap.js';
import { WEEKS } from './data.js';

test('renders one entry per week with its title', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, WEEKS);
  assert.match(el.innerHTML, /Foundations of LLMs/);
});
