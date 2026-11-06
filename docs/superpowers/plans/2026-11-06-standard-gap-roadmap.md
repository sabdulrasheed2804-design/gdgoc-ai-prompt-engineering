# Closing the standard gap with InfraTrack — roadmap

Date: 2026-11-06
Status: proposed — sequencing for `docs/superpowers/specs/2026-11-05-platform-design.md`'s
unbuilt pieces, now that InfraTrack code reuse is unblocked (see that doc's
"Reuse InfraTrack's code directly" note).

## Why this exists

The platform design (2026-11-05) already specced registration, XP/badges,
leaderboard, journal+heatmap, career tracks, admin dashboard, and
certificates as "reused as-is" from InfraTrack, plus peer review on
milestones. Only grading, a thin XP/streak dashboard, and the prompt
portfolio got built. This doc isn't new scope — it sequences the rest into
shippable, independently-reviewable pieces, in the order a builder should
tackle them, each becoming its own `docs/superpowers/plans/<date>-<topic>.md`
task-by-task plan (via `superpowers:writing-plans`) and its own PR, matching
how `weeks-2-8-content`, `router-dashboard`, and `prompt-portfolio` shipped.

## Ground rule carried from the platform design

Every piece below keeps this repo's one real advantage over InfraTrack:
server-authoritative data. InfraTrack's `members/{uid}` rule is
`allow write: if isSelf(uid)` with no field restriction — a member can
edit their own XP, streak, or review status from devtools. Anywhere
InfraTrack has the client write a number that represents an achievement
(XP, leaderboard rank, badge unlock), this repo computes it server-side
(the grading Worker, same pattern as the portfolio's upsert) or derives it
client-side from read-only source data (`labRuns`) — never a client-writable
achievement field. Where InfraTrack's own design is already fine on this
axis (certificates: public read, `isAdmin()`-gated write; journal: pure
self-report with no integrity claim attached), copy that part as-is.

## Sequencing and why

1. **Richer weekly content** (topics, curated resources, a 5-question quiz
   per week, in `site/js/data.js`) — the single highest-leverage, lowest-risk
   item. No new data model, no new Firestore rules; reuses InfraTrack's
   quiz-rendering pattern but the content itself must be authored fresh for
   prompt engineering (InfraTrack's is DevOps-specific). Ship first because
   every later piece (leaderboard's quiz XP, the roadmap view) assumes this
   content exists.

2. **Registration** (member profile: faculty/department/level, career goal,
   GitHub/LinkedIn, weekly-hours goal, consent) — currently members just
   sign in with no profile at all. Needed before the admin dashboard has
   anything to show besides a bare UID list, and before career tracks can
   recommend anything.

3. **Admin dashboard + lead-only milestone review** — cohort stats,
   breakdowns, a searchable member table, CSV export (reused from
   InfraTrack's admin page, adapted to read `labRuns`/`apiUsage`/`portfolio`
   instead of self-ticked progress), plus Approved/Excellent/Needs-work
   review on each week's milestone submission (labs are already
   auto-graded; milestones — the cumulative-project deliverable — aren't,
   same gap InfraTrack's lead-only review fills). Peer review (the platform
   design's original idea for this) is deferred past this roadmap: ship the
   simpler lead-only version first, matching InfraTrack exactly, and only
   build the assignment/distribution logic peer review needs if lead review
   load actually becomes a bottleneck at real cohort size.

4. **Engagement: badges, leaderboard, journal + activity heatmap** —
   badges and leaderboard rank are derived read-only from `labRuns` (badges:
   pure client-side computation off data the client can already read, same
   as `computeStats`; leaderboard: the grading Worker upserts a
   `leaderboard/{uid}` summary doc alongside the portfolio write, so the
   client never writes its own rank). Journal is copied from InfraTrack
   as-is (self-report, no integrity claim needed for reflective writing).

5. **Certificates + Learners-of-the-Week flyer** — reuses InfraTrack's
   `media.js` canvas drawing and its `certificates`/`spotlights`
   Firestore rules essentially unchanged (already admin-gated, already
   public-read for verification links). Sequenced after the admin
   dashboard (issuance is an admin action) and leaderboard (Learners of
   the Week ranks by the same weekly score).

## What's left to each feature's own plan

- Exact quiz questions and curated resources per week (content authoring,
  not architecture).
- Registration form field list: start from InfraTrack's fields, cut
  anything that doesn't fit a prompt-engineering cluster (e.g. "laptop/OS"
  matters less here than "which LLM APIs have you used").
- Badge thresholds and the exact certificate tiers/rubric (85%+distinction
  etc.) — recalibrate for 8 weeks, not InfraTrack's 10.
- Whether "Learners of the Week" ships in the certificates PR or gets its
  own — judgment call for whoever plans that piece once admin + leaderboard
  exist.
