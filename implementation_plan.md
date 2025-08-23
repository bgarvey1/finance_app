# Implementation Plan

[Overview]
Design and implement a stable, deterministic panel-to-question learning flow for progression lessons, eliminating the initial “glitch” where the first panel is replaced and aligning tutor behavior with the intended Duolingo-like progression.

The current client fetches the first step twice at mount due to userId initialization and possible React dev double-effects, causing two concurrent /api/tutor/next requests whose responses race; whichever returns last replaces the initial panel, producing a visible “glitch.” On the server, the “policy” text for panel_viewed conflicts with actual routing logic, which can confuse the model when fallback rules don’t short-circuit. This plan stabilizes initial fetches, ignores stale responses, aligns server policy with rules, and codifies progression flow: panel → question(s) within the same topic → next topic, plus a final quiz that unlocks the next module upon pass.

[Types]  
Centralize “tutor” types used by both client and server to avoid drift.

Add a shared types module for tutor steps and events:
- Step
  - Panel/Reteach: { type: "panel"|"reteach"; title: string; body_md: string; example_md: string; concept_tags: string[] }
  - Question: { type: "question"; title: string; body_md: string; concept_tags: string[]; question: { type: "mcq"|"numeric"; prompt: string; choices?: { id: string; text: string }[]; correct_answer: string; explanation: string; difficulty: "easy"|"medium"|"hard" } }
  - Summary: { type: "summary"; title: string; body_md: string; concept_tags: string[] }
- LastEvent
  - { type: "panel_viewed"; payload?: { concept_tags?: string[] } }
  - { type: "feedback"; payload: { didnt_get_it?: boolean; concept_tags?: string[] } }
  - { type: "question_answered"; payload: { correct: boolean; answer?: string; concept_tags?: string[]; quiz_progress?: { asked?: number; correct?: number } } }
  - { type: "ask"; payload: { question: string } }
- TutorRequest
  - { userId?: string; lessonSlug: string; lastEvent?: LastEvent|null; recent_steps?: Array<{ type: string; title?: string; concept_tags?: string[] }> }
- TutorResponse
  - { step: Step; unlock_next?: boolean; error?: string }

Validation rules:
- step.type must be one of the specified literals.
- For Question, choices required only when type="mcq".
- concept_tags must be a string[]; when in topic-mode (not final quiz), the server overwrites tags to current topic’s tags.
- quiz_progress numbers non-negative; asked increments monotonically.

[Files]
Introduce a shared types file and make targeted edits to stabilize client fetches and align server policy.

New files:
- src/lib/tutor/types.ts
  - Purpose: Source of truth for Step, LastEvent, TutorRequest, TutorResponse.

Existing files to modify:
- src/components/PanelPlayer.tsx
  - Add initialization gating so the first fetch only happens once per lesson view.
  - Add in-flight request tracking with a monotonically increasing requestId ref; ignore responses that don’t match the latest requestId.
  - Optionally store AbortController in a ref and abort the prior fetch when a new fetch begins.
  - Only trigger initial fetch after “auth check resolved” to avoid undefined→defined userId causing a second initial fetch; or guard by “if step is already set, don’t refetch due solely to userId update.”
  - Minor UX: treat “unlocked next module” as a positive status separate from error messaging.
- src/app/api/tutor/next/route.ts
  - Import shared types.
  - Fix pickTopicIndex docstring to reflect actual behavior: do NOT advance on panel_viewed; advance only on correct question_answered.
  - Align “policy” prose in buildUserPromptTopic with actual rules (panel_viewed → question in the same topic).
  - Keep existing “quick check” short-circuit after panel_viewed; ensure forcedType logic is consistent and non-contradictory with the policy text.
  - Optionally raise default TUTOR_TIMEOUT_MS to reduce fallback churn (e.g., 6000ms); keep override via env var.
  - Optional deterministic-first-step (feature flag): when lastEvent=null and recent_steps empty, return a templated first panel from Topic objective without model call to guarantee stable first render.
- src/lib/types.ts
  - Optionally re-export tutor types to minimize import churn across app code.

Files to delete or move:
- None.

Configuration updates:
- None required; optional: introduce env var TUTOR_DETERMINISTIC_FIRST_STEP=true to bypass the model for the very first panel.

[Functions]
Stabilize client fetching and correct server guidance.

