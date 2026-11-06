# Multi-View Router & Member Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the site more than one view. Add a hash-based router and a
member dashboard that shows progress, XP, and a daily streak — all derived
from data already in Firestore, no new writes.

**Architecture:** A single `ROUTES` object maps a route key to a render
function; a `hashchange` listener re-renders `#app` into whichever view the
current `location.hash` names, falling back to `dashboard`. Stats (XP,
streak, progress %) are never stored — they're computed fresh from the
member's `labRuns` on every dashboard visit, the same "derive, don't store"
approach InfraTrack uses, which avoids a whole class of stale-XP bugs.

**Tech Stack:** Vanilla JS (no build step, no router library), existing
Firebase Auth + Firestore, no changes to the Cloudflare Worker.

**Spec:** `docs/superpowers/specs/2026-11-05-platform-design.md` — see
"Reused as-is from InfraTrack" (names XP/badges/streak as in-scope) and
"Decisions made" (confirms vanilla JS, no new backend for this feature).

## Global Constraints

- No build step — plain ES modules, same as the rest of `site/`.
- Zero new infrastructure cost: stats are computed client-side from the
  `labRuns` reads `firestore.rules` already allows
  (`allow read: if ... resource.data.memberId == request.auth.uid`). No
  Worker changes in this plan.
- No code copied from `usmanmasud/gdgoc-infrastrucure` (it has no license).
  Build the same *shape* (hash router, derived stats) in our own words.
- Lab XP value is 10 per passed lab, matching the spec's "lab pass-by-grading
  keeps InfraTrack's lab XP value."
- 8-week semester: `totalLabs` for progress % comes from counting weeks in
  `WEEKS` that have a `lab` field (currently 7 of 8), not a hardcoded number.

## Review Focus

- **Switching routes before an in-flight async render resolves** (click
  Dashboard, then immediately click Roadmap before `getLabRuns` returns):
  the stale dashboard render must not land after the roadmap is already
  showing. Not covered by a unit test (it's a DOM-timing race); the final
  reviewer should trace `renderDashboardRoute`'s await against a second
  route change.
- **Deep-linking / browser back-forward**: typing `#roadmap` directly in the
  address bar, or using the browser's back button, must render the right
  view without a full page reload. `resolveRoute` is unit tested, but the
  `hashchange`-driven real-browser path isn't — worth a manual check.
- **A member with zero `labRuns`** (first sign-in): dashboard must show
  0/7, 0 XP, 0 streak, not `NaN` or a crash. Covered by a `computeStats`
  test in Task 3.
  **Retried labs**: a member who failed a lab once and passed it later must
  be counted once in XP/progress, not zero (stuck on the failure) or twice
  (double-counted). Covered by a `computeStats` test in Task 3.
- **Unknown/garbage hash** (`#nonsense`, or no hash at all on first load):
  must fall back to `dashboard`, not render nothing. Covered by a
  `resolveRoute` test in Task 2.

---

### Task 1: Extract `escapeHtml` into a shared util

**Files:**
- Create: `site/js/util.js`
- Modify: `site/js/roadmap.js` (import instead of its own private copy)
- Test: `site/js/util.test.mjs`

**Interfaces:**
- Produces: `escapeHtml(str: string): string` — escapes `& < > " '`. Task 5
  (dashboard view) also imports this.

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from './util.js';

test('escapeHtml escapes the five HTML-sensitive characters', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test site/js/util.test.mjs`
Expected: FAIL — `util.js` does not exist / `escapeHtml` is not exported.

- [ ] **Step 3: Implement `escapeHtml` in `site/js/util.js`**

Move the existing private `escapeHtml` function out of `site/js/roadmap.js`
verbatim into this new file as a named export; nothing about its behavior
changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test site/js/util.test.mjs`
Expected: PASS

- [ ] **Step 5: Update `roadmap.js` to import `escapeHtml` from `./util.js`,
  delete its own copy, and confirm its existing suite still passes**

Run: `node --test site/js/roadmap.test.mjs`
Expected: PASS (unchanged — this step only changes where the function
lives, not what it does)

- [ ] **Step 6: Commit**

```bash
git add site/js/util.js site/js/util.test.mjs site/js/roadmap.js
git commit -m "refactor: extract escapeHtml into a shared util"
```

---

### Task 2: Hash router

**Files:**
- Create: `site/js/router.js`
- Test: `site/js/router.test.mjs`

**Interfaces:**
- Produces: `resolveRoute(routes: Record<string, Function>, hash: string,
  fallback: string): string` — pure, returns a key of `routes`.
- Produces: `initRouter(mountEl: Element, routes: Record<string, (mountEl:
  Element) => void | Promise<void>>, opts: { fallback: string, navEl?:
  Element }): { refresh: () => void }` — DOM-wiring: listens for
  `hashchange`, calls the resolved route's function with `mountEl` on every
  change and once immediately, and (if `navEl` is given) toggles an
  `is-active` class on each `navEl` child whose `data-route` matches the
  current key. Returns `{ refresh }` so a caller can force a re-render
  (e.g. after state that isn't reflected in the hash changes). Task 6
  consumes both.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRoute } from './router.js';

test('resolveRoute returns the key matching the hash', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '#roadmap', 'dashboard'), 'roadmap');
});

