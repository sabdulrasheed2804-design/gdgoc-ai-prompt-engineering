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

export const WEEK2 = {
  week: 2,
  title: 'Prompt Patterns & Structured Output',
  objectives: 'Use few-shot examples effectively, produce reliable structured output, and control tone and format on demand.',
  lab: {
    id: 'w2-fewshot-lab',
    prompt: 'Write a few-shot prompt (include at least 2 worked examples) that classifies a short piece of user feedback into exactly one category. Output must be valid JSON matching {"category": "question"|"complaint"|"praise"}.',
  },
  milestone: 'Add a structured Q&A feature to the assistant, using few-shot examples and JSON-schema output validated in code.',
};

export const WEEK3 = {
  week: 3,
  title: 'Reasoning Techniques',
  objectives: 'Elicit multi-step reasoning, decompose complex tasks, and improve reliability through self-consistency.',
  lab: {
    id: 'w3-reasoning-lab',
    prompt: 'Write a system prompt that makes the model reason step by step before answering, returning valid JSON matching {"reasoning": string, "answer": string} for any math word problem asked.',
  },
  milestone: 'Add a multi-step reasoning mode to the assistant for complex questions, with a visible reasoning trace in the output.',
};

export const WEEKS = [WEEK1, WEEK2, WEEK3];
