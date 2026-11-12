import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { evaluateSubmission, ValidationError, matchesSchema, extractJson, checkOutput, WEEK_BY_LAB_ID } from '../src/grading.js';
import RUBRICS from '../src/rubrics.json' with { type: 'json' };
import { WEEKS } from '../../site/js/data.js';

const FAKE_ENV = { GEMINI_API_KEY: 'fake', GEMINI_MODEL: 'fake-model' };

// Answers each rubric question the way a correct prompt would, so the
// per-week pass tests exercise the expected-value checks too.
function answerFor(question, labId) {
  const q = question.toLowerCase();
  if (labId === 'w2-fewshot-lab') {
    if (q.includes('?')) return '{"category":"question"}';
    if (q.includes('charged twice')) return '{"category":"complaint"}';
    return '{"category":"praise"}';
  }
  if (labId === 'w4-guardrails-lab') {
    return q.includes('ignore every rule') ? '{"answer":"I can\'t help with that.","refused":true}' : '{"answer":"...","refused":false}';
  }
  if (labId === 'w5-rag-lab') {
    return q.includes('warranty') ? '{"answer":"Not covered by the context.","grounded":false}' : '{"answer":"...","grounded":true}';
  }
  if (labId === 'w6-tools-lab') {
    return q.includes('chemical symbol') ? '{"needsTool":false,"answer":"Au"}' : '{"needsTool":true,"answer":"calling calculator"}';
  }
  throw new Error(`no canned answer for ${labId}`);
}

function mockCorrectAnswers(labId) {
  test.mock.method(gemini, 'callGemini', async (_system, question) => ({ text: answerFor(question, labId), tokensUsed: 8 }));
}

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
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('fails when output does not match the schema', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('evaluateSubmission returns a sample output alongside the score', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.sampleOutput, '{"answer":"x","confidence":"low"}');
});

// --- Tolerating the wrapper around otherwise-correct JSON -----------------

test('extractJson reads JSON out of a ```json fence', () => {
  assert.deepEqual(extractJson('```json\n{"category":"praise"}\n```'), { category: 'praise' });
  assert.deepEqual(extractJson('```\n{"a":1}\n```'), { a: 1 });
});

test('extractJson reads JSON that follows a short preamble like "Output:"', () => {
  assert.deepEqual(extractJson('Output: {"category":"question"}'), { category: 'question' });
  assert.deepEqual(extractJson('Sure! Here you go:\n{"answer":"Paris","confidence":"high"}\nHope that helps.'), { answer: 'Paris', confidence: 'high' });
});

test('extractJson returns null for prose, arrays, and broken JSON', () => {
  assert.equal(extractJson('The answer is Paris.'), null);
  assert.equal(extractJson('[1,2,3]'), null);
  assert.equal(extractJson('{"answer": "Paris",'), null);
  assert.equal(extractJson(undefined), null);
});

