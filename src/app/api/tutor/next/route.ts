import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getProgressionForLesson, type Topic } from "@/content/progressions";
import type { Step, LastEvent, TutorRequest } from "@/lib/tutor/types";




export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_TUTOR = process.env.MODEL_TUTOR || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const TUTOR_TIMEOUT_MS = parseInt(process.env.TUTOR_TIMEOUT_MS || "6000", 10);
const TUTOR_TONE = process.env.TUTOR_TONE || "";
const TUTOR_DETERMINISTIC_FIRST_STEP = process.env.TUTOR_DETERMINISTIC_FIRST_STEP === "true";
const TUTOR_RETRY_TIMEOUT_MS = parseInt(process.env.TUTOR_RETRY_TIMEOUT_MS || "2500", 10);

const FINAL_QUIZ_TOTAL = parseInt(process.env.FINAL_QUIZ_TOTAL || "4", 10);
const FINAL_QUIZ_PASS = parseInt(process.env.FINAL_QUIZ_PASS || "3", 10);


/**
 * Given a progression and the last event payload, decide which topic index to use now.
 * - If lastEvent has concept_tags, try to align to that topic
 * - Advance on panel_viewed (move to the next topic’s panel)
 * - Do not advance on question_answered (questions are deferred to the final quiz)
 * - Stay on same topic for didnt_get_it (if used)
 */
function pickTopicIndex(prog: Topic[], lastEvent?: LastEvent | null): number {
  if (!prog || prog.length === 0) return 0;
  let idx = 0;

  // If the last event carried concept tags, align to that topic
  const tag = (lastEvent as any)?.payload?.concept_tags?.[0];
  if (tag) {
    const found = prog.findIndex((t) => (t.concept_tags || []).includes(tag));
    if (found >= 0) idx = found;
  }

  const isFeedback = (lastEvent as any)?.type === "feedback" && (lastEvent as any)?.payload?.didnt_get_it === true;
  const isPanelViewed = (lastEvent as any)?.type === "panel_viewed";
  const isQA = (lastEvent as any)?.type === "question_answered";
  const wasCorrect = (lastEvent as any)?.payload?.correct === true;

  if (isFeedback) return idx; // stay on the same topic
  // After a panel_viewed, advance to the NEXT topic’s panel
  if (isPanelViewed) return Math.min(idx + 1, prog.length - 1);
  // During this new flow, questions happen at the end (final quiz), so do not advance on QA
  if (isQA) return idx;

  return idx; // null/unknown → start topic
}

function systemPromptTopic(topic: Topic) {
  return `
You are a patient, engaging finance tutor for ages 18–21.

Generate a single "step" JSON strictly about the CURRENT TOPIC below. Do NOT drift to other topics.
Keep copy concise and concrete. Body ≤120 words, example ≤90 words. Use relatable teen/college scenarios.
Explicitly mention any key term(s) named in the objective at least once (e.g., "double coincidence of wants").
Tone/style: ${TUTOR_TONE}

CURRENT TOPIC:
- id: ${topic.id}
- title: ${topic.title}
- objective: ${topic.objective}
- concept_tags: ${JSON.stringify(topic.concept_tags)}

Allowed shapes:

{
  "step": {
    "type": "panel" | "reteach",
    "title": "short title",
    "body_md": "≤120 words, focused on this topic only",
    "example_md": "≤90 words, concrete",
    "concept_tags": ${JSON.stringify(topic.concept_tags)}
  }
}

or

{
  "step": {
    "type": "question",
    "title": "short title",
    "body_md": "brief lead‑in (≤60 words)",
    "concept_tags": ${JSON.stringify(topic.concept_tags)},
    "question": {
      "type": "mcq" | "numeric",
      "prompt": "question text (within this topic only)",
      "choices": [{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],
      "correct_answer": "A" | "B" | "C" | "D" | "42",
      "explanation": "brief, grounded explanation about this topic",
      "difficulty": "easy" | "medium" | "hard"
    }
  }
}

or

{
  "step": {
    "type": "summary",
    "title": "Wrap‑up",
    "body_md": "key takeaways for this topic (≤120 words)",
    "concept_tags": ${JSON.stringify(topic.concept_tags)}
  }
}
`;
}

