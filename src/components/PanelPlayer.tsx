"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  Step,
  StepQuestion,
  StepPanelOrReteach,
  LastEvent,
  MCQChoice,
} from "@/lib/tutor/types";

export default function PanelPlayer({ lessonSlug }: { lessonSlug: string }) {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [authResolved, setAuthResolved] = useState(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<Step | null>(null);
  const [lastEvent, setLastEvent] = useState<LastEvent | null>(null);
  const [recentSteps, setRecentSteps] = useState<
    Array<{ type: string; title?: string; concept_tags?: string[] }>
  >([]);
  const [quizAsked, setQuizAsked] = useState<number>(0);
  const [quizCorrect, setQuizCorrect] = useState<number>(0);

  // Answer state for questions
  const [selectedChoice, setSelectedChoice] = useState<string>("");
  const [numericAnswer, setNumericAnswer] = useState<string>("");
  const [questionFeedback, setQuestionFeedback] = useState<string>("");

  // Separate positive status from error
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [apiError, setApiError] = useState<string>("");

  // Request lifecycle control
  const latestRequestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const initLessonRef = useRef<string | null>(null);

  const CLIENT_TIMEOUT_MS = 45000;

  // Debug mount
  // eslint-disable-next-line no-console
  console.log("[PanelPlayer] mount", { lessonSlug });

  // Resolve auth once on mount
  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!mounted) return;
        setUserId(data.user?.id);
      })
      .finally(() => {
        if (!mounted) return;
        setAuthResolved(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // One-shot initialization per lessonSlug after auth resolution
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[PanelPlayer] init check", { lessonSlug, authResolved, userId });

    if (!authResolved) return;
    if (initLessonRef.current === lessonSlug) return; // already initialized for this lesson
    initLessonRef.current = lessonSlug;

    // Reset visible state on lesson change
    setStep(null);
    setLastEvent(null);
    setRecentSteps([]);
    setQuizAsked(0);
    setQuizCorrect(0);
    setSelectedChoice("");
    setNumericAnswer("");
    setQuestionFeedback("");
    setApiError("");
    setStatusMsg("");

    fetchNext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSlug, authResolved]);

  const isPanel = step?.type === "panel" || step?.type === "reteach";
  const isQuestion = step?.type === "question";
  const isSummary = step?.type === "summary";

  async function fetchNext(event: LastEvent | null) {
    // Prepare a new request id and abort any in-flight request
    const rid = ++latestRequestIdRef.current;
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => {
      try {
        controller.abort();
      } catch {}
    }, CLIENT_TIMEOUT_MS);

    try {
      if (rid === latestRequestIdRef.current) {
        setLoading(true);
        setQuestionFeedback("");
        setApiError("");
        // keep statusMsg unless server sets a new one
      }

      const res = await fetch("/api/tutor/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          lessonSlug,
          lastEvent: event,
          recent_steps: recentSteps,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (rid !== latestRequestIdRef.current) {
        // stale response, ignore entirely
        return;
      }

      if (!res.ok) {
        let msg = `Tutor unavailable (${res.status}).`;
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const j = await res.json();
            if ((j as any)?.error) msg = (j as any).error;
          } else {
            const txt = await res.text();
            if (txt) msg = txt;
          }
        } catch {}
        // eslint-disable-next-line no-console
        console.error("[PanelPlayer] tutor api error", res.status, msg);
        setApiError(msg);
        setStep(null);
      } else {
        const data = await res.json();
        // eslint-disable-next-line no-console
        console.log("[PanelPlayer] received step", (data as any)?.step?.type, data);

        if (!data?.step) {
          setApiError("Tutor returned no step.");
          setStep(null);
        } else {
          const newStep = data.step as Step;
          setStep(newStep);
          setRecentSteps((prev) => {
            const next = [
              ...prev,
              {
                type: (newStep as any).type,
                title: (newStep as any).title,
                concept_tags: (newStep as any).concept_tags ?? [],
              },
            ];
            return next.slice(-6);
          });

          // Server may signal unlock; persist a flag and show positive status
          try {
            if ((data as any)?.unlock_next === true) {
              localStorage.setItem("unlock:ledger-origins", "true");
              setStatusMsg("Great work — next module unlocked.");
            }
          } catch {}

          // Surface degraded mode info if backend included an error alongside a fallback step
          if (data?.error) {
            // eslint-disable-next-line no-console
            console.warn("[PanelPlayer] tutor degraded mode:", data.error);
            setApiError(`Tutor degraded mode: ${data.error}`);
          }
        }
      }

      setLastEvent(event);
      setSelectedChoice("");
      setNumericAnswer("");
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === "AbortError") {
        // Swallow aborts for stale requests; only show message if this is still the latest request
        if (rid === latestRequestIdRef.current) {
          setApiError("Tutor is taking longer than usual. Tap Start lesson to try again.");
          // do not clear step here, preserve current visible content
        }
      } else {
        if (rid === latestRequestIdRef.current) {
          setApiError(e?.message ?? "Network error");
          setQuestionFeedback(e?.message ?? "Network error");
          setStep(null);
        }
      }
    } finally {
      clearTimeout(timeout);
      if (rid === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function handleNextPanel() {
    // eslint-disable-next-line no-console
    console.log("[PanelPlayer] click Next", { stepType: step?.type });
    const tags = ((step as StepPanelOrReteach)?.concept_tags ?? []) as string[];
    fetchNext({ type: "panel_viewed", payload: { concept_tags: tags } });
  }

  function handleDidntGetIt() {
    const tags =
      (step && (step as any).concept_tags && Array.isArray((step as any).concept_tags)
        ? (step as any).concept_tags
        : []) as string[];
    // eslint-disable-next-line no-console
    console.log("[PanelPlayer] click DidntGetIt", { stepType: step?.type, tags });
    fetchNext({ type: "feedback", payload: { didnt_get_it: true, concept_tags: tags } as any });
  }

  function checkAnswer() {
    if (!isQuestion) return;
    const q = (step as StepQuestion).question;
    let answer = "";
    if (q.type === "mcq") {
      answer = selectedChoice;
      if (!answer) {
        setQuestionFeedback("Select an option first.");
        return;
      }
    } else {
      answer = (numericAnswer ?? "").trim();
      if (!answer) {
        setQuestionFeedback("Enter a number first.");
        return;
      }
    }

    const correct =
      q.type === "mcq" ? answer === q.correct_answer : normalizeNum(answer) === normalizeNum(q.correct_answer);

    setQuestionFeedback(correct ? `Correct! ${q.explanation}` : `Not quite. ${q.explanation}`);
    // Inform tutor and move on (send concept tags and quiz_progress to update per-concept stats and final-quiz state)
    const tags =
      (step && (step as any).concept_tags && Array.isArray((step as any).concept_tags)
        ? (step as any).concept_tags
        : []) as string[];
    const nextAsked = quizAsked + 1;
    const nextCorrect = quizCorrect + (correct ? 1 : 0);
    setQuizAsked(nextAsked);
    setQuizCorrect(nextCorrect);
    fetchNext({
      type: "question_answered",
      payload: {
        correct,
        answer,
        concept_tags: tags,
        quiz_progress: { asked: nextAsked, correct: nextCorrect },
      } as any,
    });
  }

  function normalizeNum(s: string) {
    const n = parseFloat(String(s).replace(/[,$\s]/g, ""));
    if (Number.isNaN(n)) return String(s).trim();
    // Round to nearest unit to keep it simple
    return String(Math.round(n));
  }

  const renderMd = (md: string) => {
    const parts = (md || "").split(/\n\s*\n/g).filter(Boolean);
    
    return parts.map((paragraph, i) => {
      const sentences = paragraph
        .split(/(?<=[.!?;])\s+|(?:,\s+(?:and|but|or|so|yet)\s+)/g)
        .map(s => s.trim())
        .filter(Boolean);
      
      if (sentences.length <= 1) {
        return (
          <p key={i} className="whitespace-pre-wrap">
            {paragraph
              .split(/(\*\*[^*]+\*\*)/g)
              .filter(Boolean)
              .map((seg, j) =>
                seg.startsWith("**") && seg.endsWith("**") ? (
                  <strong key={j}>{seg.slice(2, -2)}</strong>
                ) : (
                  <span key={j}>{seg}</span>
                )
              )}
          </p>
        );
      }
      
      return (
        <ul key={i} className="list-disc list-inside space-y-1 text-sm leading-relaxed">
          {sentences.map((sentence, j) => (
            <li key={j} className="whitespace-pre-wrap">
              {sentence
                .split(/(\*\*[^*]+\*\*)/g)
                .filter(Boolean)
                .map((seg, k) =>
                  seg.startsWith("**") && seg.endsWith("**") ? (
                    <strong key={k}>{seg.slice(2, -2)}</strong>
                  ) : (
                    <span key={k}>{seg}</span>
                  )
                )}
            </li>
          ))}
        </ul>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl rounded-xl border border-black/10 dark:border-white/10 p-5 bg-white/60 dark:bg-black/30 backdrop-blur space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{step?.title ?? "Tutor"}</h3>
        <div className="flex items-center gap-3">
          {statusMsg && <div className="text-xs text-green-700 dark:text-green-400">{statusMsg}</div>}
          {loading && <div className="text-xs text-black/60 dark:text-white/60">Thinking…</div>}
        </div>
      </div>

      {/* Empty / error state (show even while loading so user can retry) */}
      {!step && (
        <div className="space-y-3">
          {loading && <div className="text-xs text-black/60 dark:text-white/60">Loading…</div>}
          {apiError && <div className="text-sm text-red-600 dark:text-red-400">{apiError}</div>}
          {statusMsg && !apiError && (
            <div className="text-sm text-green-700 dark:text-green-400">{statusMsg}</div>
          )}
          <button
            onClick={() => fetchNext(null)}
            className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            Start lesson
          </button>
        </div>
      )}

      {/* Panel / Reteach */}
      {isPanel && (
        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">{renderMd((step as StepPanelOrReteach).body_md)}</div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 bg-white/70 dark:bg-black/20">
            <div className="text-xs uppercase tracking-wide text-black/60 dark:text-white/60 mb-1">Example</div>
            <div className="prose dark:prose-invert max-w-none">
              {renderMd((step as StepPanelOrReteach).example_md)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleDidntGetIt}
              className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              Didn’t get it
            </button>
            <button
              onClick={handleNextPanel}
              className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      {isQuestion && (
        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">{renderMd((step as StepQuestion).body_md)}</div>
          <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 bg-white/70 dark:bg-black/20 space-y-3">
            <div className="font-medium">{(step as StepQuestion).question.prompt}</div>
            {(step as StepQuestion).question.type === "mcq" ? (
              <div className="space-y-2">
                {(((step as StepQuestion).question.choices ?? []) as MCQChoice[]).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="mcq"
                      value={c.id}
                      checked={selectedChoice === c.id}
                      onChange={(e) => setSelectedChoice(e.target.value)}
                    />
                    <span>
                      <span className="font-mono mr-1">{c.id}.</span>
                      {c.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={numericAnswer}
                  onChange={(e) => setNumericAnswer(e.target.value)}
                  placeholder="Enter a number"
                  className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20 text-sm"
                />
              </div>
            )}

            {questionFeedback && <div className="text-sm">{questionFeedback}</div>}

            <div>
              <button
                onClick={checkAnswer}
                className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {isSummary && (
        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">{renderMd((step as any).body_md)}</div>
        </div>
      )}
    </div>
  );
}
