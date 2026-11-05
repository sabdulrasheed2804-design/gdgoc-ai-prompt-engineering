# Prompt Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each member a public, shareable page showing their best-scoring
prompt per week, opt-in per entry — the "prompt portfolio" the design doc
calls for as InfraTrack's certificate-equivalent for this cluster.

**Architecture:** A new `portfolio/{memberId}/entries/{week}` Firestore
collection, populated by the grading Worker (never the client) whenever a
submission passes with a higher score than what's stored. Each entry starts
`published: false`; only the member can flip it to `true` (a single-field
write the client makes directly, allowed by `firestore.rules`). A public
page at `#public/<uid>` reads only published entries and needs no sign-in,
so it's checked before the app's normal sign-in-gated bootstrap, not added
as a router key.

**Tech Stack:** Same as the rest of the repo — vanilla JS, Firestore REST
API from the Worker (service-account JWT, bypasses security rules the same
way `labRuns`/`apiUsage` writes already do), Firestore client SDK from the
browser (subject to security rules).

**Spec:** `docs/superpowers/specs/2026-11-05-platform-design.md` — see
"Prompt portfolio", "Data model additions over InfraTrack", and "Portfolio
publication is opt-in, not automatic."

## Global Constraints

- No build step, vanilla JS, same as the rest of `site/`.
- No new infrastructure: reuses the existing Worker and Firestore project;
  no new Cloudflare resources.
- The portfolio entry's content fields (`promptText`, `outputSnippet`,
  `rubricScore`) are written only by the Worker's service account, per the
  spec's `apiUsage`/`labRuns` pattern — the client may only toggle
  `published`.