test('resolveRoute falls back on an empty hash', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '', 'dashboard'), 'dashboard');
});

test('resolveRoute falls back on a hash matching no route', () => {
  assert.equal(resolveRoute({ dashboard() {}, roadmap() {} }, '#nonsense', 'dashboard'), 'dashboard');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/router.test.mjs`
Expected: FAIL — `router.js` does not exist.

- [ ] **Step 3: Implement `resolveRoute` and `initRouter` in `site/js/router.js`**

`resolveRoute` strips a leading `#` from `hash` and returns it if
`Object.hasOwn(routes, key)`, else `fallback` (reuse the same inherited-
property guard used in `worker/src/grading.js` — a hash of `#constructor`
must not resolve to `Object.prototype.constructor`). `initRouter`'s
`render` is `async` and `await`s `routes[key](mountEl)` (a route function
may be sync or async — some will `await` a Firestore read before setting
`mountEl.innerHTML`); it wires `window.addEventListener('hashchange',
render)`, calls `render()` once immediately, and exposes `render` as
`refresh`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/router.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add site/js/router.js site/js/router.test.mjs
git commit -m "feat: add hash-based router"
```

---

### Task 3: Derived stats (`computeStats`)

**Files:**
- Create: `site/js/stats.js`
- Test: `site/js/stats.test.mjs`

**Interfaces:**
- Consumes: a `labRuns` array of `{ labId, passed, timestamp }` (the shape
  `worker/src/index.js`'s `handleGradeLab` already writes — `timestamp` is
  an ISO 8601 string).
- Produces: `computeStats(labRuns: Array, opts: { totalLabs: number, now?:
  Date }): { labsPassed: number, totalLabs: number, progressPct: number,
  xp: number, streak: number }`. Task 5 and Task 6 consume this shape.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats } from './stats.js';

test('a member with no lab runs gets all-zero stats, no NaN', () => {
  const stats = computeStats([], { totalLabs: 7 });
  assert.deepEqual(stats, { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 });
});

test('counts a lab once even after a failed attempt then a pass', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: false, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T11:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.labsPassed, 1);
  assert.equal(stats.xp, 10);
});

test('does not double-count XP for two passing runs of the same lab', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' },
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-02T10:00:00.000Z' },
  ];
  const stats = computeStats(labRuns, { totalLabs: 7 });
  assert.equal(stats.xp, 10);
});

test('progressPct is the rounded percentage of distinct passed labs over totalLabs', () => {
  const labRuns = [
    { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T10:00:00.000Z' },
  ];
  assert.equal(computeStats(labRuns, { totalLabs: 4 }).progressPct, 25);
});

test('streak counts consecutive active days ending today', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');
  const labRuns = [
    { labId: 'a', passed: true, timestamp: '2026-11-03T10:00:00.000Z' },
    { labId: 'b', passed: true, timestamp: '2026-11-04T10:00:00.000Z' },
    { labId: 'c', passed: true, timestamp: '2026-11-05T10:00:00.000Z' },
  ];
  assert.equal(computeStats(labRuns, { totalLabs: 7, now }).streak, 3);
});

test('streak is 0 when the most recent activity was not today', () => {
  const now = new Date('2026-11-05T12:00:00.000Z');
  const labRuns = [{ labId: 'a', passed: true, timestamp: '2026-11-03T10:00:00.000Z' }];
  assert.equal(computeStats(labRuns, { totalLabs: 7, now }).streak, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/stats.test.mjs`
Expected: FAIL — `stats.js` does not exist.

- [ ] **Step 3: Implement `computeStats` in `site/js/stats.js`**

Build a `Set` of `labId`s where at least one run has `passed === true` for
`labsPassed`/`xp` (10 × set size). Build a `Set` of calendar-day strings
(`timestamp.slice(0, 10)`, any run counts as "active" regardless of
`passed`) for the streak; walk backward one day at a time from `now`
(default `new Date()`) while the day is in the set, counting each hit.
`progressPct` is `Math.round(labsPassed / totalLabs * 100)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/stats.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add site/js/stats.js site/js/stats.test.mjs
git commit -m "feat: add derived stats (XP, streak, progress)"
```

---

### Task 4: `getLabRuns` in the store

**Files:**
- Modify: `site/js/store.js`
- Modify: `site/js/store.test.mjs`

**Interfaces:**
- Consumes: the existing local-mode `memoryStore.labRuns` array and
  Firebase-mode `labRuns` collection (both already written by
  `recordLabRun`/the Worker).
- Produces: `getLabRuns(uid: string, opts?: { firebaseConfig }):
  Promise<Array<{labId, passed, timestamp, ...}>>`. Task 6 consumes this.

- [ ] **Step 1: Write the failing test**

```js
test('getLabRuns returns only the given member\'s runs, in local mode', async () => {
  await recordLabRun('member-a', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  await recordLabRun('member-b', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  const runs = await getLabRuns('member-a', { firebaseConfig: null });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].memberId, 'member-a');
});
```

(Add the `getLabRuns` import alongside the existing ones at the top of
`site/js/store.test.mjs`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test site/js/store.test.mjs`
Expected: FAIL — `getLabRuns` is not exported.

- [ ] **Step 3: Implement `getLabRuns` in `site/js/store.js`**

Local mode: filter `memoryStore.labRuns` by `memberId === uid`. Firebase
mode: `firestore.query(firestore.collection(db, 'labRuns'),
firestore.where('memberId', '==', uid))`, then `firestore.getDocs(q)`,
mapped to `.data()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test site/js/store.test.mjs`
Expected: PASS — all tests in the file, not just the new one.

- [ ] **Step 5: Commit**

```bash
git add site/js/store.js site/js/store.test.mjs
git commit -m "feat: add getLabRuns for reading a member's lab history"
```

---

### Task 5: Dashboard view

**Files:**
- Create: `site/js/dashboard.js`
- Test: `site/js/dashboard.test.mjs`

**Interfaces:**
- Consumes: `escapeHtml` from `./util.js` (Task 1); the `stats` shape from
  `computeStats` (Task 3).
- Produces: `renderDashboard(mountEl: Element, { member: {name}, stats
  }): void` — sets `mountEl.innerHTML`. Task 6 consumes this.

- [ ] **Step 1: Write the failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderDashboard } from './dashboard.js';

test('renders the member name and all four stats', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: 'Ada' },
    stats: { labsPassed: 2, totalLabs: 7, progressPct: 29, xp: 20, streak: 3 },
  });
  assert.match(el.innerHTML, /Ada/);
  assert.match(el.innerHTML, /2\/7/);
  assert.match(el.innerHTML, /29/);
  assert.match(el.innerHTML, /20/);
  assert.match(el.innerHTML, /3/);
});

test('escapes a member name containing HTML', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: '<script>' },
    stats: { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 },
  });
  assert.doesNotMatch(el.innerHTML, /<script>/);
});

test('falls back to a generic greeting when the member has no name', () => {
  const el = { innerHTML: '' };
  renderDashboard(el, {
    member: { name: null },
    stats: { labsPassed: 0, totalLabs: 7, progressPct: 0, xp: 0, streak: 0 },
  });
  assert.match(el.innerHTML, /Welcome back/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/js/dashboard.test.mjs`
Expected: FAIL — `dashboard.js` does not exist.

- [ ] **Step 3: Implement `renderDashboard` in `site/js/dashboard.js`**

A heading greeting the member by name (or "there" if `name` is falsy), a
`.stat-grid` of three `.stat-card`s (labs passed as `X/Y`, XP, streak), and
a `<a class="btn btn--primary" href="#roadmap">` link to continue. All
user-controlled text through `escapeHtml`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/js/dashboard.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add site/js/dashboard.js site/js/dashboard.test.mjs
git commit -m "feat: add member dashboard view"
```

---

### Task 6: Wire the router and dashboard into the app shell

**Files:**
- Modify: `site/js/app.js`
- Modify: `site/index.html` (add a nav bar)
- Modify: `site/css/styles.css` (nav + dashboard styles)

**Interfaces:**
- Consumes: `initRouter` (Task 2), `computeStats` (Task 3), `getLabRuns`
  (Task 4), `renderDashboard` (Task 5), plus the existing `renderRoadmap`/
  `wireLabForms` (`roadmap.js`) and `onAuthChange`/`signIn`/`warmUp`
  (`auth.js`).

- [ ] **Step 1: Add the nav bar markup to `site/index.html`**

Add, between the `<header>` and `<main id="app">`:

```html
<nav id="main-nav" class="site-nav" hidden>
  <a href="#dashboard" data-route="dashboard">Dashboard</a>
  <a href="#roadmap" data-route="roadmap">Roadmap</a>
</nav>
```

- [ ] **Step 2: Rewrite `site/js/app.js`'s wiring**

Compute `const TOTAL_LABS = WEEKS.filter((w) => w.lab).length;` at module
scope. Keep a module-level `let currentMember = null;` and a `let
routerStarted = false;` guard. Inside `onAuthChange`'s callback, after the
existing `if (!member) return;`, set `currentMember = member`, unhide
`navEl`, and — only the first time a non-null member arrives
(`routerStarted` guard, flipped to `true` right before calling) — call
`initRouter(appEl, { dashboard: renderDashboardRoute, roadmap: renderRoadmapRoute }, { fallback: 'dashboard', navEl })`.
The guard exists because Firebase's `onAuthStateChanged` can re-fire for
the same signed-in user (e.g. on token refresh); without it, each firing
would attach another `hashchange` listener.

Define two small route functions above `onAuthChange`:
`renderDashboardRoute(mountEl)` — `await`s `getLabRuns(currentMember.uid)`,
then calls `renderDashboard(mountEl, { member: currentMember, stats:
computeStats(labRuns, { totalLabs: TOTAL_LABS }) })`.
`renderRoadmapRoute(mountEl)` — calls the existing `renderRoadmap(mountEl,
WEEKS)` then `wireLabForms(mountEl, currentMember.uid)`, exactly as the
current inline code does.

- [ ] **Step 3: Add nav and dashboard styles to `site/css/styles.css`**

A `.site-nav` row (flex, gap, below the header) with `.site-nav a` links
and a `.site-nav a.is-active` state using `--color-blue`; a `.dashboard`
`.stat-grid` (flex or grid, 3 columns) of `.stat-card`s styled consistently
with the existing `.week-card` pattern already in the file (reuse
`--color-surface`/`--color-border`, don't invent a second card style).

- [ ] **Step 4: Run the full site test suite**

Run: `node --test site/js/*.test.mjs`
Expected: PASS, all files (`util`, `router`, `stats`, `store`, `dashboard`,
`roadmap` tests).

- [ ] **Step 5: Manual verification in a browser (local mode)**

Serve `site/` locally, open it, sign in. Confirm: the dashboard route
renders first and shows `0/7`, `0 XP`, `0` streak with no console errors;
clicking "Roadmap" in the nav shows the week cards and the nav's active
link updates; submitting a lab from the roadmap and then clicking
"Dashboard" shows updated numbers (local mode's `recordLabRun` writes
synchronously to `memoryStore`, so this doesn't require the live grading
Worker — a fake `submitLab` result is enough); typing `#roadmap` directly
into the address bar and reloading lands on the roadmap, not the empty
dashboard-only state.

Expected: all of the above hold; no uncaught errors in the console.

- [ ] **Step 6: Commit**

```bash
git add site/js/app.js site/index.html site/css/styles.css
git commit -m "feat: wire hash router and dashboard into the app shell"
```
