# Core Scaffold & Week 1 Live-Graded Lab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the deployable app shell (auth, storage, roadmap view) and
prove the platform's one genuinely new mechanic — a prompt lab that is
actually graded server-side against test cases, not self-ticked — working
end to end for Week 1.

**Architecture:** A static site (`site/`, no build step) backed by Firebase
Auth + Firestore, deployed via GitHub Pages/Actions, same shape as the
InfraTrack reference but built independently. One Firebase Cloud Function
(`functions/`) holds the Gemini API key, grades a submitted prompt against a
bundled rubric, enforces a per-member daily token cap, and records the
result in Firestore. The client never talks to Gemini directly.

**Tech Stack:** Vanilla HTML/CSS/JS (client), Node.js + Firebase Cloud
Functions (server), Firebase Auth + Firestore (Spark/free plan), Google
Gemini API (free tier), GitHub Pages + Actions. Tests run with Node's
built-in `node:test` runner — no bundler, no test framework dependency.

**Spec:** `docs/superpowers/specs/2026-11-05-platform-design.md`

## Global Constraints

- No build step; client code is plain HTML/CSS/JS served as static files.
- Firebase Spark (free) plan and GitHub Pages/Actions only — no paid infra.
- Exactly one Cloud Function holds the LLM API key; the client never
  receives or sends it.
- LLM provider is Google Gemini API (free tier, AI Studio key), chosen for
  its lasting free tier.
- Per-member daily token usage is capped and tracked in Firestore; exceeding
  the cap fails closed with a clear message, never a silent retry.
- Concurrent grading requests are handled with retry/backoff inside the
  function, not a queue.
- The grading function's design must stay extensible to later weeks' RAG/
  tool/agent grading without adding new infrastructure (bundled data, mock
  tools, bounded loops — all inside this one function) — Week 1 doesn't need
  this yet, but its interface shouldn't paint that in a corner.
- This is an independent rebuild of InfraTrack's pattern, not a fork of its
  code (its repo has no license).

## Review Focus

- A member exceeds their daily token cap mid-lab — must see a clear
  "cap reached" message, not a silent failure, a crash, or a retry loop.
- Gemini API errors or times out — member sees an error state and can retry
  the submission; no `labRuns` record is written claiming a grade happened.
- Member submits an empty or missing `promptText` — function rejects with a
  validation error before calling the LLM, never wastes a call on it.
- A request to `gradeLab` for a `memberId` that isn't the authenticated
  caller is rejected — the rubric lives server-side specifically so it can't
  be read or spoofed by tampering with the client.
- The app runs in local mode (no Firebase config) for browsing content, but
  grading requires the live function — local mode must disable/explain the
  lab submit button, not silently fail or fake a result.

---

## File Structure

```
site/
  index.html          app shell: header, nav, view mount point
  css/styles.css       base layout + GDG-neutral theme tokens
  js/config.js          PROGRAM settings + FIREBASE config object
  js/data.js             Week 1 module content (objectives/topics/lab/resources)
  js/store.js            localStorage vs Firestore abstraction
  js/auth.js              Google sign-in wrapper
  js/roadmap.js            renders the week list + Week 1 module view
  js/grading-client.js      calls the gradeLab function, renders result
  js/app.js                 boot: wires auth + router + mounts roadmap
  assets/favicon.svg
functions/
  index.js              exports gradeLab (Cloud Function)
  gemini.js             thin wrapper around the Gemini API call
  rubric-week1.json     Week 1 lab's test cases
  test/
    gradeLab.test.js     node:test suite, Gemini client mocked
firestore.rules
.github/workflows/pages.yml
```

---

### Task 1: Repo scaffold and static shell

**Files:**
- Create: `site/index.html`
- Create: `site/css/styles.css`
- Create: `site/assets/favicon.svg`
- Create: `.github/workflows/pages.yml`
- Create: `.gitignore`

**Interfaces:**
- Produces: a static page with `<div id="app"></div>` as the mount point
  every later view renders into.

- [ ] **Step 1: Write `site/index.html`** with a title, a link to
  `css/styles.css`, the favicon, an `<div id="app"></div>`, and a
  `<script type="module" src="js/app.js"></script>` tag. `js/app.js` can be
  an empty module for now (`console.log('boot')`).
- [ ] **Step 2: Write `.gitignore`** excluding `node_modules/`,
  `functions/node_modules/`, and `.firebase/`.
- [ ] **Step 3: Verify locally**

  Run: `cd site && python -m http.server 8080`, open `http://localhost:8080`
  Expected: page loads, title shows, console logs `boot`, no 404s for css/favicon.

