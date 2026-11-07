import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBadges, renderBadgeGrid } from './badges.js';

test('computeBadges locks all badges when no activity has occurred', () => {
  const badges = computeBadges({
    labRuns: [],
    stats: { labsPassed: 0, totalLabs: 7, xp: 0, streak: 0 },
    portfolioEntries: [],
    milestones: [],
  });

  assert.ok(badges.length >= 8);
  const unlocked = badges.filter((b) => b.unlocked);
  assert.equal(unlocked.length, 0);
});

test('computeBadges unlocks First Prompt, JSON Wizard, and Streak badges on matching achievements', () => {
  const badges = computeBadges({
    labRuns: [
      { week: 1, labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' },
    ],
    stats: { labsPassed: 1, totalLabs: 7, xp: 10, streak: 3 },
    portfolioEntries: [{ week: 1, published: true }],
    milestones: [],
  });

  const firstPrompt = badges.find((b) => b.id === 'first-prompt');
  assert.equal(firstPrompt.unlocked, true);

  const jsonWizard = badges.find((b) => b.id === 'json-wizard');
  assert.equal(jsonWizard.unlocked, true);

  const streak3 = badges.find((b) => b.id === 'streak-3');
  assert.equal(streak3.unlocked, true);

  const publishedBadge = badges.find((b) => b.id === 'portfolio-published');
  assert.equal(publishedBadge.unlocked, true);
});

test('renderBadgeGrid renders badges with lock/unlock classes and titles', () => {
  const badges = [
    { id: 'b1', name: 'Badge One', icon: '🚀', description: 'Desc 1', unlocked: true },
    { id: 'b2', name: 'Badge Two', icon: '🔒', description: 'Desc 2', unlocked: false },
  ];
  const html = renderBadgeGrid(badges);
  assert.match(html, /Badge One/);
  assert.match(html, /badge-item--unlocked/);
  assert.match(html, /Badge Two/);
  assert.match(html, /badge-item--locked/);
});

