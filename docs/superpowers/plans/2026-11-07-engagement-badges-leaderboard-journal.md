# Engagement: Badges, Leaderboard, Journal & Activity Heatmap Implementation Plan

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

