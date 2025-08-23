"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LessonLink = {
  title: string;
  slug: string; // lesson slug
};

type Section = {
  moduleTitle: string;
  moduleSlug: string; // path segment
  description: string;
  lessons: LessonLink[];
};

const SECTIONS: Section[] = [
  {
    moduleTitle: "Foundations",
    moduleSlug: "foundations",
    description:
      "Origins and evolution of money — from barter and commodity money to fiat and digital forms. Why money works and how institutions and technology shape it.",
    lessons: [
      { title: "History of Money", slug: "history-of-money" },
    ],
  },
  {
    moduleTitle: "Ledgers & Record‑Keeping",
    moduleSlug: "records",
    description:
      "Why written records matter, early ledger systems, double‑entry basics, IOUs and netting, and how controls keep records reliable.",
    lessons: [
      { title: "Ledgers & Record‑Keeping", slug: "ledger-origins" },
    ],
  },
  {
    moduleTitle: "Early Banking",
    moduleSlug: "banking",
    description:
      "From custodianship to deposits and loans, fractional reserves, how banks create money, clearing/settlement, and notes vs. deposits.",
    lessons: [
      { title: "Early Banking", slug: "early-banking" },
    ],
  },
];

export default function LearnIndexPage() {
  const [ledgerUnlocked, setLedgerUnlocked] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem("unlock:ledger-origins");
      setLedgerUnlocked(v === "true");
      // Listen for unlock events written from other tabs
      const onStorage = (e: StorageEvent) => {
        if (e.key === "unlock:ledger-origins") {
          setLedgerUnlocked(e.newValue === "true");
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 space-y-6">
      <div className="w-full max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">Learn</h1>
        <p className="text-sm text-black/70 dark:text-white/70">
          Pick a module and start a lesson. This page lists the built‑in progression lessons (single architecture).
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        {SECTIONS.map((s) => (
          <div
            key={s.moduleSlug}
            className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-white/60 dark:bg-black/30 backdrop-blur"
          >
            <h2 className="text-lg font-semibold">{s.moduleTitle}</h2>
            <p className="text-sm text-black/70 dark:text-white/70 mb-3">{s.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {s.lessons.map((l) => {
                const isLedger = l.slug === "ledger-origins";
                const disabled = isLedger && !ledgerUnlocked;
                if (disabled) {
                  return (
                    <div
                      key={l.slug}
                      title="Complete the History of Money final quiz to unlock this module."
                      className="rounded-md border border-black/10 dark:border-white/15 px-3 py-2 text-sm opacity-60 cursor-not-allowed"
                    >
                      {l.title} (locked)
                    </div>
                  );
                }
                return (
                  <Link
                    key={l.slug}
                    href={`/learn/${encodeURIComponent(s.moduleSlug)}/${encodeURIComponent(l.slug)}`}
                    className="rounded-md border border-black/10 dark:border-white/15 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition text-sm"
                  >
                    {l.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl">
        <Link
          href="/"
          className="inline-block text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
