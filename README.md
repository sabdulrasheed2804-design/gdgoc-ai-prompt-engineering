# AI Prompt Engineering Cluster

An 8-week learning platform for GDGoC's AI Prompt Engineering cluster, with
server-side graded prompt labs — no self-ticked checkboxes. You write a
prompt, it runs against a real rubric via Gemini, and you get a pass/fail
with feedback.

## How it works

- **`site/`** — static site (no build step), hosted on GitHub Pages. Firebase
  Auth (Google sign-in) + Firestore for member/progress data.
- **`worker/`** — a Cloudflare Worker that grades lab submissions: verifies
  the caller's Firebase ID token, runs the prompt against each lab's test
  cases via the Gemini API, checks the output against a JSON schema, and
  writes the result to Firestore.
- **`docs/`** — the syllabus, technical design doc, and implementation plans.

Grading lives in a Worker rather than a Firebase Cloud Function because
Cloud Functions require a billing-enabled (Blaze) project even for free-tier
usage; Cloudflare Workers don't.

## Running locally

```bash
cd site && npx http-server .   # or any static file server
```

```bash
cd worker
npm install
npm test                        # node's built-in test runner
npm run build                   # bundles src/ to dist/index.js
```

Worker secrets (`GEMINI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY`) are set via
`wrangler secret put` or the Cloudflare dashboard — see `worker/src/`.

## Syllabus

8 weeks, each with objectives, a graded lab, and a milestone toward a
cumulative capstone project (`site/js/data.js`). See
`docs/superpowers/specs/` for the technical design doc.
