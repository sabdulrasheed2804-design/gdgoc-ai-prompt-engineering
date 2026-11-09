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

test('renders topics (one at a time via the stepper) and resources for a week that has them', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'T', objectives: 'x', milestone: 'm',
    topics: [{ title: 'Topic one', explanation: 'Explanation one' }],
    resources: [{ title: 'Res one', url: 'https://example.com' }],
  }]);
  assert.match(el.innerHTML, /Topic one/);
  assert.match(el.innerHTML, /Explanation one/);
  assert.match(el.innerHTML, /Res one/);
  assert.match(el.innerHTML, /href="https:\/\/example\.com"/);
});

test('escapes HTML in topics and resource titles', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'T', objectives: 'x', milestone: 'm',
    topics: [{ title: '<script>', explanation: '<img onerror=x>' }],
    resources: [{ title: '<img onerror=x>', url: 'https://example.com' }],
  }]);
  assert.doesNotMatch(el.innerHTML, /<script>/);
  assert.doesNotMatch(el.innerHTML, /<img onerror/);
});

test('renders a quiz block for a week with a quiz, omits it otherwise', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [
    { week: 1, title: 'With quiz', objectives: 'x', milestone: 'm', quiz: [{ q: 'Q', o: ['a', 'b', 'c', 'd'], a: 0, e: 'e' }] },
    { week: 2, title: 'No quiz', objectives: 'x', milestone: 'm' },
  ]);
  const withQuizCard = el.innerHTML.split('No quiz')[0];
  assert.match(withQuizCard, /data-quiz/);
  const noQuizCard = el.innerHTML.split('No quiz')[1];
  assert.doesNotMatch(noQuizCard, /data-quiz/);
});

test('renders prompt comparison breakdown when provided', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'W1', objectives: 'x', milestone: 'm',
    promptComparison: {
      technique: 'JSON Contract',
      badPrompt: 'Tell me the answer',
      badOutput: 'Sure thing! The answer is Paris',
      goodPrompt: 'Output ONLY JSON',
      goodOutput: '{"answer": "Paris"}',
      whyItWorks: 'Negative constraints prevent conversational filler',
    },
  }]);
  assert.match(el.innerHTML, /Pattern Breakdown/);
  assert.match(el.innerHTML, /JSON Contract/);
  assert.match(el.innerHTML, /Tell me the answer/);
  assert.match(el.innerHTML, /Output ONLY JSON/);
  assert.match(el.innerHTML, /Negative constraints prevent conversational filler/);
  assert.match(el.innerHTML, /href="#playground\?week=1"/);
});

test('renders upgraded resource cards with type, time, takeaway and essential badge', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'W1', objectives: 'x', milestone: 'm',
    resources: [
      {
        title: 'Deep Guide',
        url: 'https://example.com/guide',
        type: 'guide',
        time: '12 min read',
        takeaway: 'Crucial concept summary.',
        essential: true,
      },
      {
        title: 'Optional Paper',
        url: 'https://example.com/paper',
        type: 'paper',
        time: '25 min read',
        takeaway: 'Deep theoretical background.',
        essential: false,
      },
    ],
  }]);
  assert.match(el.innerHTML, /📘 Guide/);
  assert.match(el.innerHTML, /⏱️ 12 min read/);
  assert.match(el.innerHTML, /⭐ Core Concept/);
  assert.match(el.innerHTML, /Crucial concept summary\./);
  assert.match(el.innerHTML, /📄 Paper/);
  assert.match(el.innerHTML, /Deep Dive/);
});

test('an upcoming week collapses its lab/quiz/resources behind a details disclosure', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 2, title: 'Later', objectives: 'x', milestone: 'm', status: 'upcoming', scheduledDate: '2026-12-01',
    lab: { id: 'w2-lab', prompt: 'p' },
  }]);
  assert.match(el.innerHTML, /<details class="week-card__preview">/);
  assert.match(el.innerHTML, /Opens 2026-12-01/);
  const detailsBody = el.innerHTML.split('<details')[1];
  assert.match(detailsBody, /data-lab-form/);
});

test('a current week renders its lab form open, not behind details', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'Now', objectives: 'x', milestone: 'm', status: 'current',
    lab: { id: 'w1-lab', prompt: 'p' },
  }]);
  assert.doesNotMatch(el.innerHTML, /<details/);
  assert.match(el.innerHTML, /📍 This week/);
});
