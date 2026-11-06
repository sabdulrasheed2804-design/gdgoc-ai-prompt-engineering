import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPortfolioManager, renderPublicPortfolio, toggleAndReport } from './portfolio.js';

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

test("renderPortfolioManager shows the member's shareable public URL when given one", () => {
  const el = { innerHTML: '' };
  renderPortfolioManager(el, [], { publicUrl: 'http://example.com/index.html#public/u1' });
  assert.match(el.innerHTML, /http:\/\/example\.com\/index\.html#public\/u1/);
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

test('toggleAndReport reports ok on a successful write', async () => {
  const result = await toggleAndReport({
    setPortfolioPublished: async () => {},
    uid: 'u1', week: 1, nextPublished: true,
  });
  assert.equal(result.ok, true);
});

test('toggleAndReport reports the error message instead of throwing when the write fails', async () => {
  const result = await toggleAndReport({
    setPortfolioPublished: async () => { throw new Error('Missing or insufficient permissions.'); },
    uid: 'u1', week: 1, nextPublished: true,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Missing or insufficient permissions.');
});
