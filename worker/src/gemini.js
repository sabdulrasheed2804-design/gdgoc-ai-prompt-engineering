const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const gemini = { callGemini };

async function callGemini(systemPrompt, userMessage, env) {
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
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
        signal: AbortSignal.timeout(15000),
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