- Publication is opt-in: a new entry is never publicly readable until the
  member explicitly publishes it (spec: "Portfolio publication is opt-in,
  not automatic").

## Review Focus

- **A member who never passes a lab for some week** has no portfolio entry
  for that week at all (not an entry with empty fields). The management
  view and the public page must both handle a shorter entry list than
  `WEEKS.filter(w => w.lab).length`, not assume one entry per lab week.
- **A later, lower-scoring pass** must not replace an already-stored
  higher-scoring entry, and must not reset `published` back to `false` on
  the entry that's already live. Covered by a Worker test in Task 2.
- **The public page for a uid with zero published entries** (either no
  passes yet, or none opted in) must render a clean empty state, not an
  error or a blank page — this is the page's most likely cold-start state
  for every member on day one.
- **The `published` toggle write must be rejected by `firestore.rules`**
  for any field other than `published` (e.g. a crafted client write trying
  to raise its own `rubricScore`) — not exercised by a unit test (rules
  aren't unit-testable in this project without the Firestore emulator);
  flag for the reviewer to trace by hand against `firestore.rules`' exact
  wording.
- **Visiting `#public/<uid>` while already signed in as a different
  member** must still show the requested `uid`'s portfolio, not redirect
  to the signed-in member's own dashboard — the public-page check must run
  before, and independently of, the signed-in app's own routing.

---

### Task 1: Firestore rules for the portfolio collection

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- Produces: read/write access rules Task 3 and Task 5's client code rely
  on (public read of published entries; owner-only read of all their own
  entries; owner-only write, restricted to the `published` field).

- [ ] **Step 1: Add the `portfolio` match block**

```
match /portfolio/{memberId}/entries/{week} {
  allow read: if resource.data.published == true
    || (request.auth != null && request.auth.uid == memberId);
  allow update: if request.auth != null && request.auth.uid == memberId
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['published']);
  allow create: if false; // entries are created by the grading Worker's service account only
}
```

- [ ] **Step 2: Deploy the updated rules**

This is the one step in this plan that touches shared infrastructure, not
just this worktree — publish `firestore.rules`' new content via the
Firebase console's Firestore Rules tab (same manual step used for the
original ruleset; there's no CLI deploy wired up in this repo). Record in
the ledger once done; this plan's later tasks assume the rule is live, but
Task 2's Worker changes don't depend on it (service-account writes bypass
rules), so Task 2 can proceed even before this step is manually completed.

Expected: the Firebase console's Rules tab shows the new `portfolio` block
after publishing, with no syntax errors reported by its validator.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore rules for the portfolio collection"
```

---

### Task 2: Worker writes a portfolio entry on a passing, higher-scoring submission

**Files:**
- Modify: `worker/src/grading.js` (`evaluateSubmission` returns a sample
  output)
- Modify: `worker/src/index.js` (`handleGradeLab` upserts the entry)
- Modify: `worker/test/grading.test.js`
- Modify: `worker/test/handleGradeLab.test.js` (also fixes a latent fixture
  bug — see Step 1)

**Interfaces:**
- Consumes: `firestore.transactionalUpdate(path, computeNext)` (existing,
  `worker/src/firestore.js` — unchanged).
- Produces: `evaluateSubmission`'s return value gains a `sampleOutput:
  string` field (the first test case's raw model response text) alongside
  the existing `passed`/`score`/`feedback`/`tokensUsed`.

- [ ] **Step 1: Fix `makeFakeFirestore`'s path-keying bug in
  `handleGradeLab.test.js`, before adding new behavior**

The existing fake's `transactionalUpdate` extracts a uid with
`path.split('/')[1]` and stores every caller's result in one shared
`store.usage` map keyed only by that uid — it doesn't distinguish which
*collection* a path belongs to. Once `handleGradeLab` makes a second
`transactionalUpdate` call (to `portfolio/{uid}/entries/{week}`, which
also has the uid in position `[1]`), it would silently collide with the
`apiUsage/{uid}` call already covered by `accumulates tokensToday across
calls`. Fix the fixture first, as its own commit, so Step 2's tests land
on a correct fixture:

```js
function makeFakeFirestore({ usage = {} } = {}) {
  const store = { docs: {}, labRuns: [] };
  for (const [uid, value] of Object.entries(usage)) store.docs[`apiUsage/${uid}`] = value;
  return {
    store,
    async getDocument(path) {
      return store.docs[path] ?? null;
    },
    async createDocument(collection, data) {
      if (collection === 'labRuns') store.labRuns.push(data);
    },
    async transactionalUpdate(path, computeNext) {
      const next = computeNext(store.docs[path] ?? null);
      store.docs[path] = next;
      return next;
    },
  };
}
```

Update the three existing tests' assertions from `firestore.store.usage.u1`/
`u2`/`u3` to `firestore.store.docs['apiUsage/u1']` etc.

Run: `node --test worker/test/handleGradeLab.test.js`
Expected: PASS — same 3 tests, same behavior, just reading the fixture's
new shape. This step changes no production code, only the test fixture;
there is no RED step here, since nothing about `handleGradeLab`'s behavior
is new yet. (The TDD cycle resumes at Step 2.)

- [ ] **Step 2: Write the failing `evaluateSubmission` test**

```js
test('evaluateSubmission returns a sample output alongside the score', async () => {
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));
  const result = await evaluateSubmission({ labId: 'w1-json-lab', promptText: 'a system prompt' }, FAKE_ENV);
  assert.equal(result.sampleOutput, '{"answer":"x","confidence":"low"}');
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test worker/test/grading.test.js`
Expected: FAIL — `result.sampleOutput` is `undefined`.

- [ ] **Step 4: Add `sampleOutput` to `evaluateSubmission`'s return value**

Capture the `text` from the *first* test case's Gemini call (the loop
already runs each test case in order; keep the first iteration's `text` in
a variable alongside the existing `matchCount`/`tokensUsed` accumulation)
and include it as `sampleOutput` in the returned object.

- [ ] **Step 5: Run it to verify it passes, plus the full grading suite**

Run: `node --test worker/test/grading.test.js`
Expected: PASS, all tests (the new one plus the existing ones — adding a
field doesn't change any existing assertion's target).

- [ ] **Step 6: Write the failing `handleGradeLab` portfolio tests**

```js
test('writes a portfolio entry on a first passing submission', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: '{"answer":"x","confidence":"low"}', tokensUsed: 10 }));

  await handleGradeLab({ uid: 'u4', week: 1, labId: 'w1-json-lab', promptText: 'first try' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u4/entries/1'];
  assert.equal(entry.promptText, 'first try');
  assert.equal(entry.published, false);
  assert.equal(entry.rubricScore, 1);
});

