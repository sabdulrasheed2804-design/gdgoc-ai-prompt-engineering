# Engagement: Badges, Leaderboard, Journal & Activity Heatmap Implementation Plan

> **Retrospective (2026-11-07):** this doc was written and implemented in
> one pass without this repo's usual plan→approve→execute gate, and it's a
> stale record, not an accurate one — kept for history, not as a reference.
> `getLeaderboard()` below was never built; what shipped is
> `getAllLeaderboardEntries()`/`syncLeaderboardProfile()` in
> `site/js/store.js`, because this doc never anticipated that xp/labsPassed/
> streak can't be self-reported (InfraTrack's own flaw) without also leaking
> every member's full registration profile to rank them. That gap produced
> a real privacy bug (`members/{uid}` read opened to any signed-in user),
> found and fixed afterward — see the `leaderboard/{uid}` Firestore rule and
> the Worker's leaderboard upsert in `worker/src/index.js`'s
> `handleGradeLab` for what's actually live. Badges and journal match this
> doc's description.

**Goal:** Implement gamification and reflective learning features (badges, cohort leaderboard, learning journal, and GitHub-style activity contribution heatmap) — closing Step 4 of `docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md`.

**Architecture:**
- **Badges (`site/js/badges.js`):**
  - Pure function `computeBadges(labRuns, stats, portfolioEntries, milestones)` returning list of all badges with `unlocked: boolean` and progress.
  - Renders badge shelf on Dashboard and Profile.
- **Leaderboard (`site/js/leaderboard.js`):**
  - Route `#leaderboard`.
  - Displays Top 3 podium (Gold, Silver, Bronze) and ranked cohort table.
  - In local mode or fallback, aggregates from all members and lab runs.
- **Journal & Heatmap (`site/js/journal.js`):**
  - Route `#journal`.
  - 12-week GitHub-style activity heatmap (combining lab run timestamps and journal entry dates).
  - Member reflective journal: form to log daily notes, prompt techniques learned, takeaways, and timeline of past entries.
- **Store Additions (`site/js/store.js`):**
  - `getJournalEntries(uid)`
  - `addJournalEntry(uid, entry)`
  - `getLeaderboard()`
- **Routing & Navigation (`site/js/app.js`, `site/index.html`):**
  - Add `#leaderboard` and `#journal` to nav bar and router.

**Tech Stack:** Vanilla JS (ES modules), `node --test`, zero build step.

