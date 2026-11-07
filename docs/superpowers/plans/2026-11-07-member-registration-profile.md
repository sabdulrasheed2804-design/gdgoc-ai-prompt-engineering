# Member Registration & Profile Implementation Plan

> **Retrospective (2026-11-07):** written and implemented in one pass
> without this repo's usual plan→approve→execute gate (no checkboxes,
> no Global Constraints/Review Focus — see
> `2026-11-06-weekly-content-depth.md` for what those look like). Kept for
> history. One fix made afterward: `githubUrl`/`linkedinUrl` were rendered
> as clickable links without re-checking the scheme server-side — this
> form's own client-side validation isn't a security boundary (a direct
> Firestore write bypasses it), so a `javascript:` URL could've become a
> clickable self-XSS. `profile.js` now gates every such href on
> `util.js`'s `isHttpUrl`.

**Goal:** Implement first-time member registration onboarding and a profile management view (`#profile`), capturing academic details, AI experience, career goals, and social links — closing Step 2 of `docs/superpowers/plans/2026-11-06-standard-gap-roadmap.md`.

**Architecture:**
- Create `site/js/profile.js` containing `renderRegistrationForm()`, `renderProfileView()`, and `validateProfile()`.
- Add `#profile` route in `site/js/router.js` and `site/js/app.js`.
- If a signed-in member has no `registered: true` in their `members/{uid}` doc, prompt with the registration onboarding form before accessing other routes.
- Update `site/index.html` nav with a "Profile" link.
- Store profile in `members/{uid}` via `store.js`'s existing `getMember` and `setMember`.

**Tech Stack:** Vanilla JS (ES modules), `node --test`, zero build step.

---

### Task 1: Profile Validation & Rendering Module (`site/js/profile.js`)

**Files:**
- Create: `site/js/profile.js`
- Test: `site/js/profile.test.mjs`

**Interfaces:**
- `validateProfile(formData)`: returns `{ valid: boolean, errors: Record<string, string> }`
  - Validates `name` (required, non-empty)
  - Validates `faculty` (required)
  - Validates `department` (required)
  - Validates `level` (required, e.g. '100L', '200L', '300L', '400L', '500L', 'Postgraduate', 'Other')
  - Validates `careerGoal` (required)
  - Validates `aiExperience` (required)
  - Validates `weeklyHours` (required)
  - Validates optional `githubUrl` and `linkedinUrl` (must be valid URL or empty)
  - Validates `consent` (boolean, must be true)
- `renderRegistrationForm(mountEl, initialData)`: renders registration onboarding form
- `renderProfileView(mountEl, memberData)`: renders editable profile page
- `wireProfileForm(mountEl, onSubmit)`: wires form submission and error handling

---

### Task 2: Wire Registration Gate and Profile Route into `site/js/app.js`

**Files:**
- Modify: `site/js/app.js`
- Modify: `site/index.html` (add `#profile` nav link)
- Modify: `site/css/styles.css` (profile card, form fields, inputs, error messages)

**Flow:**
- When `onAuthChange` fires:
  - Fetch member document via `getMember(member.uid)`.
  - If `!memberDoc?.registered`:
    - Show registration view and gate navigation until registered.
  - When registered:
    - Normal navigation enabled, router initialized with `dashboard`, `roadmap`, `portfolio`, and `profile`.

---

### Task 3: Comprehensive Testing & Verification

- Test profile validator with edge cases.
- Test profile view HTML output and escaping.
- Verify full site test suite (`node --test site/js/*.test.mjs`).

