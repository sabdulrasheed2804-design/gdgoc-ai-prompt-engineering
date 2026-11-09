import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKS } from './data.js';

test('every week has a non-empty topics list, each with a real explanation, not just a label', () => {
  for (const w of WEEKS) {
    assert.ok(Array.isArray(w.topics) && w.topics.length > 0, `week ${w.week} topics`);
    for (const t of w.topics) {
      assert.ok(typeof t.title === 'string' && t.title.length > 0, `week ${w.week} topic title`);
      // A one-line label isn't an explanation -- this is what makes "topic by
      // topic" pacing meaningful instead of just a fancier bullet list.
      assert.ok(t.explanation.length > 200, `week ${w.week} topic "${t.title}" needs a real explanation`);
    }
  }
});

test('every week has a non-empty resources list', () => {
  for (const w of WEEKS) {
    assert.ok(Array.isArray(w.resources) && w.resources.length > 0, `week ${w.week} resources`);
    for (const r of w.resources) {
      assert.equal(typeof r.title, 'string');
      assert.match(r.url, /^https:\/\//);
      assert.ok(['guide', 'docs', 'video', 'paper', 'tool'].includes(r.type), `valid type for ${r.title}`);
      assert.ok(typeof r.time === 'string' && r.time.length > 0, `time estimate for ${r.title}`);
      assert.ok(typeof r.takeaway === 'string' && r.takeaway.length > 0, `takeaway for ${r.title}`);
    }
  }
});

test('every week with a lab has a structured prompt comparison breakdown', () => {
  for (const w of WEEKS.filter((w) => w.lab)) {
    assert.ok(w.promptComparison, `week ${w.week} promptComparison exists`);
    assert.ok(w.promptComparison.technique.length > 0);
    assert.ok(w.promptComparison.badPrompt.length > 0);
    assert.ok(w.promptComparison.badOutput.length > 0);
    assert.ok(w.promptComparison.goodPrompt.length > 0);
    assert.ok(w.promptComparison.goodOutput.length > 0);
    assert.ok(w.promptComparison.whyItWorks.length > 0);
  }
});

test('every week with a lab has exactly a 5-question quiz with 4 valid options each', () => {
  for (const w of WEEKS.filter((w) => w.lab)) {
    assert.equal(w.quiz.length, 5, `week ${w.week} quiz length`);
    for (const item of w.quiz) {
      assert.equal(item.o.length, 4, `week ${w.week} question options`);
      assert.ok(item.a >= 0 && item.a < 4, `week ${w.week} answer index in range`);
      assert.ok(item.e.length > 0, `week ${w.week} explanation`);
    }
  }
});

test('week 8 (capstone) has no quiz field', () => {
  const week8 = WEEKS.find((w) => w.week === 8);
  assert.equal(week8.quiz, undefined);
});