New functions:
- src/components/PanelPlayer.tsx
  - function isAuthResolved(): boolean
    - Tracks whether supabase auth check completed (userId known or no user).
  - function nextRequestId(): number
    - Increments a ref to return the next request id.

Modified functions:
- PanelPlayer useEffect for initialization (lessonSlug, user auth)
  - Current: fires on lessonSlug and userId, causing two calls (undefined → defined userId).
  - Change: gate with initRef and authResolvedRef; only fire once per lesson view. Alternatively, skip re-init if step already set.
- fetchNext(event: LastEvent)
  - Add requestId capture: const rid = nextRequestId(); set rid as “current.”
  - If there’s an existing AbortController, abort it before starting a new fetch; store the new controller in a ref.
  - On response, before setStep, verify rid === latestRequestIdRef.current; otherwise ignore as stale to prevent “glitch.”
  - Do not null step on transient errors when a newer request is in-flight.
- src/app/api/tutor/next/route.ts
  - pickTopicIndex
    - Update comment (and keep logic): panel_viewed → stay in same topic; correct QA → move to next; incorrect QA/feedback → stay.
  - buildUserPromptTopic
    - Update Policy: “If lastEvent.type = 'panel_viewed': respond with type='question' for THIS SAME topic.”
  - POST
    - Import shared types.
    - Keep early return (isPanelViewed ⇒ quick check question) and ensure forcedType consistency.
    - Optional: if TUTOR_DETERMINISTIC_FIRST_STEP is true and lastEvent is null and recent_steps is empty, return a deterministic first panel built from topic.title/objective.

Removed functions:
- None.

[Classes]
No classes are used; remain functional components and route handlers.

[Dependencies]
Optional lightweight validators only.

- Add zod (optional): Parse/validate model JSON before enforcing overrides; improves safety without changing external behavior.
  - "zod": ^3.x
- No other new runtime deps required.

Integration:
- If zod is added, validate “step” object in the API; on validation failure, fallback to topic-mode deterministic panel/question as today.

[Testing]
Manual and dev-mode resilience tests to confirm no double-initialization and correct flow.

Manual scenarios:
- Initial load (history-of-money lesson):
  - Expect a single stable panel render; no auto-replacement without user action.
- Click “Next”:
  - Expect a question (quick check) in the same topic.
- Answer incorrect:
  - Expect a “reteach” step and then another question; do not advance topic.
- Answer correct:
  - Expect next topic with a panel.
- Final topic and final quiz:
  - Confirm final quiz questions include taxes_demand_usd at least once.
  - Upon pass threshold, response includes unlock_next: true; Learn page shows “Ledgers & Record‑Keeping” unlocked.
- Refresh page while on a panel and while on a question:
  - Ensure state resumes sanely with one initial fetch; no flicker.

Dev-mode behavior:
- With React/Next dev double-invocations, confirm only one visible step is applied due to requestId and/or abort of prior request.

[Implementation Order]
Implement client stabilization first, then server policy alignment, then optional deterministic-first-step.

1) Types first
- Create src/lib/tutor/types.ts and move Step/LastEvent/TutorRequest/TutorResponse definitions there.
- Update imports in PanelPlayer and API route to use shared types.

2) Client fetch stabilization
- In PanelPlayer.tsx:
  - Add refs: initRef, authResolvedRef, latestRequestIdRef, abortRef.
  - Change mount/useEffect logic to call fetchNext(null) once per lesson view (gate on auth resolved, or skip if step non-null).
  - Update fetchNext to assign rid, abort previous in-flight request, and ignore stale responses.

3) Server policy fixes and consistency
- In route.ts:
  - Update pickTopicIndex docstring.
  - Update “policy” text in buildUserPromptTopic for panel_viewed to “question in same topic.”
  - Keep forcedType logic; ensure no contradiction with text.
  - Optional: raise default TUTOR_TIMEOUT_MS to 6000ms (env override still supported).

4) Optional deterministic-first-step (feature-flagged)
- If TUTOR_DETERMINISTIC_FIRST_STEP=true and (lastEvent==null & recent_steps empty):
  - Return a templated first panel from Topic without calling the model.

5) Validate and QA
- Run dev server, exercise the manual scenarios above.
- Verify unlock flow writes to localStorage and Learn page reacts.

6) Optional hardening
- Add zod schema for Step parsing; fallback gracefully on validation failure.
