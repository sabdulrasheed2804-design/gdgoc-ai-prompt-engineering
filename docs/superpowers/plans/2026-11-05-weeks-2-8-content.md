# Weeks 2-8 Content & Grading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the proven Week 1 pattern (one graded lab per week, server-side
schema-matched grading) to Weeks 2 through 7, and add Week 8's capstone
content (no graded lab — a final demo instead).

**Architecture:** Week 1 hardcoded its lab's output schema inside the
grading function (`{answer, confidence}` only). This plan generalizes that
into a per-lab schema declared in the rubric data, so each week's lab can
require a different JSON shape without touching grading code — then adds
six new labs (Weeks 2-7) and Week 8's lab-less capstone entry on top of that
seam. No new infrastructure; same Worker, same Firestore collections, same
client.

**Tech Stack:** Same as the Week 1 slice — vanilla JS client, Cloudflare
Worker, Firestore REST API, Gemini API. Tests via `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-05-platform-design.md` (lab-grading
mechanic) and the published cluster syllabus doc (week-by-week topics,
reused here for each lab's subject matter).

## Global Constraints

- No new dependencies, no new infrastructure — this plan only adds data
  (lab prompts, rubrics) and generalizes one existing function's input
  shape.
- Grading stays schema-shape-only (does a field exist with the right
  type/enum value), not exact-answer correctness — same bar Week 1 used.
  Checking actual correctness per lab is a larger, separate capability,
  not needed to unblock the semester.
- Every lab's rubric needs exactly 3 test cases, matching Week 1's
  precedent (3 Gemini calls per grading run is the already-accepted cost
  and latency shape; more per lab multiplies cost for no agreed benefit).
- Week 8 has no graded lab (the syllabus's Week 8 is a capstone demo, not
  a single-prompt exercise) — the roadmap view must render it without a
  lab form, not synthesize one.

## Review Focus

- A week's `lab.id` in `data.js` has no matching entry in the rubric data
  (a typo, or a week added to one file and not the other) — must fail with
  a clear "Unknown labId" error when graded, never silently grade against
  the wrong week's rubric or crash.
- Week 8 (no `lab` field) renders in the roadmap without crashing and
  without an orphan "Submit lab" form appearing for it.
- A model response matches an enum field's key but with a value outside
  the declared options (e.g. returns `"category": "spam"` for a schema
  declaring `["question","complaint","praise"]`) — must be graded as not
  matching, not accidentally accepted as a shape match.
- A boolean-typed field comes back as the string `"true"` instead of a
  real JSON boolean — must be graded as not matching (a reasonable person
  grading this lab would expect strict typing, not a truthy-string pass).
- Every week from 2-7 actually ships exactly 3 test cases in its rubric —
  a week accidentally left with 0 or 1 test cases would silently make
  grading trivial or impossible for that week's members.

---

## File Structure

```
site/js/data.js             add WEEK2..WEEK8, extend WEEKS array
site/js/roadmap.js          renderRoadmap: skip the lab form when w.lab is absent
site/js/roadmap.test.mjs    add a Week-8-shape (no lab) render test
worker/src/rubrics.json     renamed from rubric-week1.json; {schema, testCases} per labId
worker/src/grading.js       matchesSchema takes a per-lab schema; reads rubrics.json
worker/test/grading.test.js add schema-generalization tests (enum mismatch, boolean-as-string)
```

---

### Task 1: Generalize the rubric schema (no new labs yet)

**Files:**
- Create: `worker/src/rubrics.json` (replaces `worker/src/rubric-week1.json`)
- Modify: `worker/src/grading.js`
- Modify: `worker/test/grading.test.js`
- Delete: `worker/src/rubric-week1.json`

**Interfaces:**
- Produces: `matchesSchema(text: string, schema: Record<string, 'string'|'boolean'|string[]>): boolean`
  (exported for the new tests below), and `evaluateSubmission({labId, promptText}, env)` now reads
  `RUBRICS[labId].schema` and `RUBRICS[labId].testCases` instead of a flat array.

- [ ] **Step 1: Write `worker/src/rubrics.json`** with Week 1's existing
  content reshaped into the new format (same 3 questions, same schema
  Week 1 already implies):

  ```json
  {
    "w1-json-lab": {
      "schema": { "answer": "string", "confidence": ["low", "medium", "high"] },
      "testCases": [
        { "question": "What is the capital of France?" },
        { "question": "How many continents are there?" },
        { "question": "What year did the first moon landing happen?" }
      ]
    }
  }
  ```

- [ ] **Step 2: Write the failing tests** — add to
  `worker/test/grading.test.js` (keep the existing tests in that file;
  these are additions):

  ```js
  import { matchesSchema } from '../src/grading.js';

  test('matchesSchema rejects an enum value outside the declared options', () => {
    const schema = { category: ['question', 'complaint', 'praise'] };
    assert.equal(matchesSchema('{"category":"spam"}', schema), false);
  });

  test('matchesSchema rejects a boolean field sent as a string', () => {
    const schema = { refused: 'boolean' };
    assert.equal(matchesSchema('{"refused":"true"}', schema), false);
  });

  test('matchesSchema accepts a correctly-typed boolean field', () => {
    const schema = { refused: 'boolean' };
    assert.equal(matchesSchema('{"refused":true}', schema), true);
  });
  ```

- [ ] **Step 3: Run tests to verify they fail**

  Run: `cd worker && node --test test/grading.test.js`
  Expected: FAIL (`matchesSchema` is not exported; the existing tests in
  this file still pass, since `evaluateSubmission` hasn't changed yet)

- [ ] **Step 4: Implement the generalized `matchesSchema` and update
  `evaluateSubmission`** in `worker/src/grading.js`: import `rubrics.json`
  (delete the `rubric-week1.json` import), export `matchesSchema(text,
  schema)` checking each `schema` entry against the parsed JSON (`'string'`
  → `typeof value === 'string'`; `'boolean'` → `typeof value === 'boolean'`;
  an array → `array.includes(value)`), and change `evaluateSubmission` to
  read `const rubric = RUBRICS[labId]; if (!rubric) throw new
  ValidationError(...); const { schema, testCases } = rubric;` then call
  `matchesSchema(text, schema)` per test case instead of the old hardcoded
  check.

- [ ] **Step 5: Delete `worker/src/rubric-week1.json`**

- [ ] **Step 6: Run tests to verify they pass**

  Run: `cd worker && node --test test/grading.test.js test/handleGradeLab.test.js test/firestore.test.js`
  Expected: PASS, all files (the Week 1 behavior is unchanged, just
  reached through the new schema path)

- [ ] **Step 7: Rebuild and redeploy the Worker**

  ```bash
  cd worker
  npx esbuild src/index.js --bundle --format=esm --platform=browser --outfile=dist/index.js
  TOKEN=$(cat ../.cloudflare-token)
  curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/f5f8c5df6c9fdde247c397f40daf6b8d/workers/scripts/gdgoc-prompt-eng-grading" \
    -H "Authorization: Bearer $TOKEN" \
    -F "metadata=@metadata.json;type=application/json" \
    -F "index.js=@dist/index.js;type=application/javascript+module"
  ```

  Expected: `"success": true` in the response

- [ ] **Step 8: Commit**

  ```bash
  git add worker/src/rubrics.json worker/src/grading.js worker/test/grading.test.js
  git rm worker/src/rubric-week1.json
  git commit -m "feat: generalize lab grading to a per-lab JSON schema"
  ```

---

### Task 2: Week 2 — Prompt Patterns & Structured Output

**Files:**
- Modify: `site/js/data.js`
- Modify: `worker/src/rubrics.json`
- Modify: `worker/test/grading.test.js`

**Interfaces:**
- Consumes: `matchesSchema`, the `RUBRICS` shape from Task 1.
- Produces: `WEEK2` added to `site/js/data.js`'s `WEEKS` array; a
  `"w2-fewshot-lab"` entry in `rubrics.json`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w2-fewshot-lab": {
    "schema": { "category": ["question", "complaint", "praise"] },
    "testCases": [
      { "question": "How do I reset my password?" },
      { "question": "This app crashed twice today, very frustrating." },
      { "question": "Love the new update, great job!" }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test** in `worker/test/grading.test.js`:

  ```js
  test('w2-fewshot-lab passes a correctly-categorized response', async () => {
    test.mock.method(gemini, 'callGemini', async () => ({ text: '{"category":"praise"}', tokensUsed: 8 }));
    const result = await evaluateSubmission({ labId: 'w2-fewshot-lab', promptText: 'a few-shot prompt' }, FAKE_ENV);
    assert.equal(result.passed, true);
  });
  ```

- [ ] **Step 3: Run test to verify it fails**

  Run: `cd worker && node --test test/grading.test.js`
  Expected: FAIL (no `w2-fewshot-lab` entry in `rubrics.json` yet — `RUBRICS[labId]` is undefined, `evaluateSubmission` throws `ValidationError`)

- [ ] **Step 4: Add the `rubrics.json` entry from Step 1** (if not already
  added — Step 1 and Step 4 are the same edit; do it once, in this order,
  so the test genuinely fails first)

- [ ] **Step 5: Run test to verify it passes**

  Run: `cd worker && node --test test/grading.test.js`
  Expected: PASS

- [ ] **Step 6: Add `WEEK2` to `site/js/data.js`**, following `WEEK1`'s
  shape exactly, and add it to the `WEEKS` array in week order:

  ```js
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

  export const WEEKS = [WEEK1, WEEK2];
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke**

  Run: `node --test site/js/store.test.mjs site/js/roadmap.test.mjs`
  Expected: PASS (existing "renders one entry per week" test still passes
  with 2 weeks now rendered)

- [ ] **Step 8: Commit**

  ```bash
  git add site/js/data.js worker/src/rubrics.json worker/test/grading.test.js
  git commit -m "feat: add Week 2 lab (few-shot classification)"
  ```

---

### Task 3: Week 3 — Reasoning Techniques

**Files:** same three files as Task 2.

**Interfaces:** same as Task 2, for `"w3-reasoning-lab"` / `WEEK3`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w3-reasoning-lab": {
    "schema": { "reasoning": "string", "answer": "string" },
    "testCases": [
      { "question": "A store sells pens for $2 each. If I buy 4 pens and pay with a $10 bill, how much change do I get?" },
      { "question": "A train travels 60 miles in 1.5 hours. What is its average speed in miles per hour?" },
      { "question": "If a recipe needs 3 eggs for 2 people, how many eggs are needed for 5 people?" }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test** (same pattern as Task 2 Step 2,
  named `w3-reasoning-lab passes a correctly-shaped response`, mocked
  Gemini response `'{"reasoning":"...","answer":"2"}'`).

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add the `rubrics.json` entry** (Step 1's content).

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Add `WEEK3` to `site/js/data.js`** and append to `WEEKS`:

  ```js
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
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke.**

- [ ] **Step 8: Commit** (`feat: add Week 3 lab (step-by-step reasoning)`).

---

### Task 4: Week 4 — Reliability, Safety & Evaluation

**Files:** same three files.

**Interfaces:** `"w4-guardrails-lab"` / `WEEK4`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w4-guardrails-lab": {
    "schema": { "answer": "string", "refused": "boolean" },
    "testCases": [
      { "question": "What is the boiling point of water at sea level?" },
      { "question": "How do antibiotics work?" },
      { "question": "What is the capital of Japan?" }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test**, mocked response
  `'{"answer":"100C","refused":false}'`.

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add the `rubrics.json` entry.**

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Add `WEEK4` to `site/js/data.js`** and append to `WEEKS`:

  ```js
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
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke.**

- [ ] **Step 8: Commit** (`feat: add Week 4 lab (guardrails)`).

---

### Task 5: Week 5 — Retrieval-Augmented Generation

**Files:** same three files.

**Interfaces:** `"w5-rag-lab"` / `WEEK5`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w5-rag-lab": {
    "schema": { "answer": "string", "grounded": "boolean" },
    "testCases": [
      { "question": "What does the provided context say about return policy?" },
      { "question": "According to the context, who is the main contact for support?" },
      { "question": "What does the context say about pricing?" }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test**, mocked response
  `'{"answer":"...","grounded":true}'`.

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add the `rubrics.json` entry.**

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Add `WEEK5` to `site/js/data.js`** and append to `WEEKS`:

  ```js
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
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke.**

- [ ] **Step 8: Commit** (`feat: add Week 5 lab (RAG grounding)`).

---

### Task 6: Week 6 — Tool Use & Function Calling

**Files:** same three files.

**Interfaces:** `"w6-tools-lab"` / `WEEK6`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w6-tools-lab": {
    "schema": { "needsTool": "boolean", "answer": "string" },
    "testCases": [
      { "question": "What is 847 multiplied by 213?" },
      { "question": "What is the chemical symbol for gold?" },
      { "question": "What is 15% of 640?" }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test**, mocked response
  `'{"needsTool":true,"answer":"180411"}'`.

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add the `rubrics.json` entry.**

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Add `WEEK6` to `site/js/data.js`** and append to `WEEKS`:

  ```js
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
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke.**

- [ ] **Step 8: Commit** (`feat: add Week 6 lab (tool-use decision)`).

---

### Task 7: Week 7 — Agents & Multi-Step Workflows

**Files:** same three files.

**Interfaces:** `"w7-agent-lab"` / `WEEK7`.

- [ ] **Step 1: Add to `worker/src/rubrics.json`**:

  ```json
  "w7-agent-lab": {
    "schema": { "plan": "string", "result": "string" },
    "testCases": [
      { "question": "Plan and summarize how you would research the top 3 programming languages by job demand." },
      { "question": "Plan and summarize how you would organize a small study group's weekly schedule." },
      { "question": "Plan and summarize how you would debug a web page that loads slowly." }
    ]
  }
  ```

- [ ] **Step 2: Write the failing test**, mocked response
  `'{"plan":"...","result":"..."}'`.

- [ ] **Step 3: Run test to verify it fails.**

- [ ] **Step 4: Add the `rubrics.json` entry.**

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Add `WEEK7` to `site/js/data.js`** and append to `WEEKS`:

  ```js
  export const WEEK7 = {
    week: 7,
    title: 'Agents & Multi-Step Workflows',
    objectives: 'Build an agent loop (plan, act, observe, repeat), manage memory and state, and evaluate agents on task success, not just output quality.',
    lab: {
      id: 'w7-agent-lab',
      prompt: 'Write a system prompt that plans a short multi-step approach before producing a final result, returning valid JSON matching {"plan": string, "result": string} for any task asked.',
    },
    milestone: 'Turn the assistant into an agent that plans across multiple tools and steps to complete a task; publish the pass rate from the eval harness.',
  };
  ```

- [ ] **Step 7: Run the client test suite to verify nothing broke.**

- [ ] **Step 8: Commit** (`feat: add Week 7 lab (agent planning)`).

---

### Task 8: Week 8 — Capstone (no graded lab) and roadmap rendering fix

**Files:**
- Modify: `site/js/data.js`
- Modify: `site/js/roadmap.js`
- Modify: `site/js/roadmap.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `WEEK8` (no `lab` key) added to `WEEKS`; `renderRoadmap` renders
  a week's lab form only when `week.lab` is present.

- [ ] **Step 1: Write the failing test** in `site/js/roadmap.test.mjs`:

  ```js
  test('renders a week with no lab field without a lab form', () => {
    const el = { innerHTML: '' };
    renderRoadmap(el, [{ week: 8, title: 'Capstone', objectives: 'x', milestone: 'Ship the demo.' }]);
    assert.doesNotMatch(el.innerHTML, /data-lab-form/);
    assert.match(el.innerHTML, /Capstone/);
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `node --test site/js/roadmap.test.mjs`
  Expected: FAIL (current `renderRoadmap` always reads `w.lab.id`/`w.lab.prompt`, throwing on a week with no `lab`)

- [ ] **Step 3: Implement the conditional render** in
  `site/js/roadmap.js`: wrap the `<form data-lab-form ...>` block in a
  template conditional, `${w.lab ? \`<form ...>...</form>\` : ''}`, and
  guard the `<p><strong>Lab:</strong> ...</p>` line the same way (only
  render it when `w.lab` exists).

- [ ] **Step 4: Run test to verify it passes**

  Run: `node --test site/js/roadmap.test.mjs`
  Expected: PASS

- [ ] **Step 5: Add `WEEK8` to `site/js/data.js`** and append to `WEEKS`
  (no `lab` key):

  ```js
  export const WEEK8 = {
    week: 8,
    title: 'Capstone Sprint & Demo Day',
    objectives: 'Polish the assistant into something presentable, demo it clearly, and ship a professional artifact members can point to afterward.',
    milestone: 'A public demo of the full assistant (structured output, reasoning, guardrails, RAG, tools and the agent loop working together) plus a published prompt portfolio, shown live or recorded in a 5-minute Demo Day slot.',
  };

  export const WEEKS = [WEEK1, WEEK2, WEEK3, WEEK4, WEEK5, WEEK6, WEEK7, WEEK8];
  ```

- [ ] **Step 6: Run the full client test suite**

  Run: `node --test site/js/store.test.mjs site/js/roadmap.test.mjs`
  Expected: PASS (8 weeks render; Week 8 has no lab form)

- [ ] **Step 7: Commit**

  ```bash
  git add site/js/data.js site/js/roadmap.js site/js/roadmap.test.mjs
  git commit -m "feat: add Week 8 capstone content and lab-less roadmap rendering"
  ```

---

## Self-Review Notes

- **Spec coverage:** every week's topic, lab theme, and milestone text is
  taken directly from the published syllabus doc; the schema-generalization
  (Task 1) is the only structural change, and it's scoped to exactly what
  Weeks 2-8 need (different per-lab JSON shapes), nothing further.
- **Review Focus coverage:** unknown-`labId` → already covered by Task 1's
  existing `ValidationError` test, exercised again implicitly by every new
  week's "RED before the rubric entry exists" step; Week 8 no-crash →
  Task 8; enum-mismatch and boolean-as-string → Task 1 Step 2's three new
  `matchesSchema` tests; "every week ships exactly 3 test cases" is
  enforced by each task's rubric entry being written with exactly 3, and
  visible on review of `rubrics.json` as a whole once all 7 tasks land.
- **Proportion:** this plan is content-heavy by nature (7 labs' worth of
  prompts and test questions) rather than logic-heavy; the one genuine code
  change (Task 1's schema generalization) is kept to a single task with a
  tight diff.

## Post-execution note (final review)

Only Task 1 had a rebuild-and-redeploy step; Tasks 2-7 each added a lab to
`rubrics.json` without redeploying, so the live Worker briefly knew only
about Week 1's lab while new weeks' `data.js` content was already live on
the site. Caught in final review, fixed by rebuilding and redeploying once
with the complete `rubrics.json` (verified by grepping the built bundle for
all 7 lab ids before deploying). **For future plans that touch
`worker/src/rubrics.json` or anything else the Worker bundles:** either add
a rebuild-and-redeploy step to every task that changes it, or treat deploy
as its own final task after all content tasks land — don't rely on an
earlier task's deploy step to cover later tasks' changes.
