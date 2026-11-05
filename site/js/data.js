export const WEEK1 = {
  week: 1,
  title: 'Foundations of LLMs & Prompting',
  objectives: 'Understand how LLMs generate text, write clear and specific prompts, and get the dev environment talking to a real model API.',
  lab: {
    id: 'w1-json-lab',
    prompt: 'Write a system prompt that makes the model return valid JSON matching {"answer": string, "confidence": "low"|"medium"|"high"} for any question asked.',
  },
  milestone: 'Start "the assistant" — a CLI or small web app that answers a question using one well-designed system prompt.',
};

export const WEEKS = [WEEK1];
