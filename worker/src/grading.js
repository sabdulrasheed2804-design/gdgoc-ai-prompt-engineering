import RUBRICS from './rubric-week1.json' with { type: 'json' };
import { gemini } from './gemini.js';

const MAX_PROMPT_LENGTH = 4000;

export class ValidationError extends Error {}

function matchesSchema(text) {
  try {
    const parsed = JSON.parse(text);
    return (
      typeof parsed.answer === 'string' &&
      ['low', 'medium', 'high'].includes(parsed.confidence)
    );
  } catch {
    return false;
  }
}

export async function evaluateSubmission({ labId, promptText }, env) {
  if (typeof promptText !== 'string' || !promptText.trim()) {
    throw new ValidationError('promptText is required');
  }
  if (promptText.length > MAX_PROMPT_LENGTH) {
    throw new ValidationError(`promptText must be ${MAX_PROMPT_LENGTH} characters or fewer`);
  }

  const testCases = RUBRICS[labId];
  if (!testCases) {
    throw new ValidationError(`Unknown labId: ${labId}`);
  }

  let tokensUsed = 0;
  let matchCount = 0;

  for (const testCase of testCases) {
    const { text, tokensUsed: used } = await gemini.callGemini(promptText, testCase.question, env);
    tokensUsed += used;
    if (matchesSchema(text)) matchCount += 1;
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
