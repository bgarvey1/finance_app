# Finance Tutor — Progression-Only Architecture

This app is a Next.js 15 + Supabase project with an adaptive, topic-based tutor. It uses a single, unified architecture: topic progressions defined in TypeScript files. The legacy markdown fallback has been removed.

<!-- Verification comment: Repository access and workflow confirmed -->

## Quick Start

1) Install and run the dev server:
- npm install
- npm run dev

2) Open the app:
- Local: http://localhost:3000
- LAN (optional): bind to all interfaces to test on other devices:
  - npx next dev -H 0.0.0.0 -p 3000
  - Then use http://YOUR-LAN-IP:3000 on phone/tablet

## Environment Variables

Set these in .env/.env.local:
- OPENAI_API_KEY=... (required)
- MODEL_TUTOR=gpt-5 (or another accessible model)
- TUTOR_TONE="crisp, encouraging, concrete"
- TUTOR_TIMEOUT_MS=8000 (server-side timeout for tutor step generation)
- SUPABASE_URL=...
- SUPABASE_SERVICE_ROLE_KEY=... (server-side only; used by API for logging/stats)

Optional:
- NEXT_PUBLIC_SUPABASE_URL=... (client)
- Any other NEXT_PUBLIC_* variables you use in the UI

## Architecture Overview

- Lessons (topics): defined in TypeScript under src/content/progressions/*.ts
  - Each file exports a Topic[] array with id, title, objective, concept_tags, preferred_question_types, difficulty_hint.
  - src/content/progressions/index.ts maps lesson slugs to these arrays via getProgressionForLesson.

Current lesson slugs:
- history-of-money
- ledger-origins
- early-banking

- Adaptive Tutor API: src/app/api/tutor/next/route.ts
  - Uses OpenAI Responses API with a strict, topic-scoped prompt.
  - Model fallback sequence tries MODEL_TUTOR, then gpt-4.1, then gpt-4o (if available).
  - Timeout via TUTOR_TIMEOUT_MS. Graceful fallback returns a step aligned to the current topic if the model times out.
  - Single-architecture only: If getProgressionForLesson returns no topics for a slug, API returns 404 with a clear message:
    - "No topic progression configured for '{lessonSlug}'."
  - Logs minimal analytics to Supabase (panel_events, user_concept_stats) when available.

- Frontend Player: src/components/PanelPlayer.tsx
  - Drives the interaction (Start lesson, Didn’t get it, Next, questions).
  - Displays backend error text so you can see when a slug is unknown.
  - Uses AbortController on the client to avoid hanging if the API takes too long.

- Lesson Page: src/app/learn/[module]/[lesson]/page.tsx
  - Hosts PanelPlayer for the adaptive tutor.
  - If the user is signed in, it also fetches lesson/question rows from Supabase to show a “Knowledge Check” area and optional calculators. This does not affect the tutor architecture.

## Routing

- Adaptive tutor lives at:
  - /learn/[module]/[lesson]
  - The [module] segment is organizational; the [lesson] slug must be one of the supported lesson slugs listed above.

Examples:
- /learn/history/history-of-money
- /learn/records/ledger-origins
- /learn/banking/early-banking

## Removed Legacy Path

The old markdown fallback (content/history-of-money.md + generator script) has been removed. Only progression-based tutors are supported.

Removed/obsolete:
- content/history-of-money.md (removed)
- scripts/generate_from_markdown.py (removed)
- supabase/generated/history-of-money.* (removed)

## Supabase

- Server-side API uses service role for logging and concept stats. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
- Client-side content fetches (Lesson/Questions) only run when a user is signed in, to avoid RLS errors. The PanelPlayer always works via the server API regardless of sign-in.

Apply the schema (see supabase/README.md) before testing signed-in flows.

## Troubleshooting

- Seeing “old version” content?
  - Make sure you’re hitting the current dev server (stop older processes).
  - Clear Service Worker/PWA cache (Chrome DevTools → Application → Service Workers → Unregister; Clear storage → Clear site data; hard reload).
  - If testing across devices, bind dev server to 0.0.0.0 and use your LAN IP.
  - Verify the lesson slug matches a configured progression; unknown slugs return 404 with message.

- Timeouts:
  - Increase TUTOR_TIMEOUT_MS (server) or the client timeout in PanelPlayer if needed.

- Model access:
  - Confirm OPENAI_API_KEY can access your chosen MODEL_TUTOR; the API has fallback candidates and logs model attempts.

## Notes

- Keep topic objectives concrete and scoped; concept_tags drive question targeting and mastery tracking.
- Use preferred_question_types to nudge MCQ vs numeric items where appropriate.
- Add new modules by creating a new file under src/content/progressions and registering the slug in src/content/progressions/index.ts.
