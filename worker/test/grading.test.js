import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { evaluateSubmission, ValidationError, matchesSchema, extractJson, checkOutput, WEEK_BY_LAB_ID } from '../src/grading.js';
import RUBRICS from '../src/rubrics.json' with { type: 'json' };
import { WEEKS } from '../../site/js/data.js';
import { PLAYGROUND_PRESETS } from '../../site/js/playground.js';
import { mockCorrectAnswers } from './helpers.js';

const FAKE_ENV = { GEMINI_API_KEY: 'fake', GEMINI_MODEL: 'fake-model' };

test('rejects empty promptText before calling Gemini', async () => {
  const spy = test.mock.method(gemini, 'callGemini');
  await assert.rejects(() => evaluateSubmission({ labId: 'w1-json-lab', promptText: '' }, FAKE_ENV), ValidationError);
  assert.equal(spy.mock.calls.length, 0);
});

test('rejects promptText over the length cap before calling Gemini', async () => {
  const spy = test.mock.method(gemini, 'callGemini');
  const promptText = 'x'.repeat(4001);
  await assert.rejects(() => evaluateSubmission({ labId: 'w1-json-lab', promptText }, FAKE_ENV), ValidationError);
  assert.equal(spy.mock.calls.length, 0);
});

test('rejects an unknown labId before calling Gemini', async () => {
  const spy = test.mock.method(gemini, 'callGemini');
  await assert.rejects(() => evaluateSubmission({ labId: 'no-such-lab', promptText: 'x' }, FAKE_ENV), ValidationError);
  assert.equal(spy.mock.calls.length, 0);
});

test('rejects a labId that is an inherited object property name, as unknown rather than crashing', async () => {
  const spy = test.mock.method(gemini, 'callGemini');
  await assert.rejects(() => evaluateSubmission({ labId: 'constructor', promptText: 'x' }, FAKE_ENV), ValidationError);
  assert.equal(spy.mock.calls.length, 0);
});

