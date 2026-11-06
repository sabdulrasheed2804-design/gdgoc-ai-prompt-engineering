# Weekly Content Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every week in `site/js/data.js` a topics list, curated resources,
and (for weeks 1-7) a 5-question self-check quiz with explanations, and render
all three in the roadmap view — closing roadmap item #1 from
`docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md`.

**Architecture:** Pure content addition to the existing `WEEKS` data plus one
new small module (`site/js/quiz.js`) for quiz rendering/scoring, wired into
the existing `renderRoadmap`/`wireLabForms` pair in `site/js/roadmap.js` and
`site/js/app.js`. No new Firestore collections, no server changes: the quiz
is an ungraded, client-only self-check, separate from the Worker-graded labs.

**Tech Stack:** Vanilla JS (ES modules), `node --test`, no build step — same
as the rest of `site/`.

**Spec:** `docs/superpowers/specs/2026-11-05-platform-design.md` and
`docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md` (roadmap item #1).

## Global Constraints

- No build step, vanilla JS, same as the rest of `site/`.
- No new Firestore collections or rules — quiz results are never persisted;
  this is a self-check, not an assessment (the server-graded labs remain the
  only thing that counts toward progress).
- All model-free, user-displayed text goes through `escapeHtml` from
  `site/js/util.js` — same convention as `roadmap.js` and `portfolio.js`.
- Follow this repo's existing render/wire split (`renderX(mountEl, ...)` sets
  `innerHTML`; a separate `wireX(mountEl, ...)` attaches listeners) rather
  than InfraTrack's single-file, global-namespace style.

## Review Focus

- **Week 8 (capstone) has no `lab` and no `quiz` field.** The roadmap card
  must render its topics/resources fine and must not crash or render an
  empty quiz block for the week with no quiz.
- **Resource titles/URLs and quiz question/option/explanation text must be
  HTML-escaped.** A title containing `<` or `"` must not inject markup into
  the page.
- **Re-clicking "Check answers" must be idempotent.** Stale `is-correct`/
  `is-incorrect` marks from a previous check must not accumulate or leave
  two conflicting marks on the same option.
- **An unanswered question must not crash scoring.** Clicking "Check
  answers" without selecting an option for every question must still
  produce a score (that question simply doesn't count as correct), not an
  exception.
- **Content shape must stay valid as `data.js` is edited over the semester.**
  A week missing topics/resources, or a quiz with the wrong option count or
  an out-of-range correct-answer index, should fail a test immediately
  rather than surface as a silent rendering bug.

---

### Task 1: Author topics, resources, and quizzes for all 8 weeks

**Files:**
- Modify: `site/js/data.js`
- Test: `site/js/data.test.mjs`

**Interfaces:**
- Produces: each entry in `WEEKS` gains `topics: string[]`,
  `resources: Array<{title: string, url: string}>`, and — for the 7 weeks
  that have a `lab` field — `quiz: Array<{q: string, o: string[4], a: number,
  e: string}>` (exactly 5 entries). Week 8 (no `lab`) gets `topics` and
  `resources` but no `quiz` key. Task 2 and Task 3 consume this shape.

- [ ] **Step 1: Write the failing structural tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKS } from './data.js';