function buildUserPromptTopic(
  lessonSlug: string,
  topic: Topic,
  lastEvent?: LastEvent | null,
  index?: number,
  total?: number,
  forcedType?: "panel" | "reteach" | "question" | "summary",
  recentSteps?: Array<{ type: string; title?: string; concept_tags?: string[] }>
) {
  const eventStr = lastEvent ? JSON.stringify(lastEvent).slice(0, 4000) : "null";
  const policy = `
Policy:
- If lastEvent is null: produce a "panel" introducing the topic with a concrete example.
- If lastEvent.type = "feedback" and didnt_get_it=true: respond with type="reteach" for THIS SAME topic, using a different framing/analogy.
- If lastEvent.type = "panel_viewed": START NEXT TOPIC WITH type="panel".
- If lastEvent.type = "question_answered":
    - correct=true: START NEXT TOPIC WITH type="panel".
    - correct=false: produce "reteach" and then (on the next call) a simpler "question".
- If a forcedType is provided, you MUST return that exact type for step.type.
- If forcedType="question", craft a real question grounded in the objective; DO NOT use generic meta prompts like "Which statement best matches...". Prefer concrete MCQ or numeric questions with content-anchored distractors.
- Stay strictly on THIS topic. Do not introduce future topics or unrelated content.
`;

  const transcript = (recentSteps || [])
    .map((s) => `- [${s.type}] ${s.title ?? ""} | tags=${JSON.stringify(s.concept_tags ?? [])}`)
    .join("\n");

  return `
Lesson slug: ${lessonSlug}
Current topic: ${topic.id} (${topic.title})
Index: ${index ?? 0} of ${total ?? 1}

${policy}

forcedType: ${forcedType ?? "none"}

Recent session steps (most recent last):
${transcript || "(none)"}

lastEvent:
${eventStr}

Respond with a single JSON object "step" matching the schema exactly. No extra keys. No prose outside JSON.
`;
}



/** Final Quiz system prompt: always emit a question step. */
function systemPromptFinalQuiz() {
  return `
You are a patient, engaging finance tutor for ages 18–21.

You are in FINAL QUIZ mode. Generate exactly ONE "question" step. Do NOT produce panels, reteach, or summaries here.
Keep the quiz concise and concrete. Prefer MCQ unless numeric is clearly better. Body ≤60 words. Use teen/college scenarios.

Rules:
- step.type MUST be "question".
- concept_tags MUST include "final_quiz" and the selected topic tags for the question.
- If asked to target taxes_demand_usd, include that tag and craft the question about why tax obligations create baseline demand for USD.
`;
}

/** Build the user prompt for Final Quiz, including coverage hints and progress. */
function buildUserPromptFinalQuiz(
  lessonSlug: string,
  allConceptTags: string[],
  mustTargetTaxes: boolean,
  quizProgress?: { asked?: number; correct?: number }
) {
  const progressStr = JSON.stringify(quizProgress || {});
  const targetHint = mustTargetTaxes
    ? `Target concept: ["taxes_demand_usd","fiat_money"].`
    : `Target concept: choose a salient tag from: ${JSON.stringify(allConceptTags)} (avoid duplicates if possible).`;

  return `
Lesson slug: ${lessonSlug}
Mode: FINAL_QUIZ
${targetHint}

Progress so far: ${progressStr}

Respond with a single JSON object "step" (a question) matching the schema exactly. No extra keys. No prose outside JSON.
`;
}

/** Minimal quick-check to enforce progress when the model ignores forcedType. */
function makeQuickCheckQuestion(topic: Topic): Step {
  const objective = (topic as any).objective || topic.title;
  return {
    type: "question",
    title: "Quick check",
    body_md: "One quick check grounded in this exact topic’s objective.",
    concept_tags: topic.concept_tags,
    question: {
      type: "mcq",
      prompt: `Which statement best matches this objective: "${objective}"?`,
      choices: [
        { id: "A", text: "A claim that conflicts with the stated objective." },
        { id: "B", text: "A statement that correctly reflects the stated objective." },
        { id: "C", text: `A statement about something other than "${topic.title}".` },
        { id: "D", text: "A vague, non-committal statement." },
      ],
      correct_answer: "B",
      explanation: "B directly aligns with the objective; the other options are off-target or vague.",
      difficulty: "easy",
    },
  };
}

