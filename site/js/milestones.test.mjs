import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMilestone, renderMilestoneBox } from './milestones.js';

test('validateMilestone requires repoUrl and notes', () => {
  const invalid = validateMilestone({ repoUrl: '', notes: '' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.repoUrl);
  assert.ok(invalid.errors.notes);

  const invalidUrl = validateMilestone({ repoUrl: 'not-a-url', notes: 'Done' });
  assert.equal(invalidUrl.valid, false);
  assert.ok(invalidUrl.errors.repoUrl);

  const valid = validateMilestone({
    repoUrl: 'https://github.com/member/assistant',
    notes: 'Built structured output module with few-shot prompts.',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('renderMilestoneBox renders submission form when unsubmitted', () => {
  const html = renderMilestoneBox({
    week: 1,
    milestoneDesc: 'Start the assistant CLI',
    submission: null,
  });
  assert.match(html, /data-milestone-form/);
  assert.match(html, /data-week="1"/);
  assert.match(html, /Repository URL/i);
  assert.match(html, /Submit Milestone/i);
});

test('renderMilestoneBox renders status badge and feedback when reviewed', () => {
  const html = renderMilestoneBox({
    week: 2,
    milestoneDesc: 'Add structured output',
    submission: {
      status: 'approved',
      feedback: 'Excellent schema design!',
      reviewerName: 'Mentor Bob',
      repoUrl: 'https://github.com/member/repo',
      notes: 'Added schema validation',
    },
  });
  assert.match(html, /Approved/i);
  assert.match(html, /Excellent schema design!/);
  assert.match(html, /Mentor Bob/);
});