- [ ] **Step 4: Write `.github/workflows/pages.yml`**: on push to `main`,
  checkout, upload `site/` as a Pages artifact, deploy via
  `actions/deploy-pages`. Follow the standard
  `actions/upload-pages-artifact` + `actions/deploy-pages` pattern, `path: site`.
- [ ] **Step 5: Commit**

  ```bash
  git add site .github .gitignore
  git commit -m "feat: static app shell and Pages deploy workflow"
  ```

---

### Task 2: Config and storage abstraction

**Files:**
- Create: `site/js/config.js`
- Create: `site/js/store.js`
- Create: `site/js/store.test.mjs`
- Modify: `site/index.html` (add Firebase SDK script tags via CDN `<script type="module">` imports)

**Interfaces:**
- Produces: `PROGRAM` object (`{ name, weekStart, timezone }`) and
  `FIREBASE` object (config placeholder, filled in by the lead later) from
  `config.js`.
- Produces from `store.js`:
  - `isLocalMode(): boolean` — true when `FIREBASE` is unset/placeholder.
  - `getMember(uid: string): Promise<object|null>`
  - `setMember(uid: string, data: object): Promise<void>`
  - `recordLabRun(uid: string, run: object): Promise<void>` — appends to
    local array in local mode, or to Firestore `labRuns` collection in
    Firebase mode.

- [ ] **Step 1: Write `site/js/config.js`** exporting `PROGRAM` (`name:
  "AI Prompt Engineering Cluster"`, `weekStart`: ISO date string, placeholder
  for now) and `FIREBASE` (`null` placeholder — local mode until a lead fills
  it in).
- [ ] **Step 2: Write the failing test** in `site/js/store.test.mjs`:

  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { isLocalMode, setMember, getMember } from './store.js';

  test('local mode round-trips a member record', async () => {
    assert.equal(isLocalMode(), true);
    await setMember('uid1', { name: 'Ada' });
    const m = await getMember('uid1');
    assert.equal(m.name, 'Ada');
  });
  ```

- [ ] **Step 3: Run test to verify it fails**

  Run: `node --test site/js/store.test.mjs`
  Expected: FAIL (`store.js` doesn't exist yet)

- [ ] **Step 4: Implement `site/js/store.js`** with the four functions above.
  Local mode persists to an in-memory object when `localStorage` is
  unavailable (Node test environment) and to real `localStorage` in a
  browser — detect with a `try/catch` around a `localStorage` probe, per the
  project's rule that browser storage access must never throw uncaught.
  Firebase-mode branch (used once `FIREBASE` is set) calls
  `firebase/firestore` modular SDK functions (`getFirestore`, `doc`,
  `setDoc`, `getDoc`, `addDoc`, `collection`) — import them dynamically only
  when not in local mode, so Node tests never load the Firebase SDK.

- [ ] **Step 5: Run test to verify it passes**

  Run: `node --test site/js/store.test.mjs`
  Expected: PASS

- [ ] **Step 6: Commit**

  ```bash
  git add site/js/config.js site/js/store.js site/js/store.test.mjs
  git commit -m "feat: config and local/Firestore storage abstraction"
  ```

---

### Task 3: Google sign-in and registration

**Files:**
- Create: `site/js/auth.js`
- Modify: `site/index.html` (sign-in button in header)
- Create: `firestore.rules`

**Interfaces:**
- Consumes: `FIREBASE`, `isLocalMode()` from `store.js` (Task 2).
- Produces: `onAuthChange(callback: (member: {uid, name, email}|null) => void): void`
  — the only auth entry point later tasks use; `signIn(): Promise<void>` and
  `signOut(): Promise<void>`.

- [ ] **Step 1: Write `firestore.rules`**: a member can read/write only
  `members/{uid}` where `uid == request.auth.uid`; `labRuns` and `apiUsage`
  are writable only by the Cloud Function's service account (client has
  read-only access to its own `labRuns` where `memberId == request.auth.uid`,
  no client write access to `apiUsage` at all — the daily cap is meaningless
  if the client can edit its own usage counter).
- [ ] **Step 2: Implement `site/js/auth.js`**: in local mode, `signIn()`
  creates/reuses a fixed local member record (`{uid: 'local-member', name:
  'Local Member'}`) via `store.js`; in Firebase mode, `signIn()` uses
  `signInWithPopup` with `GoogleAuthProvider`. `onAuthChange` wraps
  `onAuthStateChanged` in Firebase mode, or in local mode calls back
  immediately with the local member (no event system needed — there's only
  one possible member).
- [ ] **Step 3: Wire the header button** in `index.html`/`app.js`: a
  "Continue" (local mode) or "Continue with Google" (Firebase mode) button
  that calls `signIn()`.
- [ ] **Step 4: Manual verification**

  Run: `cd site && python -m http.server 8080`, open the page, click the
  sign-in button.
  Expected: in local mode (no `FIREBASE` config yet), a local member is
  created and the button changes to show their name.

- [ ] **Step 5: Commit**

  ```bash
  git add site/js/auth.js site/index.html firestore.rules
  git commit -m "feat: Google sign-in and local-mode auth fallback"
  ```

---

### Task 4: Week 1 content and roadmap view

**Files:**
- Create: `site/js/data.js`
- Create: `site/js/roadmap.js`
- Create: `site/js/roadmap.test.mjs`

**Interfaces:**
- Consumes: nothing (pure data + render function).
- Produces: `WEEK1` object (shape below) from `data.js`; `renderRoadmap(mountEl: HTMLElement, weeks: object[]): void` from `roadmap.js`.

- [ ] **Step 1: Write `site/js/data.js`** exporting `WEEK1`, transcribed from
  the syllabus doc's Week 1 section:

  ```js
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
  ```

- [ ] **Step 2: Write the failing test** in `site/js/roadmap.test.mjs`
  (use a minimal DOM stand-in — a plain object with a `innerHTML` string
  property is enough, no jsdom dependency needed for this check):

  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { renderRoadmap } from './roadmap.js';
  import { WEEKS } from './data.js';

  test('renders one entry per week with its title', () => {
    const el = { innerHTML: '' };
    renderRoadmap(el, WEEKS);
    assert.match(el.innerHTML, /Foundations of LLMs/);
  });
  ```

