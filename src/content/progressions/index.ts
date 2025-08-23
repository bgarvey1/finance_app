import type { Topic } from "./history-of-money";
export type { Topic } from "./history-of-money";
import { historyOfMoneyProgression } from "./history-of-money";
import { ledgerOriginsProgression } from "./ledger-origins";
import { earlyBankingProgression } from "./early-banking";

export const progressionLessonSlugs: string[] = [
  "history-of-money",
  "ledger-origins",
  "early-banking",
];

export function getSupportedLessonSlugs(): string[] {
  return [...progressionLessonSlugs];
}

/**
 * Return a topic progression for a given lesson slug.
 * If no progression is defined, return an empty array to fall back to markdown mode.
 */
export function getProgressionForLesson(lessonSlug: string): Topic[] {
  switch (lessonSlug) {
    case "history-of-money":
      return historyOfMoneyProgression;
    case "ledger-origins":
      return ledgerOriginsProgression;
    case "early-banking":
      return earlyBankingProgression;
    default:
      return [];
  }
}
