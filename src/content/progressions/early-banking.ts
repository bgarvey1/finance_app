import type { Topic } from "./history-of-money";

export const earlyBankingProgression: Topic[] = [
  {
    id: "goldsmith_roots",
    title: "From goldsmiths to custodians",
    objective:
      "Explain safe-keeping receipts, how custodianship emerged, and why paper claims started circulating.",
    concept_tags: ["custody", "receipts", "claims"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "deposits_and_loans",
    title: "Deposits and loans",
    objective:
      "Show how banks accept deposits, make loans, and earn a spread; introduce maturity transformation.",
    concept_tags: ["deposits", "loans", "net_interest_margin", "maturity_transformation"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "fractional_reserve_intro",
    title: "Fractional reserves (intuition)",
    objective:
      "Build intuition for holding only a fraction in reserve, liquidity management, and solvency vs. liquidity.",
    concept_tags: ["fractional_reserve", "liquidity", "solvency", "reserve_ratio"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "bank_money_creation",
    title: "How banks create money",
    objective:
      "Clarify deposit creation via lending, balance-sheet mechanics, and link to payments settlement.",
    concept_tags: ["money_creation", "bank_money", "balance_sheet", "reserve_ratio"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "hard",
  },
  {
    id: "risk_and_runs",
    title: "Risk, bank runs, and confidence",
    objective:
      "Explain confidence sensitivity, liquidity shocks, and early safeguards (capital, reserves, diversification).",
    concept_tags: ["bank_runs", "liquidity_risk", "capital"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "proto_clearing",
    title: "Clearinghouses and settlement",
    objective:
      "Introduce early clearinghouses, multilateral netting, and why settlement finality reduces systemic risk.",
    concept_tags: ["clearing", "settlement", "netting", "finality"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "notes_vs_deposits",
    title: "Bank notes vs. deposits",
    objective:
      "Differentiate bearer bank notes from ledger deposits and how convertibility/acceptance evolved, including what happens when convertibility is suspended.",
    concept_tags: ["bank_notes", "deposits", "convertibility", "acceptance"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
];

export default earlyBankingProgression;