test('every week has a non-empty topics list and resources list', () => {
  for (const w of WEEKS) {
    assert.ok(Array.isArray(w.topics) && w.topics.length > 0, `week ${w.week} topics`);
    assert.ok(Array.isArray(w.resources) && w.resources.length > 0, `week ${w.week} resources`);
    for (const r of w.resources) {
      assert.equal(typeof r.title, 'string');
      assert.match(r.url, /^https:\/\//);
    }
  }
});

test('every week with a lab has exactly a 5-question quiz with 4 valid options each', () => {
  for (const w of WEEKS.filter((w) => w.lab)) {
    assert.equal(w.quiz.length, 5, `week ${w.week} quiz length`);
    for (const item of w.quiz) {
      assert.equal(item.o.length, 4, `week ${w.week} question options`);
      assert.ok(item.a >= 0 && item.a < 4, `week ${w.week} answer index in range`);
      assert.ok(item.e.length > 0, `week ${w.week} explanation`);
    }
  }
});

test('week 8 (capstone) has no quiz field', () => {
  const week8 = WEEKS.find((w) => w.week === 8);
  assert.equal(week8.quiz, undefined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/data.test.mjs`
Expected: FAIL — `topics`/`resources`/`quiz` are `undefined` on every week.

- [ ] **Step 3: Add `topics`, `resources`, and `quiz` to each week in `site/js/data.js`**

Add the following to each `WEEK*` object (alongside the existing `week`,
`title`, `objectives`, `lab`, `milestone` fields — don't change those).
This is exact content, not a pattern to invent:

**WEEK1** (`topics`):
```
[
  'How LLMs generate text: next-token prediction, temperature and sampling',
  'Tokens, context windows, and why prompt length has a cost and a limit',
  'Zero-shot vs. few-shot prompting',
  'System prompts vs. user prompts vs. assistant turns',
  'Calling a real model API: auth, request/response shape, rate limits',
]
```
`resources`:
```
[
  { title: 'Prompt Engineering Guide', url: 'https://www.promptingguide.ai/' },
  { title: 'Anthropic: Prompt engineering overview', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview' },
  { title: 'OpenAI: Prompt engineering guide', url: 'https://platform.openai.com/docs/guides/prompt-engineering' },
]
```
`quiz`:
```
[
  { q: 'What does an LLM actually produce at each generation step?', o: ['A full sentence at once', 'A probability distribution over the next token', 'A database lookup result', 'A fixed template filled with variables'], a: 1, e: "LLMs generate one token at a time, sampling from a probability distribution the model computes over its vocabulary; that's why temperature changes behavior." },
  { q: 'Raising the temperature parameter mainly does what?', o: ['Makes responses shorter', 'Makes the model more deterministic', 'Makes output more random/diverse', 'Increases the context window'], a: 2, e: 'Higher temperature flattens the probability distribution, making less-likely tokens more likely to be picked — more varied, less predictable output.' },
  { q: "What's the difference between a system prompt and a user prompt?", o: ["There is no difference, they're interchangeable", 'The system prompt sets persistent behavior/role; the user prompt is the specific request', 'The system prompt is shown to the end user; the user prompt is hidden', 'System prompts are only for code, user prompts for natural language'], a: 1, e: 'The system prompt establishes instructions/persona that apply across the conversation; user prompts are the individual asks within it.' },
  { q: 'Why do context windows matter when designing a prompt?', o: ['They determine how many images the model can generate', 'They cap the total tokens (prompt + history + output) the model can process at once', "They control the model's temperature", 'They only affect billing, not behavior'], a: 1, e: "Everything — instructions, examples, conversation history, and the model's own answer — competes for the same fixed token budget." },
  { q: 'Zero-shot prompting means:', o: ['Giving the model zero instructions at all', 'Asking the model to perform a task with no worked examples in the prompt', 'Running the model with temperature set to 0', 'A prompt that always fails'], a: 1, e: 'Zero-shot gives a task description with no examples; few-shot adds one or more worked examples to steer the output.' },
]
```

**WEEK2** `topics`:
```
[
  'Few-shot prompting: choosing and ordering examples',
  'Getting reliable structured output (JSON) from a model',
  'Validating model output against a schema in code',
  'Controlling tone, format and length on demand',
  'Common failure modes: malformed JSON, extra prose around the answer',
]
```
`resources`:
```
[
  { title: 'Prompt Engineering Guide: Few-shot prompting', url: 'https://www.promptingguide.ai/techniques/fewshot' },
  { title: 'JSON Schema', url: 'https://json-schema.org/' },
  { title: 'OpenAI: Structured outputs guide', url: 'https://platform.openai.com/docs/guides/structured-outputs' },
]
```
`quiz`:
```
[
  { q: 'Why add few-shot examples to a prompt instead of relying on instructions alone?', o: ['Examples use fewer tokens than instructions', 'Examples show the model the exact pattern you want, which is often more reliable than describing it', 'Few-shot prompts never fail', 'Examples remove the need for a system prompt'], a: 1, e: 'Showing worked examples often steers format/style more reliably than describing the desired output in words alone.' },
  { q: 'A model keeps returning JSON wrapped in explanatory prose like "Sure, here\'s the JSON: {...}". What\'s the most reliable fix?', o: ['Lower the temperature to 0 and hope', 'Explicitly instruct it to return ONLY the JSON object, with no other text, and validate/retry in code', 'Switch to a different model entirely', 'Ask the user to clean up the output manually'], a: 1, e: "Explicit formatting constraints plus code-side validation (and a retry on failure) is the robust pattern; relying on the model to always comply isn't enough." },
  { q: "What should your code do if the model's output doesn't parse as valid JSON?", o: ['Crash the app immediately', 'Silently return an empty result', 'Catch the parse error and handle it explicitly (retry, fallback, or surface an error)', 'Assume it is valid and continue'], a: 2, e: 'Treat model output as untrusted input: a failed parse needs an explicit handling path, not a silent failure or a crash.' },
  { q: 'In a few-shot classification prompt, why does example order and balance matter?', o: ['It does not matter at all', 'Models can be biased toward patterns in example order/frequency, so skewed or poorly ordered examples can skew predictions', 'Order only matters for images, not text', 'More examples always means worse accuracy'], a: 1, e: 'LLMs can pick up on superficial patterns like label order or class imbalance in the examples, not just the task itself.' },
  { q: 'Which is the most robust way to enforce an exact output schema like {"category": "question"|"complaint"|"praise"}?', o: ['Ask nicely in the prompt and trust it', 'Combine clear prompt instructions with code-side schema validation of the response', 'Only use schema validation, skip prompt instructions', 'It is impossible to enforce a schema with an LLM'], a: 1, e: 'Prompting narrows what the model is likely to produce; code-side validation catches and handles the cases where it still does not comply.' },
]
```

**WEEK3** `topics`:
```
[
  'Chain-of-thought prompting: eliciting step-by-step reasoning',
  'Decomposing a complex task into smaller sub-steps',
  'Self-consistency: sampling multiple reasoning paths and taking a majority',
  'When visible reasoning helps vs. when it just adds cost/latency',
  "Separating a 'reasoning' field from a 'final answer' field in output",
]
```
`resources`:
```
[
  { title: 'Chain-of-Thought Prompting (Wei et al., 2022)', url: 'https://arxiv.org/abs/2201.11903' },
  { title: 'Prompt Engineering Guide: Chain-of-Thought', url: 'https://www.promptingguide.ai/techniques/cot' },
  { title: 'Prompt Engineering Guide: Self-consistency', url: 'https://www.promptingguide.ai/techniques/consistency' },
]
```
`quiz`:
```
[
  { q: 'What is chain-of-thought prompting?', o: ['Asking the model to chain multiple API calls together', 'Asking the model to reason step-by-step before giving a final answer', 'A technique for chaining fine-tuned models', 'A way to reduce token usage'], a: 1, e: 'CoT prompts the model to show intermediate reasoning steps, which often improves accuracy on multi-step problems.' },
  { q: 'What is self-consistency in the context of LLM reasoning?', o: ['Checking that the model uses consistent variable names in code', 'Sampling multiple independent reasoning paths and taking the majority/most common final answer', 'Running the same prompt once and trusting the result', 'A setting that forces temperature to exactly match previous runs'], a: 1, e: 'Self-consistency generates several reasoning chains (often with some randomness) and picks the most common answer, which tends to be more reliable than a single sample.' },
  { q: 'Why might you ask a model to decompose a task into sub-steps rather than answer directly?', o: ['It is always faster', 'Complex tasks are often solved more reliably by breaking them into smaller, verifiable pieces', 'Decomposition eliminates the need for any prompt engineering', 'It reduces token usage'], a: 1, e: 'Breaking a hard problem into smaller steps the model can solve (and you can verify) individually tends to reduce errors on complex tasks.' },
  { q: 'What is a real cost of always asking for visible step-by-step reasoning?', o: ['None — it is strictly better in every case', 'It can noticeably increase tokens used, latency and cost, which is not worth it for simple tasks', 'It makes the model refuse more often', 'It disables JSON output entirely'], a: 1, e: 'Reasoning tokens add real latency and cost — worth it for genuinely hard tasks, wasteful for trivial ones.' },
  { q: 'Why separate a reasoning field from the final-answer field in structured output (e.g. {"reasoning": ..., "answer": ...})?', o: ['So the reasoning can be hidden or shown independently of the answer your app actually uses', 'Because models cannot output reasoning and an answer in the same response otherwise', 'It is required by JSON syntax', 'To make the response harder to parse'], a: 0, e: "Separating fields lets your app use the answer programmatically while optionally surfacing the reasoning trace to the user, debugger, or reviewer." },
]
```

**WEEK4** `topics`:
```
[
  'Prompt injection: what it is and how untrusted input can hijack instructions',
  'Guardrails: input validation and refusal behavior for unsafe/out-of-scope requests',
  'Hallucination: why models state incorrect things confidently, and how to reduce it',
  'Writing an evaluation rubric instead of eyeballing output',
  'Building a small automated eval suite: test cases + pass/fail criteria',
]
```
`resources`:
```
[
  { title: 'OWASP Top 10 for LLM Applications', url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/' },
  { title: 'Anthropic: Mitigating jailbreaks and prompt injections', url: 'https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks' },
  { title: 'OpenAI: Evals guide', url: 'https://platform.openai.com/docs/guides/evals' },
]
```
`quiz`:
```
[
  { q: 'What is a prompt injection attack?', o: ["A SQL injection targeting the model's training data", 'Untrusted input (e.g. from a user or a document) that tries to override the system\'s original instructions', 'A technique for speeding up inference', "A bug in the model's tokenizer"], a: 1, e: 'Prompt injection smuggles new instructions inside content the model processes as data, trying to make it ignore its original instructions.' },
  { q: 'Why is "the model refuses everything unusual" not a good guardrail design?', o: ['It is always the correct design', 'It hurts legitimate use by over-refusing, without actually closing every attack path', 'Refusing is technically impossible for LLMs', 'It makes the model faster'], a: 1, e: 'Overly broad refusal frustrates real users on edge cases while determined attackers still probe for gaps — guardrails need to be scoped and tested, not just maximized.' },
  { q: 'What is hallucination, in the context of LLMs?', o: ['The model running out of memory', 'The model generating confident, fluent output that is factually wrong or unsupported', 'A visual rendering bug in the chat UI', 'A model refusing to answer'], a: 1, e: 'Hallucination is fabricated or incorrect content stated with the same fluent confidence as correct content — which is what makes it dangerous.' },
  { q: 'What is the main advantage of a written evaluation rubric over "eyeballing" model output?', o: ['Rubrics are faster to write than reading output once', 'A rubric defines pass/fail criteria explicitly and consistently, so results do not depend on who is reviewing or their mood that day', 'Rubrics eliminate the need for test cases', 'Eyeballing is always more accurate'], a: 1, e: 'A rubric makes grading repeatable and comparable across submissions and reviewers, instead of relying on subjective impression.' },
  { q: 'What should a small automated eval suite for a prompt consist of?', o: ['One single example that always passes', 'A set of representative test cases with explicit expected outcomes/criteria that the prompt is run against automatically', 'A manual checklist filled out by hand each time', 'Nothing — evals are not needed if the prompt looks right'], a: 1, e: 'An eval suite runs the prompt against multiple representative cases automatically and checks each against explicit criteria, catching regressions a single manual check would miss.' },
]
```

**WEEK5** `topics`:
```
[
  'Embeddings and semantic search: representing meaning as vectors',
  'Chunking documents for retrieval',
  'Grounding model answers in retrieved context instead of parametric memory',
  "Citing sources so an answer's grounding can be checked",
  "Recognizing when retrieved context doesn't actually answer the question",
]
```
`resources`:
```
[
  { title: 'Pinecone: What is Retrieval-Augmented Generation?', url: 'https://www.pinecone.io/learn/retrieval-augmented-generation/' },
  { title: 'LangChain: RAG concepts', url: 'https://python.langchain.com/docs/concepts/rag/' },
  { title: 'Prompt Engineering Guide: RAG', url: 'https://www.promptingguide.ai/techniques/rag' },
]
```
`quiz`:
```
[
  { q: 'What problem does RAG primarily address?', o: ['Making the model generate faster', 'Grounding answers in up-to-date or specific documents the model was not trained on, reducing hallucination', "Reducing the model's temperature automatically", 'Replacing the need for prompts entirely'], a: 1, e: 'RAG retrieves relevant external content at query time and feeds it into the prompt, so answers can be grounded in real, current, specific documents.' },
  { q: 'What is a text embedding, roughly speaking?', o: ['A compressed version of the raw text file', 'A numeric vector representing the meaning of a piece of text, used to compare semantic similarity', 'A password used to access the model API', 'A formatting style for displaying text'], a: 1, e: 'Embeddings map text into a vector space where semantically similar text ends up close together, which is what makes semantic search work.' },
  { q: 'Why do RAG systems split documents into chunks instead of embedding whole documents?', o: ['Chunking is purely cosmetic and has no effect on retrieval quality', 'Smaller, focused chunks retrieve and match more precisely, and fit within context limits alongside the query', "It is required by every embedding model's API", 'Chunking removes the need for embeddings'], a: 1, e: 'Whole-document embeddings blur together many topics; chunking keeps each embedded unit focused, improving retrieval precision and fitting context budgets.' },
  { q: 'Why is citing sources important in a RAG answer?', o: ['It is only for legal compliance, not utility', 'It lets a user verify the answer actually comes from the retrieved context rather than the model\'s own ungrounded guess', 'Citations make responses load faster', 'It is required by the embeddings API'], a: 1, e: 'A citation lets you check whether the retrieved context actually supports the claim — central to why RAG is supposed to reduce hallucination.' },
  { q: "What should a well-designed RAG prompt do when the retrieved context doesn't contain the answer?", o: ['Make up a plausible-sounding answer anyway', 'Explicitly say it does not know / is not grounded, rather than guessing', 'Retry with a higher temperature until something is generated', 'Ignore the context and always answer from general knowledge'], a: 1, e: 'A good RAG system is designed to admit when the context does not support an answer (e.g. a grounded:false flag) rather than fabricating one.' },
]
```

**WEEK6** `topics`:
```
[
  'Why models need tools: capabilities beyond generating text',
  'Designing a tool/function schema: name, description, parameters',
  'Deciding when a tool call is needed vs. not',
  'Handling tool outputs and errors in the conversation loop',
  'Keeping tool access safe and scoped (least privilege)',
]
```
`resources`:
```
[
  { title: 'OpenAI: Function calling guide', url: 'https://platform.openai.com/docs/guides/function-calling' },
  { title: 'Anthropic: Tool use overview', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview' },
  { title: 'Prompt Engineering Guide: Tool use', url: 'https://www.promptingguide.ai/applications/function_calling' },
]
```
`quiz`:
```
[
  { q: 'What is "function calling" / "tool use" in the context of LLMs?', o: ['The model editing its own source code', 'The model being given a schema of callable functions/tools and deciding when and how to invoke them to complete a task', 'A way to call multiple models simultaneously', 'A debugging feature for developers only'], a: 1, e: 'Tool use lets a model request a specific function be run (e.g. a calculator or API call) with arguments it fills in, extending it beyond pure text generation.' },
  { q: 'What should a well-designed tool schema include?', o: ['Just a function name, nothing else', 'A clear name, a description of what it does and when to use it, and a well-specified parameter schema', 'The full source code of the function', 'Nothing — models infer tool behavior automatically'], a: 1, e: 'The model decides whether and how to call a tool based on its name, description and parameter schema — vague or missing descriptions lead to wrong or missed calls.' },
  { q: 'A model should decide NOT to call a calculator tool when:', o: ['The question requires no arithmetic at all', 'Every single time, tools should never be skipped', 'The question is phrased as a complete sentence', 'The user is logged in'], a: 0, e: 'Good tool-use design means calling a tool only when it is actually needed — unnecessary calls add latency and cost for no benefit.' },
  { q: 'If a tool call fails or returns an error, what should the system do?', o: ['Crash silently with no explanation', 'Feed the error back into the conversation so the model (or the app) can handle or report it appropriately', 'Always retry the exact same call forever', 'Ignore the tool and fabricate a plausible result'], a: 1, e: 'Tool failures need to be surfaced back into the loop so the model or app logic can decide how to recover or report the failure — never faked or silently dropped.' },
  { q: 'Why should tool access follow a least-privilege principle?', o: ['It does not matter since models are trustworthy by default', 'Limiting what a tool can do/access reduces the damage if the model is misled (e.g. by prompt injection) into misusing it', 'Least privilege only applies to human users, not models', 'It makes tool calls faster'], a: 1, e: "Since a model's tool-calling decisions can be manipulated (e.g. via injected instructions in retrieved content), scoping each tool's actual capability limits the worst case." },
]
```

**WEEK7** `topics`:
```
[
  'The plan-act-observe loop: how an agent structures multi-step work',
  'Managing memory and state across steps',
  'Stopping conditions: knowing when an agent is done (or stuck)',
  'Evaluating agents on task success, not just output quality',
  'Failure modes specific to agents: loops, drift, compounding errors',
]
```
`resources`:
```
[
  { title: 'Anthropic: Building effective agents', url: 'https://www.anthropic.com/research/building-effective-agents' },
  { title: 'Lilian Weng: LLM Powered Autonomous Agents', url: 'https://lilianweng.github.io/posts/2023-06-23-agent/' },
  { title: 'Prompt Engineering Guide: LLM Agents', url: 'https://www.promptingguide.ai/research/llm-agents' },
]
```
`quiz`:
```
[
  { q: 'What is the core loop an agent typically follows?', o: ['Plan, act, observe, repeat until done or stopped', 'Generate once and immediately stop, always', 'Train, validate, deploy', 'Encrypt, transmit, decrypt'], a: 0, e: 'Agents typically plan a next step, take an action (often a tool call), observe the result, and repeat — adjusting the plan based on what happened.' },
  { q: 'Why is a stopping condition critical in agent design?', o: ['It is not — agents should run until the server is shut down', 'Without one, an agent can loop indefinitely, wasting cost/time, or never report a result', 'Stopping conditions only matter for games, not agents', 'Every agent naturally knows when to stop without being told'], a: 1, e: 'An explicit stopping condition (task success, a step limit, or detecting it is stuck) prevents runaway loops and guarantees the agent eventually reports back.' },
  { q: "What's a common failure mode unique to multi-step agents (vs. single-turn prompts)?", o: ['JSON parsing errors', "Compounding errors — an early mistake in the plan or an observation misreads cascades into every later step", 'Running out of disk space', 'Nothing — agents fail the same way single prompts do'], a: 1, e: "Because each step builds on the previous one's state, an early error can propagate and amplify rather than staying isolated, unlike an independent single-turn call." },
  { q: "Why evaluate an agent on task success rather than just the quality of its individual outputs?", o: ['Individual output quality is the only thing that matters', 'An agent can produce fluent, well-formatted intermediate steps while still failing to actually complete the overall task', 'Task success and output quality are always identical', 'Agents cannot be evaluated at all'], a: 1, e: 'A step can look reasonable in isolation while the agent as a whole still fails to achieve the actual goal — so the end-to-end outcome is what matters most.' },
  { q: "What's one way to manage state/memory across an agent's steps?", o: ['Rely on the model to remember everything with no explicit state', 'Explicitly carry forward relevant context (e.g. prior observations, a running plan) between steps rather than assuming it persists implicitly', 'State management is unnecessary for agents', 'Use a new unrelated model for every step'], a: 1, e: "Agents typically need explicit state passed between steps (plan so far, tool results, scratchpad) since each call to the model is otherwise independent." },
]
```

**WEEK8** (no `lab`, so no `quiz`) `topics`:
```
[
  'Structuring a clear, time-boxed technical demo',
  'Anticipating and handling Q&A on design decisions',
  'Curating a prompt portfolio that shows range: structured output, reasoning, guardrails, RAG, tools, agent loop',
  'Writing a short public write-up of what was built',
]
```
`resources`:
```
[
  { title: 'Prompt Engineering Guide', url: 'https://www.promptingguide.ai/' },
  { title: 'Make a README', url: 'https://www.makeareadme.com/' },
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/data.test.mjs`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Commit**

```bash
git add site/js/data.js site/js/data.test.mjs
git commit -m "feat: add topics, resources, and quizzes to all 8 weeks"
```

---

### Task 2: Quiz module — pure scoring plus render

**Files:**
- Create: `site/js/quiz.js`
- Test: `site/js/quiz.test.mjs`

**Interfaces:**
- Produces: `renderQuiz(quiz: Array<{q,o,a,e}>): string` — an HTML fragment
  (empty string if `quiz` is undefined/empty) with the exact structure below,
  for Task 3 to embed inside a week card. `wireQuiz(mountEl): void` —
  attaches click handlers to every `[data-quiz]` block under `mountEl`; not
  unit-tested (this repo's convention, see `wireLabForms`/
  `wirePortfolioToggles`, is to leave DOM-event wiring to manual browser
  verification and unit-test only the pure logic it calls). `scoreQuiz(correctAnswers:
  number[], selectedAnswers: number[]): number` — count of indices where
  `selectedAnswers[i] === correctAnswers[i]`.

`renderQuiz`'s exact output shape (Task 3 and `wireQuiz` both depend on
these data attributes):

```html
<div class="quiz" data-quiz>
  <h3 class="quiz__heading">Quick check</h3>
  <div class="quiz__question" data-quiz-question="0" data-answer="1">
    <p class="quiz__q">1. <!-- escaped question text --></p>
    <div class="quiz__options">
      <button type="button" class="quiz__option" data-quiz-option data-q="0" data-opt="0"><!-- escaped option --></button>
      <!-- ...3 more options... -->
    </div>
    <p class="quiz__explain" data-quiz-explain hidden><!-- escaped explanation --></p>
  </div>
  <!-- ...repeated per question... -->
  <button type="button" class="btn btn--primary" data-quiz-check>Check answers</button>
  <p class="quiz__score" data-quiz-score hidden></p>
</div>
```

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderQuiz, scoreQuiz } from './quiz.js';

test('scoreQuiz counts matching answers', () => {
  assert.equal(scoreQuiz([1, 0, 2], [1, 0, 2]), 3);
  assert.equal(scoreQuiz([1, 0, 2], [1, 1, 2]), 2);
});

test('scoreQuiz does not count an unanswered question as correct', () => {
  assert.equal(scoreQuiz([1, 0], [1, undefined]), 1);
});

test('renderQuiz returns an empty string for an empty or missing quiz', () => {
  assert.equal(renderQuiz(undefined), '');
  assert.equal(renderQuiz([]), '');
});

test('renderQuiz includes each question, its 4 options, and the correct-answer index', () => {
  const html = renderQuiz([{ q: 'Q1?', o: ['a', 'b', 'c', 'd'], a: 2, e: 'because' }]);
  assert.match(html, /data-quiz-question="0" data-answer="2"/);
  assert.match(html, /Q1\?/);
  for (const opt of ['a', 'b', 'c', 'd']) assert.match(html, new RegExp(`>${opt}<`));
  assert.match(html, /data-quiz-explain hidden>because/);
});

test('renderQuiz escapes HTML in question, option, and explanation text', () => {
  const html = renderQuiz([{ q: '<b>Q</b>', o: ['<i>x</i>', 'b', 'c', 'd'], a: 0, e: '<script>' }]);
  assert.doesNotMatch(html, /<b>Q<\/b>/);
  assert.doesNotMatch(html, /<i>x<\/i>/);
  assert.doesNotMatch(html, /<script>/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/quiz.test.mjs`
Expected: FAIL — `quiz.js` does not exist.

- [ ] **Step 3: Implement `site/js/quiz.js`**

`scoreQuiz`: a one-line `reduce`/`filter` over the shorter approach — count
indices where `selectedAnswers[i] === correctAnswers[i]`.

`renderQuiz`: build the HTML shown above with `.map().join('')` over
`quiz`, numbering questions `${qi + 1}.` before the escaped question text,
escaping `q`/each `o`/`e` with `escapeHtml` from `./util.js`. Return `''`
immediately if `!quiz || quiz.length === 0`.

`wireQuiz(mountEl)`: for each `mountEl.querySelectorAll('[data-quiz]')`
block: track a `selected` array scoped to that block. For each
`[data-quiz-option]` button, on click: record `selected[Number(q)] =
Number(opt)`, then toggle an `is-selected` class so it's the only selected
option among `[data-quiz-option]` siblings sharing the same `data-q` within
that block. For the block's single `[data-quiz-check]` button, on click:
for every `[data-quiz-question]` in the block, first clear any existing
`is-correct`/`is-incorrect` classes from its options (making repeat clicks
idempotent — Review Focus item), read `correct = Number(questionEl.dataset.answer)`
and the question's index from `data-quiz-question`, add `is-correct` to the
option whose `data-opt == correct`, add `is-incorrect` to the selected
option if it differs from `correct`, and unhide that question's
`[data-quiz-explain]`. Build `correctAnswers`/`selectedAnswers` arrays
across all questions in the block, call `scoreQuiz`, and set the block's
`[data-quiz-score]` text to `` `Score: ${score}/${total}` `` and unhide it.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/quiz.test.mjs`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add site/js/quiz.js site/js/quiz.test.mjs
git commit -m "feat: add quiz.js (ungraded self-check scoring and rendering)"
```

---

### Task 3: Wire topics, resources, and the quiz into the roadmap view

**Files:**
- Modify: `site/js/roadmap.js`
- Modify: `site/js/roadmap.test.mjs`
- Modify: `site/js/app.js`
- Modify: `site/css/styles.css`

**Interfaces:**
- Consumes: `renderQuiz`/`wireQuiz` (Task 2); `w.topics`/`w.resources`/
  `w.quiz` (Task 1).

- [ ] **Step 1: Write the failing tests**

```js
test('renders topics and resources for a week that has them', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'T', objectives: 'x', milestone: 'm',
    topics: ['Topic one'],
    resources: [{ title: 'Res one', url: 'https://example.com' }],
  }]);
  assert.match(el.innerHTML, /Topic one/);
  assert.match(el.innerHTML, /Res one/);
  assert.match(el.innerHTML, /href="https:\/\/example\.com"/);
});

test('escapes HTML in topics and resource titles', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [{
    week: 1, title: 'T', objectives: 'x', milestone: 'm',
    topics: ['<script>'],
    resources: [{ title: '<img onerror=x>', url: 'https://example.com' }],
  }]);
  assert.doesNotMatch(el.innerHTML, /<script>/);
  assert.doesNotMatch(el.innerHTML, /<img onerror/);
});

test('renders a quiz block for a week with a quiz, omits it otherwise', () => {
  const el = { innerHTML: '' };
  renderRoadmap(el, [
    { week: 1, title: 'With quiz', objectives: 'x', milestone: 'm', quiz: [{ q: 'Q', o: ['a', 'b', 'c', 'd'], a: 0, e: 'e' }] },
    { week: 2, title: 'No quiz', objectives: 'x', milestone: 'm' },
  ]);
  const withQuizCard = el.innerHTML.split('No quiz')[0];
  assert.match(withQuizCard, /data-quiz/);
  const noQuizCard = el.innerHTML.split('No quiz')[1];
  assert.doesNotMatch(noQuizCard, /data-quiz/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/roadmap.test.mjs`
Expected: FAIL — no topics/resources/quiz markup is rendered yet.

- [ ] **Step 3: Import `renderQuiz` in `roadmap.js` and extend `renderRoadmap`'s template**

Add, inside each week card (topics after the objectives paragraph; the
quiz block and a resources list after the existing milestone/lab-form
markup, in that order — quiz first since it's the self-check on what was
just read, resources last as further reading):

```html
${w.topics ? `<ul class="week-card__topics">${w.topics.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
```
and, after the existing lab-form block:
```html
${w.quiz ? renderQuiz(w.quiz) : ''}
${w.resources ? `
  <div class="week-card__resources">
    <h3>Go further</h3>
    <ul>${w.resources.map((r) => `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a></li>`).join('')}</ul>
  </div>
` : ''}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/roadmap.test.mjs`
Expected: PASS, all tests (existing + 3 new).

- [ ] **Step 5: Wire `wireQuiz` into the roadmap route in `app.js`**

In `renderRoadmapRoute`, after the existing `wireLabForms(mountEl,
currentMember.uid);` line, add `wireQuiz(mountEl);` (import `wireQuiz` from
`./quiz.js` alongside the existing imports).

- [ ] **Step 6: Add quiz/topics/resources styles to `site/css/styles.css`**

Reuse existing tokens, don't invent new ones: `.week-card__topics` and
`.week-card__resources` as simple lists matching the existing
`.week-card__objectives`/`.week-card__milestone` typography.
`.quiz__option` as a button styled like a secondary/outline button (reuse
`--color-border`/`--color-surface`, not a new button variant);
`.quiz__option.is-selected` with a `--color-blue` border/background tint;
`.quiz__option.is-correct` with `--color-green`; `.quiz__option.is-incorrect`
with `--color-red`; `.quiz__explain` as muted text (`--color-text-muted`).

- [ ] **Step 7: Run the full site test suite**

Run: `node --test site/js/*.test.mjs`
Expected: PASS, all files.

- [ ] **Step 8: Manual verification in a browser**

Serve `site/` locally, sign in, open Roadmap. Confirm: every week shows
topics and a "Go further" resources list with working links (opening in a
new tab); weeks 1-7 show a "Quick check" quiz, week 8 doesn't. Pick a
quiz, select one option per question (confirm only one option per question
can be selected at a time), click "Check answers": confirm the score line
appears, correct options are marked green, any wrong selection is marked
red, and every explanation becomes visible. Click "Check answers" again
without changing anything: confirm the score and marks stay correct and
don't duplicate. Reload and leave one question unanswered before checking:
confirm it doesn't crash and the score reflects only the answered
questions.

Expected: all of the above hold; no console errors.

- [ ] **Step 9: Commit**

```bash
git add site/js/roadmap.js site/js/roadmap.test.mjs site/js/app.js site/css/styles.css
git commit -m "feat: render topics, resources, and the self-check quiz in the roadmap"
```
