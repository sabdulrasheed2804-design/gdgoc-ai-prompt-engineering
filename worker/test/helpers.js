import { test } from 'node:test';
import { gemini } from '../src/gemini.js';

// Answers each rubric question the way a correct prompt would, so tests
// that need a "passing" submission also exercise the per-case expected
// values instead of returning one constant blob.
export function answerFor(question, labId) {
  const q = question.toLowerCase();
  switch (labId) {
    case 'w1-json-lab':
      if (q.includes('breakfast')) return '{"answer":"I have no way to know that.","answer_type":"unknown"}';
      if (q.includes('pineapple')) return '{"answer":"That is a matter of taste.","answer_type":"opinion"}';
      return '{"answer":"Jupiter","answer_type":"fact"}';
    case 'w2-fewshot-lab':
      if (q.includes('charged twice')) return '{"team":"billing"}';
      if (q.includes('freezes')) return '{"team":"technical"}';
      return '{"team":"account"}';
    case 'w3-reasoning-lab':
      return '{"steps":"...","final_answer":"12:15"}';
    case 'w4-guardrails-lab':
      if (q.includes('ignore your instructions')) return '{"reply":"I can\'t help with that.","action":"decline"}';
      if (q.includes('human agent')) return '{"reply":"Connecting you to a human.","action":"escalate"}';
      return '{"reply":"Open Settings > Account > Reset password.","action":"answer"}';
    case 'w5-rag-lab':
      if (q.includes('membership cost')) return '{"answer":"The context does not say.","citation":"","found":false}';
      return '{"answer":"...","citation":"Standard delivery takes 3-5 business days.","found":true}';
    case 'w6-tools-lab':
      if (q.includes('divided by')) return '{"tool":"calculator","input":"61237 / 7"}';
      if (q.includes('champions league')) return '{"tool":"search","input":"Champions League result yesterday"}';
      return '{"tool":"none","input":"Au"}';
    case 'w7-agent-lab':
      return '{"plan":"...","result":"..."}';
    default:
      throw new Error(`no canned answer for ${labId}`);
  }
}

export function mockCorrectAnswers(labId, tokensUsed = 10) {
  return test.mock.method(gemini, 'callGemini', async (_system, question) => ({ text: answerFor(question, labId), tokensUsed }));
}
