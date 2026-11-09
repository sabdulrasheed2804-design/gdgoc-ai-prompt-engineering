import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderWeekMenu, renderWeekDetail, runLabSubmission } from './roadmap.js';

test('keeps the passed message even if the local history mirror write fails', async () => {
  const outcome = await runLabSubmission({
    submitLab: async () => ({ passed: true, score: 1, feedback: 'nice' }),
    recordLabRun: async () => { throw new Error('Missing or insufficient permissions.'); },
    memberId: 'm1',
    week: 1,
    labId: 'w1-json-lab',
    promptText: 'x',
  });
  assert.equal(outcome.text, 'Passed: nice');
});

test('surfaces the submitLab error message on failure', async () => {
  const outcome = await runLabSubmission({
    submitLab: async () => { throw new Error('cap reached'); },
    recordLabRun: async () => {},
    memberId: 'm1',
    week: 1,
    labId: 'w1-json-lab',
    promptText: 'x',
  });
  assert.equal(outcome.text, 'cap reached');
});

const SAMPLE_WEEKS = [
  { week: 1, title: 'Foundations', objectives: 'Learn the basics.', unlocked: true, completed: true },
  { week: 2, title: 'Patterns', objectives: 'Go further.', unlocked: true, completed: false },
  { week: 3, title: 'Reasoning', objectives: 'Think step by step.', unlocked: false, completed: false },
];

test('renderWeekMenu renders a tile per week with the right lock/completion status', () => {
  const el = { innerHTML: '' };
  renderWeekMenu(el, SAMPLE_WEEKS);
  assert.match(el.innerHTML, /Week 1/);
  assert.match(el.innerHTML, /✅ Completed/);
  assert.match(el.innerHTML, /📍 Current/);
  assert.match(el.innerHTML, /🔒 Locked/);
});

test('renderWeekMenu makes an unlocked week a link, and a locked week a non-link with a hint to complete the previous one', () => {
  const el = { innerHTML: '' };
  renderWeekMenu(el, SAMPLE_WEEKS);
  assert.match(el.innerHTML, /<a class="week-tile" href="#roadmap\/1"/);
  assert.match(el.innerHTML, /<a class="week-tile" href="#roadmap\/2"/);
  assert.doesNotMatch(el.innerHTML, /<a class="week-tile" href="#roadmap\/3"/);
  assert.match(el.innerHTML, /Complete Week 2 to unlock/);
});

test('renderWeekMenu escapes HTML in title and objectives', () => {
  const el = { innerHTML: '' };
  renderWeekMenu(el, [{ week: 1, title: '<script>', objectives: '<img onerror=x>', unlocked: true, completed: false }]);
  assert.doesNotMatch(el.innerHTML, /<script>/);
  assert.doesNotMatch(el.innerHTML, /<img onerror/);
});

test('renderWeekDetail renders the week chrome, a back link, and the lesson stepper', () => {
  const el = { innerHTML: '' };
  renderWeekDetail(el, {
    week: 1, title: 'T', objectives: 'Learn things.', milestone: 'm',
    topics: [{ title: 'Topic one', explanation: 'Explanation one' }],
  });
  assert.match(el.innerHTML, /href="#roadmap" class="week-detail__back"/);
  assert.match(el.innerHTML, /Week 1/);
  assert.match(el.innerHTML, /Learn things\./);
  assert.match(el.innerHTML, /data-lesson-stepper/);
  assert.match(el.innerHTML, /Topic one/);
});

test('renderWeekDetail shows the "This week"/"Opens <date>" date badge and passes the matching milestone submission through', () => {
  const el = { innerHTML: '' };
  renderWeekDetail(el, { week: 1, title: 'Now', objectives: 'x', milestone: 'Build it', status: 'current' }, {
    milestonesByWeek: { 1: { repoUrl: 'https://github.com/x/y', notes: 'done', status: 'approved' } },
  });
  assert.match(el.innerHTML, /📍 This week/);
  assert.match(el.innerHTML, /Milestone Approved/);
});
