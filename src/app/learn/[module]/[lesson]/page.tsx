"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Lesson, Question, MCQChoice } from "@/lib/types";
import TvmCalculator from "@/components/TvmCalculator";
import PanelPlayer from "@/components/PanelPlayer";
import { getSupportedLessonSlugs } from "@/content/progressions";


type AnswerState = Record<number, string>; // question_id -> answer
type ResultState = Record<number, { checked: boolean; correct: boolean; message: string }>;

function isNumericCorrect(answer: string, correct: string) {
  const parse = (s: string) => parseFloat(s.replace(/[\$,]/g, "").trim());
  const a = parse(answer);
  const b = parse(correct);
  if (Number.isNaN(a) || Number.isNaN(b)) return answer.trim() === correct.trim();
  return Math.abs(a - b) <= 0.5; // allow rounding to nearest dollar
}

export default function LessonPage() {
  const params = useParams();
  const moduleSlug = (params.module as string) ?? "";
  const lessonSlug = (params.lesson as string) ?? "";
  const supportedSlugs = getSupportedLessonSlugs();
  const isProgressionLesson = supportedSlugs.includes(lessonSlug);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [lessonData, setLessonData] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<AnswerState>({});
  const [results, setResults] = useState<ResultState>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      if (isProgressionLesson) {
        // Progression lessons use the server tutor only; skip DB content
        setLessonData(null);
        setQuestions([]);
        setLoading(false);
        return;
      }
      if (!userEmail) {
        // Not signed in: skip client-side content fetch (PanelPlayer will still work via API)
        setLoading(false);
        return;
      }
      try {
        // Slugs are unique on lessons, so we can fetch directly by lesson slug
        const { data: l, error: lerr } = await supabase
          .from("lessons")
          .select("*")
          .eq("slug", lessonSlug)
          .single();
        if (lerr) throw lerr;
        setLessonData(l as Lesson);

        const { data: qs, error: qerr } = await supabase
          .from("questions")
          .select("*")
          .eq("lesson_id", (l as Lesson).id)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });
        if (qerr) throw qerr;
        setQuestions((qs ?? []) as Question[]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lessonSlug, userEmail, isProgressionLesson]);

  const progressionTitleMap: Record<string, string> = {
    "history-of-money": "History of Money",
    "ledger-origins": "Ledgers & Record‑Keeping",
    "early-banking": "Early Banking",
  };
  const title = isProgressionLesson ? (progressionTitleMap[lessonSlug] ?? "Lesson") : (lessonData?.title ?? "Lesson");
  const showCalculator = useMemo(() => lessonData?.slug === "pv-fv-basics", [lessonData?.slug]);

  const onChangeAnswer = (qid: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const checkAnswer = async (q: Question) => {
    const val = (answers[q.id] ?? "").trim();
    if (!val) {
      setResults((prev) => ({
        ...prev,
        [q.id]: { checked: true, correct: false, message: "Please enter/select an answer." },
      }));
      return;
    }

    setSubmitting((prev) => ({ ...prev, [q.id]: true }));
    try {
      // Determine correctness
      const correct =
        q.type === "mcq" ? val === q.correct_answer : isNumericCorrect(val, q.correct_answer);

      // Persist attempt + optional XP
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setResults((prev) => ({
          ...prev,
          [q.id]: { checked: true, correct: false, message: "You must be signed in to record attempts." },
        }));
      } else {
        await supabase.from("attempts").insert({
          user_id: uid,
          question_id: q.id,
          answer: val,
          is_correct: correct,
        });

        if (correct) {
          await supabase.from("xp_events").insert({
            user_id: uid,
            points: 10,
            reason: "correct_answer",
          });
        }
      }

      setResults((prev) => ({
        ...prev,
        [q.id]: {
          checked: true,
          correct,
          message: correct ? "Correct! " + (q.explanation ?? "") : "Not quite. " + (q.explanation ?? ""),
        },
      }));
    } catch (e: any) {
      setResults((prev) => ({
        ...prev,
        [q.id]: { checked: true, correct: false, message: e?.message ?? "Failed to submit attempt." },
      }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 space-y-6">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <div className="text-sm text-black/70 dark:text-white/70">
            {userEmail ? `Signed in as ${userEmail}` : <Link className="underline" href="/auth/login">Sign in</Link>}
          </div>
        </div>
        <div className="text-sm mb-4">
          <Link href="/learn" className="underline">All modules</Link>
        </div>
      </div>

      {/* Adaptive tutor panels (always visible) */}
      <PanelPlayer lessonSlug={lessonSlug} />

      {loading && <div className="w-full max-w-3xl">Loading lesson…</div>}

      {!isProgressionLesson && userEmail && error && (
        <div className="w-full max-w-3xl text-red-600 dark:text-red-400">
          {error}
          <div className="text-xs mt-1">
            Make sure you are signed in and the schema is applied (see supabase/README.md).
          </div>
        </div>
      )}

      {!loading && !error && lessonData && (
        <div className="w-full max-w-3xl space-y-6">

          {/* Toggle to reveal the full lesson text (hidden by default) */}
          <div className="w-full flex justify-end">
            <button
              onClick={() => setShowFullText((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              {showFullText ? "Hide full text" : "Show full text"}
            </button>
          </div>

          {showFullText && (
            <article className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{lessonData.content_md}</ReactMarkdown>
            </article>
          )}

          {showCalculator && (
            <div>
              <TvmCalculator />
            </div>
          )}

          {userEmail && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Knowledge Check</h2>
            {questions.length === 0 && (
              <div className="text-sm text-black/70 dark:text-white/70">No questions yet for this lesson.</div>
            )}
            {questions.map((q) => {
              const r = results[q.id];
              return (
                <div key={q.id} className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-black/30 backdrop-blur">
                  <div className="font-medium mb-2">{q.prompt}</div>

                  {q.type === "mcq" ? (
                    <div className="space-y-2">
                      {(q.choices ?? []).map((c) => (
                        <label key={(c as MCQChoice).id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value={(c as MCQChoice).id}
                            checked={answers[q.id] === (c as MCQChoice).id}
                            onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                          />
                          <span>
                            <span className="font-mono mr-1">{(c as MCQChoice).id}.</span>
                            {(c as MCQChoice).text}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter a number"
                        value={answers[q.id] ?? ""}
                        onChange={(e) => onChangeAnswer(q.id, e.target.value)}
                        className="w-full rounded-md border border-black/10 dark:border-white/15 bg-white/80 dark:bg-black/30 px-3 py-2 outline-none focus:ring-2 ring-black/10 dark:ring-white/20 text-sm"
                      />
                      <div className="text-xs text-black/60 dark:text-white/60">
                        Tip: Round to nearest dollar unless stated otherwise.
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => checkAnswer(q)}
                      disabled={!!r?.correct || submitting[q.id]}
                      className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition disabled:opacity-50"
                    >
                      {submitting[q.id] ? "Checking..." : r?.correct ? "Correct" : "Check answer"}
                    </button>
                    {r?.checked && (
                      <span className={`text-sm ${r.correct ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {r.message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
          )}
        </div>
      )}
    </div>
  );
}
