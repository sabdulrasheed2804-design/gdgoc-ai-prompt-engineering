import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActivityMap, validateJournalEntry, renderJournalView } from './journal.js';

test('buildActivityMap aggregates counts across dates accurately', () => {
  const today = new Date().toISOString().slice(0, 10);
  const labRuns = [{ timestamp: `${today}T12:00:00.000Z` }];
  const journalEntries = [{ createdAt: new Date().getTime(), date: today }];

  const map = buildActivityMap({ labRuns, journalEntries, daysCount: 7 });
  assert.equal(map.length, 7);

  const todayItem = map.find((item) => item.date === today);
  assert.ok(todayItem);
  assert.equal(todayItem.count, 2);
  assert.equal(todayItem.level, 2);
});

test('validateJournalEntry checks title and content', () => {
  const invalid = validateJournalEntry({ title: '', content: '' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.title);
  assert.ok(invalid.errors.content);

  const valid = validateJournalEntry({
    title: 'Learned Few-Shot Prompting',
    content: 'Order of examples has a huge impact on classification bias.',
  });
  assert.equal(valid.valid, true);
});

test('renderJournalView renders heatmap and past reflections', () => {
  const el = { innerHTML: '' };
  const entries = [
    { id: 'j1', title: 'Explored RAG', content: 'Chunking size matters for context precision.', date: '2026-11-05' },
  ];
  renderJournalView(el, { entries, activityData: [] });

  assert.match(el.innerHTML, /Explored RAG/);
  assert.match(el.innerHTML, /Chunking size matters/);
  assert.match(el.innerHTML, /activity-heatmap/);
  assert.match(el.innerHTML, /data-journal-form/);
});