test('does not overwrite a higher-scoring entry with a later lower-scoring pass', async () => {
  const firestore = makeFakeFirestore();
  firestore.store.docs['portfolio/u5/entries/1'] = { promptText: 'best', outputSnippet: 'x', rubricScore: 1, published: true };
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 5 }));

  await handleGradeLab({ uid: 'u5', week: 1, labId: 'w1-json-lab', promptText: 'worse try' }, FAKE_ENV, firestore);

  const entry = firestore.store.docs['portfolio/u5/entries/1'];
  assert.equal(entry.promptText, 'best');
  assert.equal(entry.published, true);
});

test('does not write a portfolio entry for a failing submission', async () => {
  const firestore = makeFakeFirestore();
  test.mock.method(gemini, 'callGemini', async () => ({ text: 'not json', tokensUsed: 5 }));

  await handleGradeLab({ uid: 'u6', week: 1, labId: 'w1-json-lab', promptText: 'bad' }, FAKE_ENV, firestore);

  assert.equal(firestore.store.docs['portfolio/u6/entries/1'], undefined);
});
```

- [ ] **Step 7: Run them to verify they fail**

Run: `node --test worker/test/handleGradeLab.test.js`
Expected: FAIL — no portfolio entries are written yet (`entry` is
`undefined` in the first two tests).

- [ ] **Step 8: Implement the upsert in `handleGradeLab`**

After the existing `labRuns` write, when `result.passed` is true:

```js
const portfolioPath = `portfolio/${uid}/entries/${week}`;
await firestore.transactionalUpdate(portfolioPath, (current) => {
  if (current && current.rubricScore >= result.score) return current;
  return {
    promptText,
    outputSnippet: result.sampleOutput,
    rubricScore: result.score,
    published: current?.published ?? false,
  };
});
```

- [ ] **Step 9: Run tests to verify they pass, plus the full worker suite**

Run: `node --test worker/test/*.test.js`
Expected: PASS, all tests.

- [ ] **Step 10: Commit**

```bash
git add worker/src/grading.js worker/src/index.js worker/test/grading.test.js worker/test/handleGradeLab.test.js
git commit -m "feat: upsert a portfolio entry on a passing, higher-scoring lab submission"
```

- [ ] **Step 11: Build and redeploy the Worker**

This plan changes `worker/src/`, so the live Worker needs rebuilding and
redeploying the same way prior plans' Worker changes were (esbuild bundle,
PUT to the Cloudflare Workers API) — without this step, the deployed
Worker keeps running the old code and never writes portfolio entries, the
same gap a prior plan's final review caught for the rubric additions.

Run: `cd worker && npm run build && grep -c portfolio dist/index.js`
Expected: a non-zero count, confirming the new code is in the bundle
before deploying.

---

### Task 3: Store functions for reading and publishing portfolio entries

**Files:**
- Modify: `site/js/store.js`
- Modify: `site/js/store.test.mjs`

**Interfaces:**
- Produces: `getPortfolioEntries(uid, opts?): Promise<Array<{week,
  promptText, outputSnippet, rubricScore, published}>>` (owner's own
  entries, any publish state — Task 4's manager view consumes this).
  `setPortfolioPublished(uid, week, published, opts?): Promise<void>`
  (Task 4 consumes this). `getPublicPortfolio(uid, opts?):
  Promise<Array<{week, promptText, outputSnippet, rubricScore}>>` (only
  `published: true` entries, no `opts.firebaseConfig` required to be an
  authed context — Task 5's public page consumes this).

Local mode needs its own in-memory shape for these three functions, same
pattern as `memoryStore.labRuns`: add `memoryStore.portfolio = {}` keyed
by `` `${uid}/${week}` ``.

- [ ] **Step 1: Write the failing tests**

```js
test('getPortfolioEntries returns only the given member\'s entries, in local mode', async () => {
  await setPortfolioPublished('member-x', 1, false, { firebaseConfig: null });
  const entries = await getPortfolioEntries('member-x', { firebaseConfig: null });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].week, 1);
});

test('getPublicPortfolio only returns published entries', async () => {
  await setPortfolioPublished('member-y', 1, true, { firebaseConfig: null });
  await setPortfolioPublished('member-y', 2, false, { firebaseConfig: null });
  const publicEntries = await getPublicPortfolio('member-y', { firebaseConfig: null });
  assert.equal(publicEntries.length, 1);
  assert.equal(publicEntries[0].week, 1);
});
```

(In local mode, `setPortfolioPublished` on a week with no existing entry
creates a minimal placeholder entry — local mode has no Worker to seed
content, so these tests only exercise the publish-flag plumbing, not
real prompt content. Add these two tests and their imports to the existing
`site/js/store.test.mjs`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/store.test.mjs`
Expected: FAIL — the three functions aren't exported yet.

- [ ] **Step 3: Implement the three functions in `site/js/store.js`**

Local mode: `memoryStore.portfolio[`${uid}/${week}`]`, created with
`published: false` and empty content fields if `setPortfolioPublished` is
called before any entry exists. Firebase mode: `getPortfolioEntries` reads
the `portfolio/{uid}/entries` subcollection via
`firestore.getDocs(firestore.collection(db, 'portfolio', uid,
'entries'))`; `setPortfolioPublished` writes with
`firestore.setDoc(firestore.doc(db, 'portfolio', uid, 'entries',
String(week)), { published }, { merge: true })` (a merge write only
touches `published`, matching the rule's `affectedKeys().hasOnly(['published'])`
constraint — a non-merge `setDoc` would send the whole object and fail the
rule for the owner's own entries that already have content fields);
`getPublicPortfolio` reads the same subcollection with
`firestore.query(..., firestore.where('published', '==', true))`, usable
by an unauthenticated caller since the rule's first clause needs no
`request.auth`.

- [ ] **Step 4: Run tests to verify they pass, plus the full store suite**

Run: `node --test site/js/store.test.mjs`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add site/js/store.js site/js/store.test.mjs
git commit -m "feat: add store functions for portfolio entries"
```

---

### Task 4: Portfolio manager view (signed-in member's own entries)

**Files:**
- Create: `site/js/portfolio.js`
- Test: `site/js/portfolio.test.mjs`

**Interfaces:**
- Consumes: `escapeHtml` (`./util.js`); the entry shape from
  `getPortfolioEntries`/`getPublicPortfolio` (Task 3).
- Produces: `renderPortfolioManager(mountEl, entries: Array<{week,
  promptText, outputSnippet, rubricScore, published}>): void` — sets
  `mountEl.innerHTML`, one row per entry with a toggle control
  (`<button data-toggle-publish data-week="${week}">`) whose click handler
  is wired separately. `wirePortfolioToggles(mountEl, uid,
  onToggled?: () => void): void` — attaches click listeners to
  `[data-toggle-publish]` buttons that call `setPortfolioPublished`,
  mirroring the `renderRoadmap`/`wireLabForms` split already used
  elsewhere in this codebase. `renderPublicPortfolio(mountEl, entries:
  Array<{week, promptText, outputSnippet, rubricScore}>): void` — the
  read-only public view (Task 5 also uses this).

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPortfolioManager, renderPublicPortfolio } from './portfolio.js';

test('renderPortfolioManager shows each entry\'s week, score, and publish state', () => {
  const el = { innerHTML: '' };
  renderPortfolioManager(el, [
    { week: 1, promptText: 'p1', outputSnippet: 'o1', rubricScore: 1, published: true },
    { week: 2, promptText: 'p2', outputSnippet: 'o2', rubricScore: 0.5, published: false },
  ]);
  assert.match(el.innerHTML, /Week 1/);
  assert.match(el.innerHTML, /Published/);
  assert.match(el.innerHTML, /Week 2/);
  assert.match(el.innerHTML, /Unpublished/);
});

test('renderPortfolioManager shows an empty state with no entries', () => {
  const el = { innerHTML: '' };
  renderPortfolioManager(el, []);
  assert.match(el.innerHTML, /no passing lab/i);
});

test('renderPublicPortfolio escapes prompt text', () => {
  const el = { innerHTML: '' };
  renderPublicPortfolio(el, [{ week: 1, promptText: '<script>', outputSnippet: 'o', rubricScore: 1 }]);
  assert.doesNotMatch(el.innerHTML, /<script>/);
});

test('renderPublicPortfolio shows an empty state with no published entries', () => {
  const el = { innerHTML: '' };
  renderPublicPortfolio(el, []);
  assert.match(el.innerHTML, /hasn.t published/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/portfolio.test.mjs`
Expected: FAIL — `portfolio.js` does not exist.

- [ ] **Step 3: Implement `site/js/portfolio.js`**

`renderPortfolioManager`: a `.portfolio-list` of `.portfolio-row`s (week
number, truncated prompt/output, rubric score as a percentage, a
"Published"/"Unpublished" label, and a toggle button), or an empty-state
paragraph mentioning "no passing lab" when `entries` is empty.
`wirePortfolioToggles`: standard `querySelectorAll` + `addEventListener`
DOM wiring, calling `setPortfolioPublished(uid, week, !currentlyPublished)`
then `onToggled?.()` so the caller can re-render. `renderPublicPortfolio`:
similar list without toggle buttons, empty-state text mentioning the
member "hasn't published" anything yet when `entries` is empty. All
user-controlled text through `escapeHtml`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/portfolio.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add site/js/portfolio.js site/js/portfolio.test.mjs
git commit -m "feat: add portfolio manager and public portfolio views"
```

---

### Task 5: Wire the portfolio manager and public page into the app

**Files:**
- Modify: `site/js/app.js`
- Modify: `site/index.html` (nav link)
- Modify: `site/css/styles.css` (portfolio list styles)

**Interfaces:**
- Consumes: `getPortfolioEntries`/`getPublicPortfolio`/
  `setPortfolioPublished` (Task 3); `renderPortfolioManager`/
  `wirePortfolioToggles`/`renderPublicPortfolio` (Task 4); `initRouter`
  (existing, from the router/dashboard plan).

- [ ] **Step 1: Add a "Portfolio" nav link to `site/index.html`**

```html
<a href="#portfolio" data-route="portfolio">Portfolio</a>
```
(third link in `#main-nav`, after Dashboard and Roadmap).

- [ ] **Step 2: Handle the public page before the sign-in gate in `app.js`**

At the top of `app.js`, before `warmUp()`/`onAuthChange` run, check
`window.location.hash.startsWith('#public/')`. If so: extract the uid
(the hash segment after `#public/`), call `getPublicPortfolio(uid)`, call
`renderPublicPortfolio(appEl, entries)`, hide the header's sign-in button
and the nav entirely (this view is for outside visitors, not members —
`signInButton.hidden = true; navEl.hidden = true;` before returning), and
`return` out of the module's top level before any of the sign-in-gated
code runs (wrap the rest of the file's existing logic so this early return
is possible — e.g. an `if (!isPublicPortfolioRoute) { ...existing code... }`
guard, or an early-return inside an `async function main() { ... }`
invoked at the bottom, whichever keeps the diff smaller against the
current flat module-scope code).

- [ ] **Step 3: Add the `portfolio` route to the signed-in router**

```js
async function renderPortfolioRoute(mountEl, isStale) {
  const entries = await getPortfolioEntries(currentMember.uid);
  if (isStale()) return;
  renderPortfolioManager(mountEl, entries);
  wirePortfolioToggles(mountEl, currentMember.uid, () => router.refresh());
}
```
Add `portfolio: renderPortfolioRoute` to the `routes` object passed to
`initRouter`.

- [ ] **Step 4: Add portfolio list styles to `site/css/styles.css`**

A `.portfolio-list` of `.portfolio-row`s styled consistently with
`.week-card`/`.stat-card` (reuse `--color-surface`/`--color-border`,
don't invent a third card style); a small pill-style label for
"Published" (use `--color-green`) vs. "Unpublished" (use
`--color-text-muted`).

- [ ] **Step 5: Run the full site test suite**

Run: `node --test site/js/*.test.mjs`
Expected: PASS, all files.

- [ ] **Step 6: Manual verification in a browser**

Serve `site/` locally. Signed in: confirm the Portfolio nav link shows the
empty state for a member with no passing labs; after seeding a local-mode
portfolio entry (via the console, same approach used for the dashboard
plan's manual check), confirm it appears with a working publish toggle,
and that toggling it updates the label without a full page reload.
Separately, load `#public/<some-uid>` directly (a fresh navigation, not a
nav-link click) and confirm: the sign-in button and nav are both hidden,
only published entries for that uid show, and an unpublished entry for
that same uid (seeded in the same local-mode session) does not appear.

Expected: all of the above hold; no console errors.

- [ ] **Step 7: Commit**

```bash
git add site/js/app.js site/index.html site/css/styles.css
git commit -m "feat: wire portfolio manager and public page into the app"
```