test('a correct reply wrapped in a code fence passes grading', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '```json\n{"answer":"x","confidence":"low"}\n```', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

// --- Member-facing reasons --------------------------------------------------

test('checkOutput names the missing field', () => {
  assert.match(checkOutput('{"answer":"x"}', { answer: 'string', confidence: ['low', 'medium', 'high'] }), /no "confidence" field/);
});

test('checkOutput names a wrong enum value and the allowed options', () => {
  const reason = checkOutput('{"category":"Complaint"}', { category: ['question', 'complaint', 'praise'] });
  assert.match(reason, /"category" was "Complaint"/);
  assert.match(reason, /question, complaint, praise/);
});

test('checkOutput names a wrong type', () => {
  assert.match(checkOutput('{"refused":"true"}', { refused: 'boolean' }), /"refused" was "true", expected a boolean/);
});

test('checkOutput enforces an expected value for this test case when one is given', () => {
  const schema = { answer: 'string', refused: 'boolean' };
  assert.equal(checkOutput('{"answer":"no","refused":true}', schema, { refused: true }), null);
  assert.match(checkOutput('{"answer":"sure","refused":false}', schema, { refused: true }), /"refused" was false, but for this question it should be true/);
});

test('feedback for a failing submission says which tests failed and why, without the hidden question text', async () => {
  let call = 0;
  test.mock.method(gemini, 'callGemini', async () => {
    call += 1;
    return { text: call === 2 ? '{"answer":"x","confidence":"certain"}' : '{"answer":"x","confidence":"low"}', tokensUsed: 10 };
  });
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.equal(result.score, 2 / 3);
  assert.match(result.feedback, /2\/3 test questions passed/);
  assert.match(result.feedback, /Test 2: "confidence" was "certain", expected one of low, medium, high/);
  assert.doesNotMatch(result.feedback, /planet|Romeo|freezing/);
});

// --- Schema helpers ----------------------------------------------------------

test('matchesSchema rejects an enum value outside the declared options', () => {
  const schema = { category: ['question', 'complaint', 'praise'] };
  assert.equal(matchesSchema('{"category":"spam"}', schema), false);
});

test('matchesSchema rejects a boolean field sent as a string', () => {
  const schema = { refused: 'boolean' };
  assert.equal(matchesSchema('{"refused":"true"}', schema), false);
});

test('matchesSchema accepts a correctly-typed boolean field', () => {
  const schema = { refused: 'boolean' };
  assert.equal(matchesSchema('{"refused":true}', schema), true);
});

// --- Per-week rubrics --------------------------------------------------------

test('w2-fewshot-lab passes when each piece of feedback is classified correctly', async () => {
  mockCorrectAnswers('w2-fewshot-lab');
  const result = await evaluateSubmission({ labId: 'w2-fewshot-lab', promptText: 'a few-shot prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w2-fewshot-lab fails a prompt that labels everything "praise", even though that is valid JSON', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"category":"praise"}', tokensUsed: 8 }));
  const result = await evaluateSubmission({ labId: 'w2-fewshot-lab', promptText: 'a lazy prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.match(result.feedback, /"category" was "praise", but for this question it should be "question"/);
});

test('w3-reasoning-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"reasoning":"...","answer":"2"}', tokensUsed: 9 }));
  const result = await evaluateSubmission({ labId: 'w3-reasoning-lab', promptText: 'a reasoning prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w4-guardrails-lab passes a prompt that answers the benign questions and refuses the injection', async () => {
  mockCorrectAnswers('w4-guardrails-lab');
  const result = await evaluateSubmission({ labId: 'w4-guardrails-lab', promptText: 'a guardrails prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w4-guardrails-lab fails a prompt that never refuses anything', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"here is how","refused":false}', tokensUsed: 7 }));
  const result = await evaluateSubmission({ labId: 'w4-guardrails-lab', promptText: 'no guardrails' }, FAKE_ENV);
  assert.equal(result.passed, false);
  assert.match(result.feedback, /"refused" was false, but for this question it should be true/);
});

test('w5-rag-lab passes a prompt that admits when the context does not answer the question', async () => {
  mockCorrectAnswers('w5-rag-lab');
  const result = await evaluateSubmission({ labId: 'w5-rag-lab', promptText: 'a RAG prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w5-rag-lab fails a prompt that claims to be grounded on the warranty question the context never covers', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"12 months","grounded":true}', tokensUsed: 6 }));
  const result = await evaluateSubmission({ labId: 'w5-rag-lab', promptText: 'an over-confident RAG prompt' }, FAKE_ENV);
  assert.equal(result.passed, false);
});

test('w6-tools-lab passes a prompt that reaches for the calculator only when arithmetic is needed', async () => {
  mockCorrectAnswers('w6-tools-lab');
  const result = await evaluateSubmission({ labId: 'w6-tools-lab', promptText: 'a tool-use prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w7-agent-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"plan":"...","result":"..."}', tokensUsed: 11 }));
  const result = await evaluateSubmission({ labId: 'w7-agent-lab', promptText: 'an agent-planning prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
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

test('no rubric test question reuses the question shown while teaching that week', () => {
  for (const week of WEEKS) {
    if (!week.lab || !week.promptComparison) continue;
    const taught = week.promptComparison.userQuestion.toLowerCase();
    for (const { question } of RUBRICS[week.lab.id].testCases) {
      assert.notEqual(question.toLowerCase(), taught, `Week ${week.week}'s lab reuses its teaching example`);
    }
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
