import RUBRICS from './rubrics.json' with { type: 'json' };
import { gemini } from './gemini.js';

const MAX_PROMPT_LENGTH = 4000;

export class ValidationError extends Error {}

export function matchesSchema(text, schema) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  if (typeof parsed !== 'object' || parsed === null) return false;

  return Object.entries(schema).every(([key, rule]) => {
    const value = parsed[key];
    if (Array.isArray(rule)) return rule.includes(value);
    if (rule === 'string') return typeof value === 'string';
    if (rule === 'boolean') return typeof value === 'boolean';
    return false;
  });
}

export async function evaluateSubmission({ labId, promptText }, env) {
  if (typeof promptText !== 'string' || !promptText.trim()) {
    throw new ValidationError('promptText is required');
  }
  if (promptText.length > MAX_PROMPT_LENGTH) {
    throw new ValidationError(`promptText must be ${MAX_PROMPT_LENGTH} characters or fewer`);
  }

  const rubric = RUBRICS[labId];
  if (!rubric) {
    throw new ValidationError(`Unknown labId: ${labId}`);
  }
  const { schema, testCases } = rubric;

  let tokensUsed = 0;
  let matchCount = 0;

  for (const testCase of testCases) {
    const { text, tokensUsed: used } = await gemini.callGemini(promptText, testCase.question, env);
    tokensUsed += used;
    if (matchesSchema(text, schema)) matchCount += 1;
  }

  const passed = matchCount === testCases.length;
  const score = matchCount / testCases.length;

  return {
    passed,
    score,
    feedback: passed
      ? 'All test questions returned valid matching JSON.'
      : `${matchCount}/${testCases.length} test questions returned valid matching JSON.`,
    tokensUsed,
  };
}
