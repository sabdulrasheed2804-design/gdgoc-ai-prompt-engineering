import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { gemini } from './gemini.js';

export const DAILY_TOKEN_CAP = 50000;
const MAX_PROMPT_LENGTH = 4000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUBRICS = JSON.parse(readFileSync(path.join(__dirname, 'rubric-week1.json'), 'utf8'));

export class ValidationError extends Error {}

let db;
function getDb() {
  if (!db) {
    initializeApp();
    db = getFirestore();
  }
  return db;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

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

export async function evaluateSubmission({ labId, promptText }) {
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
    const { text, tokensUsed: used } = await gemini.callGemini(promptText, testCase.question);
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

export async function handleGradeLab({ uid, week, labId, promptText }, { db }) {
  const usageRef = db.collection('apiUsage').doc(uid);
  const usageSnap = await usageRef.get();
  const usage = usageSnap.exists ? usageSnap.data() : null;
  const today = todayString();
  const tokensToday = usage && usage.lastResetDate === today ? usage.tokensToday : 0;

  if (tokensToday >= DAILY_TOKEN_CAP) {
    throw new HttpsError(
      'resource-exhausted',
      "You've reached today's grading limit. Try again tomorrow."
    );
  }

  let result;
  try {
    result = await evaluateSubmission({ labId, promptText });
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new HttpsError('invalid-argument', err.message);
    }
    throw new HttpsError('unavailable', 'Grading service is busy, please try again.');
  }

  await db.collection('labRuns').add({
    memberId: uid,
    week,
    labId,
    promptText,
    passed: result.passed,
    score: result.score,
    tokensUsed: result.tokensUsed,
    timestamp: new Date().toISOString(),
  });

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef);
    const current = snap.exists ? snap.data() : null;
    const currentTokensToday = current && current.lastResetDate === today ? current.tokensToday : 0;
    tx.set(usageRef, {
      tokensToday: currentTokensToday + result.tokensUsed,
      tokensTotal: (current?.tokensTotal ?? 0) + result.tokensUsed,
      lastResetDate: today,
    });
  });

  return { passed: result.passed, score: result.score, feedback: result.feedback };
}

export const gradeLab = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required to submit a lab.');
  }
  const { week, labId, promptText } = request.data;
  return handleGradeLab({ uid, week, labId, promptText }, { db: getDb() });
});
