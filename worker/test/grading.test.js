import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../src/gemini.js';
import { evaluateSubmission, ValidationError } from '../src/grading.js';

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