// Deterministic panel generator from topic objective
function exampleForTopic(topic: Topic): string {
  const tags = (topic.concept_tags || []).map((t) => t.toLowerCase());
  if (tags.includes("barter") || tags.includes("double_coincidence")) {
    return "Two roommates swap: one needs printer paper today and has extra ramen; the other needs ramen today and has extra paper. It works because both want the other’s item at the same time.";
  }
  if (tags.includes("money_as_medium") || tags.includes("properties_of_money")) {
    return "You sell an old textbook for cash and later use that cash to buy groceries. Money bridges two separate trades without needing a perfect match in timing or wants.";
  }
  if (tags.includes("commodity_money") || tags.includes("coins")) {
    return "A market where metal coins with standard weights replace random items as payment—buyers and sellers can quickly agree on prices because the coins are uniform and widely accepted.";
  }
  if (tags.includes("fiat_money") && tags.includes("taxes_demand_usd")) {
    return "A local shop accepts USD because suppliers and employees expect USD—and everyone must pay taxes in USD. That tax obligation sustains baseline demand for dollars.";
  }
  if (tags.includes("fiat_money")) {
    return "Campus stores take dollars even though bills aren’t backed by metal; they trust that others will also accept dollars tomorrow and next week.";
  }
  // Generic fallback
  return "A short campus-life scenario that shows how the concept appears in everyday decisions.";
}

function makePanelFromObjective(topic: Topic): Step {
  const objective = (topic as any).objective || topic.title;
  const body = typeof objective === "string" && objective.trim().length > 0
    ? objective.trim()
    : `Overview: ${topic.title}. Focus on the core idea and why it matters in everyday life.`;

  return {
    type: "panel",
    title: topic.title,
    body_md: body,
    example_md: exampleForTopic(topic),
    concept_tags: topic.concept_tags,
  };
}

async function logEvent(admin: any, userId: string | undefined, lessonId: number, event: any) {
  try {
    if (!userId) return;
    await admin.from("panel_events").insert({
      user_id: userId,
      lesson_id: lessonId,
      event_type: event?.type ?? "unknown",
      payload: event?.payload ?? {},
    });
  } catch {
    // ignore logging errors (table might not exist yet)
  }
}

async function updateConceptStats(
  admin: any,
  userId: string | undefined,
  conceptTags: string[] | undefined,
  result: { correct?: boolean } | undefined
) {
  if (!userId || !conceptTags || conceptTags.length === 0) return;
  try {
    for (const tag of conceptTags) {
      const { data: current } = await admin
        .from("user_concept_stats")
        .select("accuracy, seen_count")
        .eq("user_id", userId)
        .eq("concept_tag", tag)
        .maybeSingle();

      const seen = (current?.seen_count ?? 0) + 1;
      const acc = current?.accuracy ?? 0;
      const correct = !!result?.correct;
      const newAccuracy = (acc * (seen - 1) + (correct ? 1 : 0)) / seen;

      const upsertRow = {
        user_id: userId,
        concept_tag: tag,
        seen_count: seen,
        accuracy: newAccuracy,
        mastery: newAccuracy,
        last_seen: new Date().toISOString(),
      };

      await admin.from("user_concept_stats").upsert(upsertRow, { onConflict: "user_id,concept_tag" });
    }
  } catch {
    // ignore stats errors (table might not exist yet)
  }
}

