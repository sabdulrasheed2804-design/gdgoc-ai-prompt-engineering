import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { gemini } from './gemini.js';

const DAILY_TOKEN_CAP = 50000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUBRICS = JSON.parse(readFileSync(path.join(__dirname, 'rubric-week1.json'), 'utf8'));

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

export async function evaluateSubmission({ week, labId, promptText }) {
  if (!promptText || !promptText.trim()) {
    throw new Error('promptText is required');
  }

  const testCases = RUBRICS[labId] ?? [];
  let tokensUsed = 0;
  let matchCount = 0;

  for (const testCase of testCases) {
    const { text, tokensUsed: used } = await gemini.callGemini(promptText, testCase.question);
    tokensUsed += used;
    if (matchesSchema(text)) matchCount += 1;
  }

  const passed = testCases.length > 0 && matchCount === testCases.length;
  const score = testCases.length > 0 ? matchCount / testCases.length : 0;

  return {
    passed,
    score,
    feedback: passed
      ? 'All test questions returned valid matching JSON.'
      : `${matchCount}/${testCases.length} test questions returned valid matching JSON.`,
    tokensUsed,
  };
}

export const gradeLab = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required to submit a lab.');
  }

  const usageRef = getDb().collection('apiUsage').doc(uid);
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

  const { week, labId, promptText } = request.data;
  const result = await evaluateSubmission({ week, labId, promptText });

  await getDb().collection('labRuns').add({
    memberId: uid,
    week,
    labId,
    promptText,
    passed: result.passed,
    score: result.score,
    tokensUsed: result.tokensUsed,
    timestamp: new Date().toISOString(),
  });

  await usageRef.set({
    tokensToday: tokensToday + result.tokensUsed,
    tokensTotal: (usage?.tokensTotal ?? 0) + result.tokensUsed,
    lastResetDate: today,
  });

  return { passed: result.passed, score: result.score, feedback: result.feedback };
});
