import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderRoadmap, runLabSubmission } from './roadmap.js';
import { WEEKS } from './data.js';

test('renders one entry per week with its title', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, WEEKS);
  assert.match(el.innerHTML, /Foundations of LLMs/);
});

test('renders a week with no lab field without a lab form', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{ week: 8, title: 'Capstone', objectives: 'x', milestone: 'Ship the demo.' }]);
  assert.doesNotMatch(el.innerHTML, /data-lab-form/);
  assert.match(el.innerHTML, /Capstone/);
});

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

test('renders the week card chrome (badges, title, objectives) around the lesson stepper', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'T', objectives: 'Learn things.', milestone: 'm',
    topics: [{ title: 'Topic one', explanation: 'Explanation one' }],
  }]);
  assert.match(el.innerHTML, /Week 1/);
  assert.match(el.innerHTML, /Learn things\./);
  assert.match(el.innerHTML, /data-lesson-stepper/);
  assert.match(el.innerHTML, /Topic one/);
});

test('shows the "This week" badge for the current week and an "Opens <date>" badge for an upcoming one', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [
    { week: 1, title: 'Now', objectives: 'x', milestone: 'm', status: 'current' },
    { week: 2, title: 'Later', objectives: 'x', milestone: 'm', status: 'upcoming', scheduledDate: '2026-12-01' },
  ]);
  assert.match(el.innerHTML, /📍 This week/);
  assert.match(el.innerHTML, /Opens 2026-12-01/);
});

test('passes the matching milestone submission through to the lesson stepper', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{ week: 1, title: 'T', objectives: 'x', milestone: 'Build it' }], {
    milestonesByWeek: { 1: { repoUrl: 'https://github.com/x/y', notes: 'done', status: 'approved' } },
  });
  assert.match(el.innerHTML, /Milestone Approved/);
});
