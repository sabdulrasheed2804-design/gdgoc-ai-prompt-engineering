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

export const WEEK4 = {
  week: 4,
  title: 'Reliability, Safety & Evaluation',
  objectives: 'Defend against prompt injection, reduce hallucination, and write evaluation rubrics instead of eyeballing output.',
  lab: {
    id: 'w4-guardrails-lab',
    prompt: 'Write a system prompt that refuses to answer unsafe or out-of-scope questions and otherwise answers normally, returning valid JSON matching {"answer": string, "refused": boolean} for any question asked.',
  },
  milestone: 'Add a guardrails layer (input validation + injection resistance) to the assistant, plus a 10-case automated eval suite. Publish the pass rate.',
};

export const WEEK5 = {
  week: 5,
  title: 'Retrieval-Augmented Generation (RAG)',
  objectives: 'Understand embeddings and semantic search, ground model answers in real documents, and cut hallucination via retrieval.',
  lab: {
    id: 'w5-rag-lab',
    prompt: 'Write a system prompt that answers a question only using the provided context, returning valid JSON matching {"answer": string, "grounded": boolean} for any question asked (grounded=false if the context does not contain the answer).',
  },
  milestone: 'Ground the assistant in a small knowledge base via RAG, with a source citation on every grounded answer.',
};

export const WEEK6 = {
  week: 6,
  title: 'Tool Use & Function Calling',
  objectives: 'Give the model real capabilities beyond text, design safe and well-specified tool schemas, and handle tool outputs and failures.',
  lab: {
    id: 'w6-tools-lab',
    prompt: 'Write a system prompt that decides whether a calculator tool is needed to answer a question, returning valid JSON matching {"needsTool": boolean, "answer": string} for any question asked.',
  },
  milestone: 'Wire at least one real tool (an API, the calculator, or the RAG search) into the assistant via function calling.',
};

export const WEEKS = [WEEK1, WEEK2, WEEK3, WEEK4, WEEK5, WEEK6];
