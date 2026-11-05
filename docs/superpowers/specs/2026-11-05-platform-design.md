# AI Prompt Engineering Cluster — Platform Design

Date: 2026-11-05
Status: approved — ready for implementation planning

## Intent and why

GDGoC's AI Prompt Engineering Cluster needs a learning system for its 8-week
track (syllabus: see the published cluster syllabus doc). The track turns
members from prompt-writers into people who can design, evaluate and ship a
small AI system, through one continuous project instead of scattered
exercises.

The reference point is `usmanmasud/gdgoc-infrastrucure` ("InfraTrack"), the
sister Infrastructure Cluster's learning system: a single vanilla-JS app
(registration, roadmap, labs, quizzes, journal, career tracks, leaderboard,
certificates, admin dashboard) on Firebase + GitHub Pages, free to run. This
design reuses that scaffold directly and adds the pieces a prompt-engineering
curriculum needs that a cloud/devops curriculum doesn't: live-graded prompt
labs, a public prompt portfolio, and peer review on milestones.

## Goals

- Members register once, follow the 8-week roadmap, and build one continuous
  AI assistant project that gains a new capability each week.
- Lab completion is graded by actually running the member's prompt against
  test cases, not by a self-ticked checkbox.
- Members leave with a public, shareable artifact (a prompt portfolio) in
  addition to a certificate.
- Leads get the same operational visibility InfraTrack gives its leads:
  registration stats, submission review queue, CSV export, a way to
  recognize top performers.
- The whole system runs for free (or near-free) on infrastructure a student
  org can maintain without a dedicated backend engineer.

## Non-goals

- Not building a general-purpose LMS or a multi-cluster platform. This is
  one cluster's tool, content-driven, same as InfraTrack is one cluster's
  tool.
- Not supporting arbitrary LLM providers in the UI. One provider is wired up
  at a time; swapping providers is a config change behind the proxy, not a
  user-facing feature.
- Not building real-time collaborative editing, chat, or a general agent
  playground beyond what the weekly labs need.

## Anti-goals

- A system that costs the cluster money per member — the free tier must
  hold for a normal cohort size (tens of members, not thousands).
- A system where "passing" a lab means nothing more than clicking a
  checkbox — that was fine for InfraTrack's cloud labs (verifiable by the
  member looking at their own terminal) but prompt quality isn't
  self-evident the same way, so grading has to be real.
- A system that requires every member to hold their own paid API key — that
  excludes anyone without a card on file and fragments usage tracking.

## Constraints

- Zero/near-zero budget: GitHub Pages (free) + Firebase Spark plan (free) +
  one LLM provider's free tier, same cost shape as InfraTrack.
- No build step, same as InfraTrack — vanilla HTML/CSS/JS. The
  differentiator here is curriculum content and the grading/portfolio
  features, not framework choice.
- One serverless function is the only new piece of infrastructure. It exists
  solely to hold the LLM API key server-side; the browser never sees it.
- 8-week semester (not 10, as InfraTrack runs) — content volume, XP curve
  and certificate thresholds are recalibrated for that length.

## Decisions made

**Stack:** Fork InfraTrack's architecture as-is — `site/index.html`,
`js/app.js` (views/routing/XP), `js/data.js` (curriculum content),
`js/store.js` (Firestore/localStorage abstraction), `js/media.js`
(certificates/flyers), `firestore.rules`, GitHub Actions → Pages deploy.

**LLM provider:** Google Gemini API via AI Studio, free tier, as the
default. Rationale: it's a lasting free tier (rate-limited, not an
expiring trial credit) unlike Anthropic/OpenAI, and it matches GDGoC's
Google-first orientation. The integration is provider-agnostic behind the
proxy function so a paid Anthropic/OpenAI key can replace it later without
touching client code.

