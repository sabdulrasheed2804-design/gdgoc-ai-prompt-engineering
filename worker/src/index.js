import { verifyIdToken, AuthError } from './auth.js';
import { makeFirestoreClient } from './firestore.js';
import { evaluateSubmission, ValidationError, WEEK_BY_LAB_ID } from './grading.js';

const DAILY_TOKEN_CAP = 50000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export async function handleGradeLab({ uid, labId, promptText }, env, firestore) {
  const usagePath = `apiUsage/${uid}`;
  const existingUsage = await firestore.getDocument(usagePath);
  const today = todayString();
  const tokensToday = existingUsage && existingUsage.lastResetDate === today ? existingUsage.tokensToday : 0;

  if (tokensToday >= DAILY_TOKEN_CAP) {
    const err = new Error("You've reached today's grading limit. Try again tomorrow.");
    err.status = 429;
    throw err;
  }

  let result;
  try {
    result = await evaluateSubmission({ labId, promptText }, env);
  } catch (err) {
    if (err instanceof ValidationError) {
      err.status = 400;
      throw err;
    }
    const wrapped = new Error('Grading service is busy, please try again.');
    wrapped.status = 503;
    throw wrapped;
  }

  // Derived from labId, never from the client's request -- a client-supplied
  // week would let a member fabricate a passing entry for a week its own
  // labId doesn't belong to, which then becomes publicly visible once
  // published.
  const week = WEEK_BY_LAB_ID[labId];

  // Charge tokens before any other write: Gemini has already been called and
  // the cost already incurred, so the daily cap must reflect it even if a
  // later write (labRuns, portfolio) fails.
  await firestore.transactionalUpdate(usagePath, (current) => {
    const currentTokensToday = current && current.lastResetDate === today ? current.tokensToday : 0;
    return {
      tokensToday: currentTokensToday + result.tokensUsed,
      tokensTotal: (current?.tokensTotal ?? 0) + result.tokensUsed,
      lastResetDate: today,
    };
  });

  await firestore.createDocument('labRuns', {
    memberId: uid,
    week,
    labId,
    promptText,
    passed: result.passed,
    score: result.score,
    tokensUsed: result.tokensUsed,
    timestamp: new Date().toISOString(),
  });

  if (result.passed) {
    // Best-effort: the portfolio entry is a promotional derivative of the
    // labRuns record above, not the source of truth. A member who passed a
    // lab must get their result even if this write fails.
    try {
      await firestore.transactionalUpdate(`portfolio/${uid}/entries/${week}`, (current) => {
        if (current && current.rubricScore >= result.score) return current;
        return {
          promptText,
          outputSnippet: result.sampleOutput,
          rubricScore: result.score,
          published: current?.published ?? false,
        };
      });
    } catch (err) {
      console.error('failed to upsert portfolio entry', err);
    }
  }

  return { passed: result.passed, score: result.score, feedback: result.feedback };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const authHeader = request.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let uid;
    try {
      ({ uid } = await verifyIdToken(idToken, serviceAccount.project_id));
    } catch (err) {
      if (err instanceof AuthError) return json({ error: err.message }, 401);
      throw err;
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const firestore = makeFirestoreClient(serviceAccount);
    try {
      const result = await handleGradeLab(
        { uid, labId: payload.labId, promptText: payload.promptText },
        env,
        firestore
      );
      return json(result);
    } catch (err) {
      return json({ error: err.message }, err.status || 500);
    }
  },
};
