import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { evaluateSubmission, ValidationError, matchesSchema } from '../src/grading.js';

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

test('w2-fewshot-lab passes a correctly-categorized response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"category":"praise"}', tokensUsed: 8 }));
  const result = await evaluateSubmission({ labId: 'w2-fewshot-lab', promptText: 'a few-shot prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w3-reasoning-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"reasoning":"...","answer":"2"}', tokensUsed: 9 }));
  const result = await evaluateSubmission({ labId: 'w3-reasoning-lab', promptText: 'a reasoning prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w4-guardrails-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"100C","refused":false}', tokensUsed: 7 }));
  const result = await evaluateSubmission({ labId: 'w4-guardrails-lab', promptText: 'a guardrails prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w5-rag-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"...","grounded":true}', tokensUsed: 6 }));
  const result = await evaluateSubmission({ labId: 'w5-rag-lab', promptText: 'a RAG prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w6-tools-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"needsTool":true,"answer":"180411"}', tokensUsed: 5 }));
  const result = await evaluateSubmission({ labId: 'w6-tools-lab', promptText: 'a tool-use prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});

test('w7-agent-lab passes a correctly-shaped response', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"plan":"...","result":"..."}', tokensUsed: 11 }));
  const result = await evaluateSubmission({ labId: 'w7-agent-lab', promptText: 'an agent-planning prompt' }, FAKE_ENV);
  assert.equal(result.passed, true);
});