**Grading proxy:** one Cloud Function holds the API key, accepts
`{memberId, week, labId, promptText}`, runs the prompt against that lab's
test cases/rubric (stored server-side, not shipped to the client, so
members can't read the answer key), returns `{passed, score, feedback}`,
and records token usage against that member's daily cap in Firestore.
Exceeding the cap fails closed with a clear message, not a silent retry.
Concurrent submissions (e.g. 30+ members grading at once in a live
session) are handled with retry/backoff inside the function against the
provider's rate limit, not a queue — simplest thing that holds at
cluster scale; revisit only if backoff delays become visible to members.

**Grading weeks 4-7 (RAG, tools, agents) without new infrastructure:**
these stay inside the same one Cloud Function, no vector database or tool
runtime added. RAG week: the function holds a small bundled knowledge
base (a JSON file of chunks) and does keyword/lightweight similarity
retrieval in-process, not a hosted vector store. Tools week: the function
offers a fixed set of mock tools (calculator, fake calendar, canned
search) it executes itself when the model calls them. Agent week: the
function runs a bounded multi-turn loop (hard step limit) server-side.
In every case grading evaluates both the prompt's design AND the
resulting run, within the one-function constraint — never a separate
service per week.

**Continuous project:** one evolving AI assistant, gaining one capability
per week per the syllabus (structured output → reasoning → guardrails →
RAG → tools → agent loop → capstone demo).

**Prompt portfolio:** each member's best-scoring prompt per module is
promoted to a public portfolio page (shareable URL, no sign-in required to
view), alongside — not instead of — the InfraTrack-style certificate.

**Peer review:** each milestone submission gets 2 peer reviews (same
rubric mentors use) before a mentor does a final pass; mentor only
adjudicates disagreement or signs off. "Milestone" here means the one
per-week milestone already defined in the syllabus (8 total over the
semester, same cadence as InfraTrack's weekly milestone) — not every lab
run; lab runs are graded automatically by the proxy and never go to peer
review. Reduces the lead's grading load, which InfraTrack's lead-only
review model doesn't address.

**Mentor role:** reuses InfraTrack's existing `admins` Firestore
collection as-is — InfraTrack's own README already treats mentors as
members added to that collection alongside co-leads, with the same
access level. No new permission tier in `firestore.rules`.

**Reused as-is from InfraTrack** (no redesign needed): registration flow,
XP/badges/streak, leaderboard, journal + activity heatmap, career tracks,
admin dashboard (stats, breakdowns, searchable member table, CSV export),
certificates with public verification links, Spotlight-of-the-Week flyer
generator, Firebase Auth (Google sign-in) + Firestore security model.

## Data model additions over InfraTrack

- `labRuns/{id}`: `memberId`, `week`, `labId`, `promptText`, `modelOutput`,
  `rubricScore`, `passed`, `tokensUsed`, `timestamp`.
- `portfolio/{memberId}/entries/{week}`: `promptText`, `outputSnippet`,
  `published` (bool), `rubricScore`.
- `peerReviews/{id}`: `submissionId`, `reviewerId`, `rubricScores`,
  `comments`, `timestamp`.
- `apiUsage/{memberId}`: `tokensToday`, `tokensTotal`, `lastResetDate` —
  written only by the proxy function, read-only to the client (enforced in
  `firestore.rules`).

XP additions: lab pass-by-grading keeps InfraTrack's lab XP value; a peer
review completed earns a small XP amount (to incentivize timely reviews,
mirroring the journal-day XP InfraTrack already uses for a different
habit).

**Build independently, don't fork InfraTrack's code.** Its repo has no
license file (`license: null` in its metadata) — all-rights-reserved by
default — so copying it isn't safe to assume just because you're both in
GDGoC. We rebuild the same shape from scratch as our own repo. Worth a
quick, no-pressure message to Usman anyway: if he's happy for you to
reuse the code directly, or to add a license, that could save real time
later — but the plan doesn't depend on his answer.

**Portfolio publication is opt-in, not automatic.** The proxy flags a
submission as "portfolio-worthy" when it scores well, but publishing it
to the public page is a member action (a toggle on their own entry), not
something that happens to their work without them choosing it. Keeps
consent clean and needs no moderation queue for a first version.

## What's left to the builder

- Exact rubric/test-case schema per lab (JSON shape the proxy function
  evaluates against) — content team's job per week, not an architectural
  decision.
- Choice between Firebase Cloud Functions and an external edge function
  (Vercel/Cloudflare Worker) for the proxy — recommend Cloud Functions
  for same-project IAM simplicity; revisit only if cold-start latency
  during a live session is a problem.
- Peer review assignment algorithm (random vs. round-robin vs.
  load-balanced) — any reasonable default works at cluster scale; pick one
  and adjust if it causes complaints.
- Visual design beyond reusing InfraTrack's existing CSS tokens/theme.
- Per-week daily token cap value — start conservative, loosen once real
  usage data from week 1-2 shows headroom against Gemini's free-tier
  limits.
