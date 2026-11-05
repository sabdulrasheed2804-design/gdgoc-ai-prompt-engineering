import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPortfolioManager, renderPublicPortfolio } from './portfolio.js';

test("renderPortfolioManager shows each entry's week, score, and publish state", () => {
  const el = { innerHTML: '' };
  renderPortfolioManager(el, [
    { week: 1, promptText: 'p1', outputSnippet: 'o1', rubricScore: 1, published: true },
    { week: 2, promptText: 'p2', outputSnippet: 'o2', rubricScore: 0.5, published: false },
  ]);
  assert.match(el.innerHTML, /Week 1/);
  assert.match(el.innerHTML, /Published/);
  assert.match(el.innerHTML, /Week 2/);
  assert.match(el.innerHTML, /Unpublished/);
});

test('renderPortfolioManager shows an empty state with no entries', () => {
  const el = { innerHTML: '' };
  renderPortfolioManager(el, []);
  assert.match(el.innerHTML, /no passing lab/i);
});

test('renderPublicPortfolio escapes prompt text', () => {
  const el = { innerHTML: '' };
  renderPublicPortfolio(el, [{ week: 1, promptText: '<script>', outputSnippet: 'o', rubricScore: 1 }]);
  assert.doesNotMatch(el.innerHTML, /<script>/);
});

test('renderPublicPortfolio shows an empty state with no published entries', () => {
  const el = { innerHTML: '' };
  renderPublicPortfolio(el, []);
  assert.match(el.innerHTML, /hasn.t published/i);
});
