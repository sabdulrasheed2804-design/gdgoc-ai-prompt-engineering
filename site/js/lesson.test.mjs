import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekSteps, renderLessonStepper } from './lesson.js';

const WEEK = {
  week: 1,
  title: 'T',
  objectives: 'x',
  milestone: 'Build the thing',
  topics: [
    { title: 'Topic A', explanation: 'Explanation A' },
    { title: 'Topic B', explanation: 'Explanation B' },
  ],
  promptComparison: {
    technique: 'Tech', badPrompt: 'bad', badOutput: 'bad out', goodPrompt: 'good', goodOutput: 'good out', whyItWorks: 'because',
  },
  quiz: [
    { q: 'Q1', o: ['a', 'b', 'c', 'd'], a: 0, e: 'e1' },
    { q: 'Q2', o: ['a', 'b', 'c', 'd'], a: 1, e: 'e2' },
  ],
  lab: { id: 'w1-lab', prompt: 'Do the lab' },
  resources: [{ title: 'Res one', url: 'https://example.com', type: 'guide' }],
};

test('buildWeekSteps orders topics, then comparison, then each quiz question, then lab, milestone, resources', () => {
  const steps = buildWeekSteps(WEEK);
  assert.deepEqual(steps.map((s) => s.kind), ['topic', 'topic', 'comparison', 'quiz', 'quiz', 'lab', 'milestone', 'resources']);
});

test('buildWeekSteps omits comparison/lab/resources steps when the week has none', () => {
  const steps = buildWeekSteps({ week: 8, title: 'Capstone', milestone: 'm', topics: [{ title: 't', explanation: 'e' }] });
  assert.deepEqual(steps.map((s) => s.kind), ['topic', 'milestone']);
});

test('renderLessonStepper shows only the first step, with a step counter and kind label', () => {
  const html = renderLessonStepper(WEEK);
  assert.match(html, /Step 1 of 8/);
  assert.match(html, /data-lesson-kind>Core Concept</);
  assert.match(html, /data-lesson-panel data-index="0"[^>]*>/);
  assert.match(html, /data-lesson-panel data-index="1" data-kind="Core Concept" hidden/);
});

test('renderLessonStepper renders each step kind\'s real content', () => {
  const html = renderLessonStepper(WEEK);
  assert.match(html, /Topic A/);
  assert.match(html, /Explanation A/);
  assert.match(html, /Tech/); // comparison technique
  assert.match(html, /Q1\?|Q1/); // quiz question text
  assert.match(html, /Do the lab/);
  assert.match(html, /data-lab-form/);
  assert.match(html, /Build the thing/); // milestone
  assert.match(html, /Res one/); // resources
});

test('renderLessonStepper disables Previous on the first step and enables Next when there is more than one step', () => {
  const html = renderLessonStepper(WEEK);
  assert.match(html, /data-lesson-prev disabled/);
  assert.doesNotMatch(html, /data-lesson-next disabled/);
});

test('renderLessonStepper renders one dot per step', () => {
  const html = renderLessonStepper(WEEK);
  assert.equal((html.match(/data-lesson-dot/g) || []).length, 8);
});

test('renderLessonStepper escapes HTML in topic and quiz content', () => {
  const html = renderLessonStepper({
    week: 1, title: 'x', milestone: '<script>bad</script>',
    topics: [{ title: '<script>', explanation: '<img onerror=x>' }],
  });
  assert.doesNotMatch(html, /<script>bad<\/script>/);
  assert.doesNotMatch(html, /<img onerror=x>/);
});

test('the comparison step renders the full technique breakdown with a playground link', () => {
  const html = renderLessonStepper({
    week: 3, title: 'W', milestone: 'm',
    promptComparison: {
      technique: 'JSON Contract',
      badPrompt: 'Tell me the answer',
      badOutput: 'Sure thing! The answer is Paris',
      goodPrompt: 'Output ONLY JSON',
      goodOutput: '{"answer": "Paris"}',
      whyItWorks: 'Negative constraints prevent conversational filler',
    },
  });
  assert.match(html, /JSON Contract/);
  assert.match(html, /Tell me the answer/);
  assert.match(html, /Output ONLY JSON/);
  assert.match(html, /Negative constraints prevent conversational filler/);
  assert.match(html, /href="#playground\?week=3"/);
});

test('the resources step renders type, time, takeaway, and essential badges', () => {
  const html = renderLessonStepper({
    week: 1, title: 'W', milestone: 'm',
    resources: [
      { title: 'Deep Guide', url: 'https://example.com/guide', type: 'guide', time: '12 min read', takeaway: 'Crucial concept summary.', essential: true },
      { title: 'Optional Paper', url: 'https://example.com/paper', type: 'paper', time: '25 min read', takeaway: 'Deep theoretical background.', essential: false },
    ],
  });
  assert.match(html, /📘 Guide/);
  assert.match(html, /⏱️ 12 min read/);
  assert.match(html, /⭐ Core Concept/);
  assert.match(html, /Crucial concept summary\./);
  assert.match(html, /📄 Paper/);
  assert.match(html, /Deep Dive/);
});
