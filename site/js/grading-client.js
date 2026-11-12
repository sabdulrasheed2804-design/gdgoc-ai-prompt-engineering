import { isLocalMode } from './store.js';
import { getIdToken } from './auth.js';

const GRADING_ENDPOINT = 'https://gdgoc-prompt-eng-grading.gdgoc-prompt-eng.workers.dev';

async function postToWorker(path, body) {
  const idToken = await getIdToken();
  const response = await fetch(`${GRADING_ENDPOINT}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function submitLab({ week, labId, promptText }) {
  if (isLocalMode()) {
    throw new Error(
      'Lab grading needs the live grading function and is not available in local mode.'
    );
  }
  return postToWorker('', { week, labId, promptText });
}

// Leads review milestones through the Worker rather than writing Firestore
// directly, because a review awards XP and only the Worker's service account
// may write leaderboard xp (see firestore.rules). Local mode has no Worker;
// app.js falls back to store.reviewMilestone there.
export async function reviewMilestoneRemote({ submissionId, status, feedback, reviewerName }) {
  return postToWorker('/review-milestone', { submissionId, status, feedback, reviewerName });
}
