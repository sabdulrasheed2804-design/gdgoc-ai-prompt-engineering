import { isLocalMode } from './store.js';
import { getIdToken } from './auth.js';

const GRADING_ENDPOINT = 'https://gdgoc-prompt-eng-grading.gdgoc-prompt-eng.workers.dev';

export async function submitLab({ week, labId, promptText }) {
  if (isLocalMode()) {
    throw new Error(
      'Lab grading needs the live grading function and is not available in local mode.'
    );
  }

  const idToken = await getIdToken();
  const response = await fetch(GRADING_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ week, labId, promptText }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Grading request failed (${response.status})`);
  }
  return data;
}
