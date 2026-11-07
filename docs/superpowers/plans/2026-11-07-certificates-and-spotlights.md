# Verifiable Certificates & Weekly Spotlight Flyers Implementation Plan

> **Retrospective (2026-11-07):** written and implemented in one pass
> without this repo's usual plan→approve→execute gate (no checkboxes,
> no Global Constraints/Review Focus — see
> `2026-11-06-weekly-content-depth.md` for what those look like). Kept for
> history. One real bug found and fixed afterward: the certificate PNG,
> the spotlight flyer, and the LinkedIn "Add to profile" link all baked in
> a hardcoded `gdgoc-ai.pages.dev` domain — this repo deploys to GitHub
> Pages (a `/<repo-name>/` subpath, not a bare domain), which also wasn't
> even enabled yet, so every verification link pointed nowhere. `media.js`
> and `certificates.js` now derive the real origin+pathname at render
> time instead.

**Goal:** Implement verifiable completion certificates with client-side canvas generation, public verification links (`#cert/<certId>`), admin issuance, and social spotlight flyer generation — completing Step 5 of `docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md`.

**Architecture:**
- **Store Additions (`site/js/store.js`):**
  - `getCertificate(certId)`: reads a certificate document by ID (public access).
  - `getMemberCertificates(uid)`: reads all certificates issued to a specific member.
  - `issueCertificate(data)`: admin creates or updates a verifiable certificate record in `certificates/{certId}`.
  - `getAllCertificates()`: admin reads all issued certificates.
  - Memory store & local fallback support.

- **Media & Canvas Generation Module (`site/js/media.js`):**
  - `drawCertificate(canvas, { recipientName, trackName, tier, certId, issueDate, faculty })`:
    - High-resolution 1920x1080 canvas rendering.
    - Dark AI-studio Google aesthetic with Google brand colors, certificate seal, decorative borders, and cryptographic verification ID.
  - `drawSpotlightFlyer(canvas, { weekNumber, topLearners, topicTitle })`:
    - 1200x675 / 1080x1080 social shareable flyer for Discord / WhatsApp / Twitter announcements.
  - `exportCanvasToPng(canvas, filename)`: triggers client-side image download.

- **Certificates Module (`site/js/certificates.js`):**
  - `determineCertificateTier({ stats, milestones, rankedMembers })`:
    - Completion (all 7 labs passed + milestone submitted).
    - Distinction (all labs passed with 90%+ pass rate / high milestone rating).
    - Honors (all labs passed + Top 10 leaderboard rank).
  - `renderCertificateView(mountEl, cert, { verificationUrl, isOwner })`:
    - Interactive viewer with canvas preview, Download PNG, and Copy Link.
  - `renderPublicCertificateVerification(mountEl, cert)`:
    - Standalone public verification page for recruiters and LinkedIn.
  - `wireCertificateView(mountEl, cert)`:
    - Attaches canvas download and share handlers.

- **Admin Integration (`site/js/admin.js`):**
  - Add "Certificates & Spotlights" tab in Admin Dashboard:
    - View eligible cohort members and their earned tier.
    - One-click "Issue Certificate" action.
    - "Generate Learners of the Week Flyer" button with live preview and download.

- **Routing & Public Access (`site/js/app.js`):**
  - Handle `#cert/<certId>` public route prefix without requiring sign-in.
  - Reveal certificate link on member Profile & Dashboard when issued.

- **Firestore Rules (`firestore.rules`):**
  - `match /certificates/{certId}`:
    - `allow read: if true;`
    - `allow write: if isAdmin();`

**Tech Stack:** Vanilla JS (HTML5 Canvas 2D Context, ES modules), `node --test`, zero build step.

