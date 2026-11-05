// gemini-1.5-flash was retired by Google in Sept 2025; "-latest" aliases are
// Google's own answer to this churn (hot-swapped on new releases), so that's
// the default here instead of pinning a dated model name that will rot.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export const gemini = { callGemini };

const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(systemPrompt, userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
  });

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      const tokensUsed = data.usageMetadata?.totalTokenCount ?? 0;
      return { text, tokensUsed };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(2 ** attempt * 200);
    }
  }
  throw lastError;
}
