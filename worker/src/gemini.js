const MAX_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const gemini = { callGemini };

// A pinned model, not the "-latest" alias: live testing found the alias
// itself overloaded (requests hung indefinitely) while this exact model
// responded in ~1s. Still overridable via env, so swapping models later
// (newer version, or back to an alias once it's not the overload target)
// is a config change, not a code change.
async function callGemini(systemPrompt, userMessage, env) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  // temperature 0 so grading is repeatable: at the default temperature the
  // same correct prompt could pass one attempt and fail the next on pure
  // sampling luck. Thinking is switched off for the 2.5 models -- it adds
  // latency and burns the member's daily token cap without changing
  // whether a short JSON reply matches a schema.
  const generationConfig = { temperature: 0 };
  if (model.includes('2.5')) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig,
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
