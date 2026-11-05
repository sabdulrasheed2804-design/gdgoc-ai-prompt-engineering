import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gemini } from '../gemini.js';
import { evaluateSubmission } from '../index.js';

test('rejects empty promptText before calling Gemini', async () => {
  const spy = test.mock.method(gemini, 'callGemini');
  await assert.rejects(() => evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: '' }), /promptText/);
  assert.equal(spy.mock.calls.length, 0);
});

test('passes when every test case returns valid matching JSON', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));
  const result = await evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: 'a system prompt' });
  assert.equal(result.passed, true);
});

test('fails when output does not match the schema', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 10 }));
  const result = await evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: 'a system prompt' });
  assert.equal(result.passed, false);
});