export async function POST(req: Request) {
  let parsedBody: TutorRequest | undefined;
  let userId: string | undefined;
  let lessonSlug: string = "";
  let lastEvent: LastEvent | null | undefined = null;
  let recentSteps: Array<{ type: string; title?: string; concept_tags?: string[] }> | undefined = undefined;
  let currentTopic: Topic | null = null;
  let progression: Topic[] = [];
  let forcedTypeUsed: "panel" | "reteach" | "question" | "summary" | undefined = undefined;
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    parsedBody = (await req.json()) as TutorRequest;
    ({ userId, lessonSlug, lastEvent, recent_steps: recentSteps } = parsedBody || {});
    if (!lessonSlug) {
      return NextResponse.json({ error: "lessonSlug required" }, { status: 400 });
    }

    // Fetch lesson content from Supabase (service role, server-side only)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let lessonRow: any = null;
    try {
      const { data: lr } = await admin
        .from("lessons")
        .select("id, slug, title, content_md")
        .eq("slug", lessonSlug)
        .single();
      lessonRow = lr || null;
    } catch {}

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    let sys: string;
    let user: string;

    progression = getProgressionForLesson(lessonSlug);
    if (!progression || progression.length === 0) {
      return NextResponse.json(
        { error: `No topic progression configured for '${lessonSlug}'.` },
        { status: 404 }
      );
    }
    const topicIdx = pickTopicIndex(progression, lastEvent);
    currentTopic = progression[topicIdx];
    sys = systemPromptTopic(currentTopic);

    // Optional deterministic-first-step: bypass model for very first call
    if (TUTOR_DETERMINISTIC_FIRST_STEP && !lastEvent && (!recentSteps || recentSteps.length === 0)) {
      return NextResponse.json({ step: makePanelFromObjective(currentTopic) });
    }

    // Determine forced type to ensure teaching before quizzing on a new topic
    let forcedType: "panel" | "reteach" | "question" | "summary" | undefined = undefined;
    const isFeedback = (lastEvent as any)?.type === "feedback" && (lastEvent as any)?.payload?.didnt_get_it === true;
    const isPanelViewed = (lastEvent as any)?.type === "panel_viewed";
    const isQA = (lastEvent as any)?.type === "question_answered";
    const wasCorrect = (lastEvent as any)?.payload?.correct === true;
    if (!lastEvent) forcedType = "panel";
    // After showing a panel, move to the next topic and show another panel
    else if (isPanelViewed) forcedType = "panel";
    else if (isQA && wasCorrect) forcedType = "panel";
    // Avoid panel→panel loops within the same topic and reteach→reteach
    // (For didnt_get_it we do not force, so the model can choose "reteach")

    // Final Quiz detection and entry:
    const isLastTopic = topicIdx === progression.length - 1;

    const recentHasFinalQuiz = (recentSteps || []).some(
      (s) => (s.type === "question") && Array.isArray(s.concept_tags) && s.concept_tags.includes("final_quiz")
    );
    const shouldEnterFinalQuiz =
      isLastTopic && !recentHasFinalQuiz && (isPanelViewed || (isQA && wasCorrect));

    const qpCheck = (lastEvent as any)?.payload?.quiz_progress as { asked?: number; correct?: number } | undefined;
if (
  isLastTopic &&
  (recentHasFinalQuiz || shouldEnterFinalQuiz) &&
  (lastEvent as any)?.type === "question_answered" &&
  qpCheck &&
  (qpCheck.asked ?? 0) >= FINAL_QUIZ_TOTAL
) {
  const passed = (qpCheck.correct ?? 0) >= FINAL_QUIZ_PASS;
  const passStep: Step = {
    type: "summary",
    title: passed ? "Final quiz passed" : "Keep going",
    body_md: passed
      ? "Nice work — you’ve demonstrated mastery of the core concepts (including why taxes create baseline demand for USD)."
      : "You’re close. Review the tricky parts and try a few more questions.",
    concept_tags: ["final_quiz"],
  };
  return NextResponse.json({ step: passStep, unlock_next: passed });
}
if (recentHasFinalQuiz || shouldEnterFinalQuiz) {
      // Build final quiz prompt
      const allTags = Array.from(new Set(progression.flatMap((t) => t.concept_tags || [])));
      const taxesQuestionAlreadyAsked = (recentSteps || []).some(
        (s) => (s.type === "question") && Array.isArray(s.concept_tags) && s.concept_tags.includes("taxes_demand_usd")
      );
      const mustTargetTaxes = !taxesQuestionAlreadyAsked;
      sys = systemPromptFinalQuiz();
      const qp = (lastEvent as any)?.payload?.quiz_progress as { asked?: number; correct?: number } | undefined;
      user = buildUserPromptFinalQuiz(lessonSlug, allTags, mustTargetTaxes, qp);
    } else {
      // Normal topic mode
      forcedTypeUsed = forcedType;
      user = buildUserPromptTopic(
        lessonSlug,
        currentTopic,
        lastEvent,
        topicIdx,
        progression.length,
        forcedType,
        recentSteps
      );
    }

    // Optionally log the incoming event and update stats based on user feedback/answers
    try {
      if (lessonRow?.id) {
        await logEvent(admin, userId, lessonRow.id, lastEvent);
      }
      if (lastEvent?.type === "question_answered") {
        // Expect concept_tags from client payload if available
        await updateConceptStats(admin, userId, (lastEvent as any)?.payload?.concept_tags, {
          correct: (lastEvent as any)?.payload?.correct,
        });
      }
    } catch {}

    // Single-model attempt with MODEL_TUTOR; wait up to TUTOR_TIMEOUT_MS
    let completion: any = null;
    let lastErr: any = null;
    try {
      // eslint-disable-next-line no-console
      console.log("[tutor] using single model:", MODEL_TUTOR, "(timeout:", TUTOR_TIMEOUT_MS, "ms)");
      const input = `${sys}\n\n${user}`;
      completion = (await Promise.race([
        client.responses.create({
          model: MODEL_TUTOR as any,
          input
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("tutor_timeout")), TUTOR_TIMEOUT_MS)
        ),
      ])) as any;
    } catch (e: any) {
      lastErr = e;
    }

    if (!completion) {
      throw lastErr || new Error("tutor_no_model_succeeded");
    }

    let content = (completion as any)?.output_text || "";
    if (!content) {
      try {
        const maybe = (completion as any)?.output?.[0]?.content?.[0]?.text;
        if (typeof maybe === "string") content = maybe;
      } catch {}
    }
    // Try to extract JSON block if the model wrapped it in code fences
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch) content = jsonMatch[1];
    const parsed = JSON.parse(content);

    // Minimal shape validation
    if (!parsed || typeof parsed !== "object" || !parsed.step) {
      throw new Error("Invalid step payload from model.");
    }

    let step: Step = parsed.step as Step;
    // If using a progression, lock concept tags to the topic to keep state aligned
    // but do NOT override for final quiz steps.
    const isFinalQuizStep =
      Array.isArray((parsed.step as any)?.concept_tags) &&
      (parsed.step as any).concept_tags.includes("final_quiz");
    if (currentTopic && !isFinalQuizStep) {
      step.concept_tags = currentTopic.concept_tags;
    }

    // Enforce forcedType locally if the model ignored it (topic mode only).
    if (forcedTypeUsed && !isFinalQuizStep && currentTopic) {
      if (step.type !== forcedTypeUsed) {
        if ((forcedTypeUsed as string) === "question") {
          // Retry once with stricter instruction to get a real question
          try {
            const retryUser = buildUserPromptTopic(
              lessonSlug,
              currentTopic,
              lastEvent,
              topicIdx,
              progression.length,
              "question",
              recentSteps
            );
            const retryInput = `${systemPromptTopic(currentTopic)}\n\n${retryUser}`;
            const retry = (await Promise.race([
              client.responses.create({ model: MODEL_TUTOR as any, input: retryInput }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("tutor_retry_timeout")), TUTOR_RETRY_TIMEOUT_MS)
              ),
            ])) as any;

            let retryText = (retry as any)?.output_text || "";
            if (!retryText) {
              try {
                const maybe = (retry as any)?.output?.[0]?.content?.[0]?.text;
                if (typeof maybe === "string") retryText = maybe;
              } catch {}
            }
            const retryMatch = retryText.match(/```json\s*([\s\S]*?)```/i);
            if (retryMatch) retryText = retryMatch[1];
            const retryParsed = JSON.parse(retryText);
            if (
              retryParsed &&
              typeof retryParsed === "object" &&
              retryParsed.step &&
              retryParsed.step.type === "question"
            ) {
              step = retryParsed.step as Step;
              // lock tags to topic
              (step as any).concept_tags = currentTopic.concept_tags;
            } else {
              step = makeQuickCheckQuestion(currentTopic);
            }
          } catch {
            step = makeQuickCheckQuestion(currentTopic);
          }
        } else if ((forcedTypeUsed as string) === "panel") {
          if (step.type === "question") {
            try {
              const retryUser = buildUserPromptTopic(
                lessonSlug,
                currentTopic,
                lastEvent,
                topicIdx,
                progression.length,
                "panel",
                recentSteps
              );
              const retryInput = `${systemPromptTopic(currentTopic)}\n\n${retryUser}`;
              const retry = (await Promise.race([
                client.responses.create({ model: MODEL_TUTOR as any, input: retryInput }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("tutor_retry_timeout")), TUTOR_RETRY_TIMEOUT_MS)
                ),
              ])) as any;

              let retryText = (retry as any)?.output_text || "";
              if (!retryText) {
                try {
                  const maybe = (retry as any)?.output?.[0]?.content?.[0]?.text;
                  if (typeof maybe === "string") retryText = maybe;
                } catch {}
              }
              const retryMatch = retryText.match(/```json\s*([\s\S]*?)```/i);
              if (retryMatch) retryText = retryMatch[1];
              const retryParsed = JSON.parse(retryText);
              if (
                retryParsed &&
                typeof retryParsed === "object" &&
                retryParsed.step &&
                retryParsed.step.type === "panel"
              ) {
                step = retryParsed.step as Step;
                (step as any).concept_tags = currentTopic.concept_tags;
              } else {
                step = makePanelFromObjective(currentTopic);
              }
            } catch {
              step = makePanelFromObjective(currentTopic);
            }
          }
        }
      }
    }

    // Optionally we can log the step for debugging later (omit for now)
    // await admin.from("tutor_steps").insert({ user_id: userId, lesson_id: lessonRow.id, step_json: parsed });

    return NextResponse.json({ step });
  } catch (err: any) {
    // Fallback: keep within the current topic to maintain single-architecture behavior
    if (currentTopic) {
      const tags = currentTopic.concept_tags || [];
      const isQA = (lastEvent as any)?.type === "question_answered";
      const wasCorrect = (lastEvent as any)?.payload?.correct === true;
      const isFeedback =
        (lastEvent as any)?.type === "feedback" && (lastEvent as any)?.payload?.didnt_get_it === true;
      const isPanelViewed = (lastEvent as any)?.type === "panel_viewed";

      let step: Step;
      if (!lastEvent) {
        step = makePanelFromObjective(currentTopic);
      } else if (isFeedback) {
        step = {
          type: "reteach",
          title: "Another angle",
          body_md:
            "Let’s try a different framing for the same idea, keeping it concrete and focused.",
          example_md:
            "Alternate example: a short scenario that reframes the idea without jargon.",
          concept_tags: tags,
        };
      } else if (isQA) {
        step = wasCorrect
          ? {
              type: "summary",
              title: "Wrap‑up",
              body_md: "Key takeaways for this topic in a sentence or two.",
              concept_tags: tags,
            }
          : {
              type: "reteach",
              title: "Reteach",
              body_md:
                "Here’s a simpler explanation to clear up the confusion before trying again.",
              example_md:
                "A simpler everyday example focusing on the core point.",
              concept_tags: tags,
            };
      } else if (isPanelViewed) {
        // Panel-first flow: after panel_viewed, fallback to the next topic's panel
        step = makePanelFromObjective(currentTopic);
      } else {
        step = makePanelFromObjective(currentTopic);
      }
      return NextResponse.json(
        { step, error: err?.message || "tutor_error" },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: err?.message || "tutor_error" }, { status: 500 });
  }
}