- [ ] **Step 3: Run test to verify it fails**

  Run: `node --test site/js/roadmap.test.mjs`
  Expected: FAIL (`roadmap.js` doesn't exist)

- [ ] **Step 4: Implement `renderRoadmap`** in `site/js/roadmap.js`: sets
  `mountEl.innerHTML` to one `<section>` per week showing title, objectives,
  the lab prompt, and the milestone text.

- [ ] **Step 5: Run test to verify it passes**

  Run: `node --test site/js/roadmap.test.mjs`
  Expected: PASS

- [ ] **Step 6: Commit**

  ```bash
  git add site/js/data.js site/js/roadmap.js site/js/roadmap.test.mjs
  git commit -m "feat: Week 1 content and roadmap view"
  ```

---

### Task 5: `gradeLab` Cloud Function

**Files:**
- Create: `functions/index.js`
- Create: `functions/gemini.js`
- Create: `functions/rubric-week1.json`
- Create: `functions/test/gradeLab.test.js`
- Create: `functions/package.json`

**Interfaces:**
- Consumes: nothing from the client codebase (separate Node project).
- Produces: the deployed callable `gradeLab({ week: number, labId: string,
  promptText: string }, context)` → `{ passed: boolean, score: number,
  feedback: string }`. `context.auth.uid` is required and is the
  `memberId` — never taken from the payload, per the Review Focus item on
  spoofed `memberId`.

- [ ] **Step 1: Write `functions/package.json`** with `firebase-functions`,
  `firebase-admin`, and a `test` script: `"test": "node --test test/"`.

- [ ] **Step 2: Write `functions/rubric-week1.json`**: an array of test
  cases for lab `w1-json-lab`, each `{ question: string, mustMatchSchema:
  true }` — 3 sample questions is enough for Week 1.

- [ ] **Step 3: Write `functions/gemini.js`** exporting `callGemini(systemPrompt: string, userMessage: string): Promise<{text: string, tokensUsed: number}>` — a thin wrapper around the Gemini API's `generateContent`
  call, reading the API key from `process.env.GEMINI_API_KEY` (Cloud
  Functions config, never hardcoded, never sent to the client).

- [ ] **Step 4: Write the failing tests** in `functions/test/gradeLab.test.js`
  (mock `gemini.js`'s `callGemini` with `node:test`'s `t.mock.method`):

  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import * as gemini from '../gemini.js';
  import { evaluateSubmission } from '../index.js';

  test('rejects empty promptText before calling Gemini', async () => {
    const spy = test.mock.method(gemini, 'callGemini');
    await assert.rejects(() => evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: '' }), /promptText/);
    assert.equal(spy.mock.calls.length, 0);
  });

  test('passes when every test case returns valid matching JSON', async () => {
    test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));
    const result = await evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: 'a system prompt' });
    assert.equal(result.passed, true);
  });

  test('fails when output does not match the schema', async () => {
    test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 10 }));
    const result = await evaluateSubmission({ week: 1, labId: 'w1-json-lab', promptText: 'a system prompt' });
    assert.equal(result.passed, false);
  });
  ```

- [ ] **Step 5: Run tests to verify they fail**

  Run: `cd functions && node --test test/`
  Expected: FAIL (`evaluateSubmission` not defined)

- [ ] **Step 6: Implement `evaluateSubmission({week, labId, promptText}): Promise<{passed, score, feedback, tokensUsed}>`** in `functions/index.js`:
  throws if `promptText` is empty/missing (before any `callGemini` call);
  loads `rubric-week1.json`, calls `callGemini(promptText, testCase.question)`
  per test case, checks the response parses as JSON matching the schema in
  the design doc's Week 1 lab, sums `tokensUsed`, and returns `passed: true`
  only if every test case's output matches.

- [ ] **Step 7: Run tests to verify they pass**

  Run: `cd functions && node --test test/`
  Expected: PASS

- [ ] **Step 8: Implement the exported `gradeLab` callable** in
  `functions/index.js`, wrapping `evaluateSubmission`: requires
  `context.auth`, reads `apiUsage/{context.auth.uid}` from Firestore, rejects
  with a clear `functions.https.HttpsError('resource-exhausted', ...)` if
  today's token usage is already at/over the cap (constraint: fails closed,
  no silent retry), otherwise calls `evaluateSubmission`, writes the result
  to `labRuns`, increments `apiUsage/{uid}.tokensToday` by the run's
  `tokensUsed`, and returns `{ passed, score, feedback }`. Wrap the
  `callGemini` call with retry/backoff (2 retries, exponential) for
  transient errors, per the Global Constraints concurrency rule.

- [ ] **Step 9: Commit**

  ```bash
  git add functions
  git commit -m "feat: gradeLab Cloud Function with Week 1 rubric"
  ```

---

### Task 6: Client lab UI wired to grading

**Files:**
- Create: `site/js/grading-client.js`
- Modify: `site/js/roadmap.js` (render a submit form + result area for the lab)
- Modify: `site/js/app.js` (boot sequence: auth → roadmap → wire grading)

**Interfaces:**
- Consumes: `onAuthChange` (Task 3), `recordLabRun` (Task 2 — client-side
  mirror of the result for the member's own history view, not the
  source of truth), the deployed `gradeLab` callable (Task 5).
- Produces: `submitLab({week: number, labId: string, promptText: string}): Promise<{passed, score, feedback}>` from `grading-client.js`, calling
  `httpsCallable(functions, 'gradeLab')` in Firebase mode.

- [ ] **Step 1: Implement `submitLab`** in `site/js/grading-client.js`:
  in local mode (no `FIREBASE` config / not signed in with Firebase), return
  a rejected promise with a message explaining grading needs the live
  function and isn't available locally — per the Review Focus item on local
  mode never faking a result. In Firebase mode, call the callable and return
  its data.

- [ ] **Step 2: Wire the Week 1 lab form** in `roadmap.js`: a `<textarea>`
  for the prompt, a submit button that calls `submitLab`, disables itself
  while pending, and renders `passed`/`feedback` on return, or the error
  message (cap reached, network error, local-mode message) if it rejects.

- [ ] **Step 3: Manual end-to-end verification** (requires a deployed
  function and a real `FIREBASE`/`GEMINI_API_KEY` config — do this after
  deploying to a real Firebase project):

  1. Sign in with Google.
  2. Submit a correct system prompt for the Week 1 lab.
  3. Confirm the UI shows `passed: true` and a `labRuns` document appears in
     Firestore with the right `memberId`.
  4. Submit again until the configured daily cap is hit; confirm the UI
     shows the cap-reached message, not a crash or a fake pass.

- [ ] **Step 4: Commit**

  ```bash
  git add site/js/grading-client.js site/js/roadmap.js site/js/app.js
  git commit -m "feat: wire Week 1 lab UI to the grading function"
  ```

---

## Self-Review Notes

- **Spec coverage:** this plan covers the design doc's grading-proxy
  mechanic, per-member cap enforcement, local-vs-Firebase store duality, and
  Week 1 content end to end. It deliberately does not cover registration's
  full field set, XP/badges/leaderboard, journal, career tracks, admin
  dashboard, certificates, portfolio, or peer review — those are InfraTrack-
  pattern reuse or additive features or multi-week content that belong to
  follow-up plans once this slice proves the novel mechanic works.
- **Review Focus coverage:** all five items have an owning task and test
  (cap exceeded → Task 5 Step 8 + Task 6 Step 3; Gemini error → Task 5's
  retry/backoff + Task 6's error rendering; empty prompt → Task 5 Step 4's
  first test; spoofed memberId → Task 5's `context.auth`-only design; local
  mode → Task 6 Step 1's explicit rejection).