test('passes when every test case returns valid matching JSON', async () => {
  mockCorrectAnswers('w1-json-lab');
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('fails when output does not match the schema', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('evaluateSubmission returns the first reply as a sample output alongside the score', async () => {
  mockCorrectAnswers('w1-json-lab');
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.sampleOutput, '{"answer":"Jupiter","answer_type":"fact"}');
});

// --- The lesson's own prompt must not pass the lab ----------------------------

test('the example output shown while teaching a week never satisfies that week\'s lab schema', () => {
  // This is the whole point of the labs being different from the lessons:
  // pasting the lesson's system prompt into the lab produces the lesson's
  // output shape, and that shape must fail the lab's contract.
  for (const week of WEEKS) {
    if (!week.lab || !week.promptComparison) continue;
    const { schema } = RUBRICS[week.lab.id];
    assert.equal(
      matchesSchema(week.promptComparison.goodOutput, schema),
      false,
      `Week ${week.week}: the lesson's example output already passes the lab -- a pasted lesson prompt would pass too`
    );
  }
});

test('the Playground preset output for a week never satisfies that week\'s lab schema either', () => {
  const labByWeek = Object.fromEntries(WEEKS.filter((w) => w.lab).map((w) => [w.week, w.lab.id]));
  for (const preset of PLAYGROUND_PRESETS) {
    const labId = labByWeek[preset.week];
    if (!labId) continue;
    assert.equal(
      matchesSchema(preset.engineeredOutput, RUBRICS[labId].schema),
      false,
      `Week ${preset.week}: the Playground preset's output already passes the lab -- a pasted preset prompt would pass too`
    );
  }
});

test('no rubric test question reuses the question shown while teaching that week', () => {
  for (const week of WEEKS) {
    if (!week.lab || !week.promptComparison) continue;
    const taught = week.promptComparison.userQuestion.toLowerCase();
    for (const { question } of RUBRICS[week.lab.id].testCases) {
      assert.notEqual(question.toLowerCase(), taught, `Week ${week.week}'s lab reuses its teaching example`);
    }
  }
});

// --- Tolerating the wrapper around otherwise-correct JSON --------------------

test('extractJson reads JSON out of a ```json fence', () => {
  assert.deepEqual(extractJson('```json\n{"team":"billing"}\n```'), { team: 'billing' });
  assert.deepEqual(extractJson('```\n{"a":1}\n```'), { a: 1 });
});

test('extractJson reads JSON that follows a short preamble like "Output:"', () => {
  assert.deepEqual(extractJson('Output: {"team":"account"}'), { team: 'account' });
  assert.deepEqual(extractJson('Sure! Here you go:\n{"answer":"Jupiter","answer_type":"fact"}\nHope that helps.'), { answer: 'Jupiter', answer_type: 'fact' });
});

test('extractJson returns null for prose, arrays, and broken JSON', () => {
  assert.equal(extractJson('The answer is Jupiter.'), null);
  assert.equal(extractJson('[1,2,3]'), null);
  assert.equal(extractJson('{"answer": "Jupiter",'), null);
  assert.equal(extractJson(undefined), null);
});

test('a correct reply wrapped in a code fence passes grading', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '```json\n{"plan":"...","result":"..."}\n```', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w7-agent-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

// --- Member-facing reasons ----------------------------------------------------

test('checkOutput names the missing field', () => {
  assert.match(checkOutput('{"answer":"x"}', { answer: 'string', answer_type: ['fact', 'opinion', 'unknown'] }), /no "answer_type" field/);
});

test('checkOutput names a wrong enum value and the allowed options', () => {
  const reason = checkOutput('{"team":"Billing"}', { team: ['billing', 'technical', 'account'] });
  assert.match(reason, /"team" was "Billing"/);
  assert.match(reason, /billing, technical, account/);
});

test('checkOutput names a wrong type', () => {
  assert.match(checkOutput('{"found":"true"}', { found: 'boolean' }), /"found" was "true", expected a boolean/);
});

test('checkOutput enforces an expected value for this test case when one is given', () => {
  const schema = { reply: 'string', action: ['answer', 'decline', 'escalate'] };
  assert.equal(checkOutput('{"reply":"no","action":"decline"}', schema, { action: 'decline' }), null);
  assert.match(checkOutput('{"reply":"sure","action":"answer"}', schema, { action: 'decline' }), /"action" was "answer", but for this question it should be "decline"/);
});

test('feedback for a failing submission says which tests failed and why, without the hidden question text', async () => {
  let call = 0;
  test.mock.method(gemini, 'callGemini', async () => {
    call += 1;
    return { text: call === 2 ? '{"plan":"...","result":42}' : '{"plan":"...","result":"ok"}', tokensUsed: 10 };
  });
  const result = await evaluateSubmission({ labId: 'w7-agent-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.equal(result.score, 2 / 3);
  assert.match(result.feedback, /2\/3 test questions passed/);
  assert.match(result.feedback, /Test 2: "result" was 42, expected a string/);
  assert.doesNotMatch(result.feedback, /programming languages|study group|loads slowly/);
});

// --- Schema helpers -------------------------------------------------------------

test('matchesSchema rejects an enum value outside the declared options', () => {
  assert.equal(matchesSchema('{"team":"spam"}', { team: ['billing', 'technical', 'account'] }), false);
});

test('matchesSchema rejects a boolean field sent as a string', () => {
  assert.equal(matchesSchema('{"found":"true"}', { found: 'boolean' }), false);
});

test('matchesSchema accepts a correctly-typed boolean field', () => {
  assert.equal(matchesSchema('{"found":true}', { found: 'boolean' }), true);
});

// --- Per-week rubrics -----------------------------------------------------------

for (const labId of Object.keys(RUBRICS)) {
  test(`${labId} passes a prompt that answers every test case correctly`, async () => {
    mockCorrectAnswers(labId);
    const result = await evaluateSubmission({ labId, promptText: 'a correct prompt' }, FAKE_ENV);
    assert.equal(result.passed, true, result.feedback);
  });
}

test('w1-json-lab fails a prompt that labels everything a "fact", even though that is valid JSON', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","answer_type":"fact"}', tokensUsed: 8 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a lazy prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.match(result.feedback, /"answer_type" was "fact", but for this question it should be "opinion"/);
});

test('w2-fewshot-lab fails a prompt that routes everything to billing', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"team":"billing"}', tokensUsed: 8 }));
  const result = await evaluateSubmission({ labId: 'w2-fewshot-lab', promptText: 'a lazy prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('w4-guardrails-lab fails a prompt that never declines anything', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"reply":"here is how","action":"answer"}', tokensUsed: 7 }));
  const result = await evaluateSubmission({ labId: 'w4-guardrails-lab', promptText: 'no guardrails' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.match(result.feedback, /"action" was "answer", but for this question it should be "decline"/);
});

test('w5-rag-lab fails a prompt that claims to have found the membership price the context never gives', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"$30","citation":"...","found":true}', tokensUsed: 6 }));
  const result = await evaluateSubmission({ labId: 'w5-rag-lab', promptText: 'an over-confident RAG prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('w6-tools-lab fails a prompt that sends everything to the calculator', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"tool":"calculator","input":"?"}', tokensUsed: 6 }));
  const result = await evaluateSubmission({ labId: 'w6-tools-lab', promptText: 'calculator for everything' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('WEEK_BY_LAB_ID maps every lab id to its correct week number', () => {
  assert.equal(WEEK_BY_LAB_ID['w1-json-lab'], 1);
  assert.equal(WEEK_BY_LAB_ID['w7-agent-lab'], 7);
});

test('every week with a lab has a matching rubric entry with exactly 3 test cases', () => {
  for (const week of WEEKS) {
    if (!week.lab) continue;
    const rubric = RUBRICS[week.lab.id];
    assert.ok(rubric, `Week ${week.week}'s lab.id "${week.lab.id}" has no entry in rubrics.json`);
    assert.equal(rubric.testCases.length, 3, `Week ${week.week}'s rubric should have exactly 3 test cases`);
  }
});

test('every expected value in a rubric is one the schema allows', () => {
  for (const [labId, rubric] of Object.entries(RUBRICS)) {
    for (const { expect = {} } of rubric.testCases) {
      for (const [key, value] of Object.entries(expect)) {
        const rule = rubric.schema[key];
        assert.ok(rule, `${labId} expects "${key}" which is not in its schema`);
        const allowed = Array.isArray(rule) ? rule.includes(value) : typeof value === rule;
        assert.ok(allowed, `${labId} expects "${key}" = ${JSON.stringify(value)}, which its schema disallows`);
      }
    }
  }
});

test('every lab brief names the exact schema keys its rubric grades', () => {
  for (const week of WEEKS) {
    if (!week.lab) continue;
    for (const key of Object.keys(RUBRICS[week.lab.id].schema)) {
      assert.ok(week.lab.prompt.includes(`"${key}"`), `Week ${week.week}'s lab brief doesn't mention "${key}" -- members can't be graded on a field they weren't told about`);
    }
  }
});
