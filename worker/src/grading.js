import RUBRICS from './rubrics.json' with { type: 'json' };
import { gemini } from './gemini.js';
import { WEEKS } from '../../site/js/data.js';

const MAX_PROMPT_LENGTH = 4000;

// Derived server-side from the curriculum data, never from client input --
// a submission's week is whichever week owns its labId, not whatever the
// client's request body claims.
export const WEEK_BY_LAB_ID = Object.fromEntries(
  WEEKS.filter((w) => w.lab).map((w) => [w.lab.id, w.week])
);

export class ValidationError extends Error {}

// Models routinely wrap JSON in a ```json fence or put "Output:" in front
// of it even when told not to. The lab is about whether the prompt makes
// the model honour the JSON contract, so grade the JSON object inside the
// reply rather than failing on the wrapper -- a member who got the
// contract right shouldn't fail because the model added three backticks.
export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end < start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function describeRule(rule) {
  return Array.isArray(rule) ? `one of ${rule.join(', ')}` : `a ${rule}`;
}

// null when the reply satisfies the schema and any expected values for
// this test case; otherwise a one-line, member-facing reason it didn't.
// The reason names the field and the value seen, never the hidden test
// question itself.
export function checkOutput(text, schema, expect = {}) {
  const parsed = extractJson(text);
  if (!parsed) return 'the reply was not a JSON object';

  for (const [key, rule] of Object.entries(schema)) {
    const value = parsed[key];
    if (value === undefined) return `the JSON has no "${key}" field (expected ${describeRule(rule)})`;
    const ok = Array.isArray(rule) ? rule.includes(value)
      : rule === 'string' ? typeof value === 'string'
      : rule === 'boolean' ? typeof value === 'boolean'
      : false;
    if (!ok) return `"${key}" was ${JSON.stringify(value)}, expected ${describeRule(rule)}`;
  }

  for (const [key, expected] of Object.entries(expect)) {
    if (parsed[key] !== expected) {
      return `"${key}" was ${JSON.stringify(parsed[key])}, but for this question it should be ${JSON.stringify(expected)}`;
    }
  }
  return null;
}

export function matchesSchema(text, schema) {
  return checkOutput(text, schema) === null;
}

export async function evaluateSubmission({ labId, promptText }, env) {
  if (typeof promptText !== 'string' || !promptText.trim()) {
    throw new ValidationError('promptText is required');
  }
  if (promptText.length > MAX_PROMPT_LENGTH) {
    throw new ValidationError(`promptText must be ${MAX_PROMPT_LENGTH} characters or fewer`);
  }

  const rubric = Object.hasOwn(RUBRICS, labId) ? RUBRICS[labId] : undefined;
  if (!rubric) {
    throw new ValidationError(`Unknown labId: ${labId}`);
  }
  const { schema, testCases } = rubric;

  let tokensUsed = 0;
  let sampleOutput;
  const failures = [];

  for (const [index, testCase] of testCases.entries()) {
    const { text, tokensUsed: used } = await gemini.callGemini(promptText, testCase.question, env);
    tokensUsed += used;
    if (sampleOutput === undefined) sampleOutput = text;
    const problem = checkOutput(text, schema, testCase.expect);
    if (problem) failures.push(`Test ${index + 1}: ${problem}.`);
  }

  const matchCount = testCases.length - failures.length;
  const passed = failures.length === 0;

  return {
    passed,
    score: matchCount / testCases.length,
    feedback: passed
      ? 'All test questions returned valid matching JSON.'
      : `${matchCount}/${testCases.length} test questions passed. ${failures.join(' ')}`,
    tokensUsed,
    sampleOutput,
  };
}
