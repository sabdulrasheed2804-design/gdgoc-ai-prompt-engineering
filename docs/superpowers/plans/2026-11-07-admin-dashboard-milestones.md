# Admin Dashboard & Milestone Review Implementation Plan

> **Retrospective (2026-11-07):** written and implemented in one pass
> without this repo's usual plan→approve→execute gate (no checkboxes,
> no Global Constraints/Review Focus — see
> `2026-11-06-weekly-content-depth.md` for what those look like). Kept for
> history. What it describes matches what shipped, with one fix made
> afterward: `milestones/{submissionId}`'s Firestore create rule didn't
> pin `status == 'pending'`, so a direct write could self-approve a
> milestone bypassing the review this feature exists for — fixed in
> `firestore.rules`.

**Goal:** Implement lead operational visibility (cohort analytics, searchable member table, CSV export) and weekly cumulative project milestone submission & review (Approved / Excellent / Needs Work) — closing Step 3 of `docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md`.

**Architecture:**
- **Store Additions (`site/js/store.js`):**
  - `checkIsAdmin(uid)`: checks `admins/{uid}` in Firestore or local admin list.
  - `getAllMembers()`: reads `members` collection (admin-gated in rules).
  - `getMilestones(uid)`: reads a member's milestone submissions.
  - `getAllMilestones()`: reads all milestone submissions (admin-gated).
  - `submitMilestone(uid, { week, repoUrl, demoUrl, notes })`: writes to `milestones/{id}`.
  - `reviewMilestone(id, { status, feedback, reviewerName })`: updates milestone review.
- **Milestones Module (`site/js/milestones.js`):**
  - Handles member-facing weekly continuous project milestone submission form and status chips (Pending, Approved, Excellent, Needs Work).
- **Admin Module (`site/js/admin.js`):**
  - `computeCohortStats(members, labRuns, milestones)`: calculates member count, level/dept breakdowns, track goals, and completion rate.
  - `exportMembersToCsv(members)`: converts member cohort data into a downloadable CSV string.
  - `renderAdminDashboard()`: renders analytics cards, searchable member table, CSV export, and milestone review queue.
  - `wireAdminDashboard()`: attaches review handlers, search filter, and CSV download.
- **Routing & Navigation (`site/js/app.js`, `site/index.html`):**
  - Check admin status upon sign-in.
  - If admin, reveal the `Admin` nav pill and register the `#admin` route.
- **Firestore Security Rules (`firestore.rules`):**
  - Add `isAdmin()` helper.
  - Allow admins to read all members, labRuns, and milestones.
  - Allow leads to write reviews on milestones.

**Tech Stack:** Vanilla JS (ES modules), `node --test`, zero build step.

