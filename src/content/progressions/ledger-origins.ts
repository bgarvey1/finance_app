import type { Topic } from "./history-of-money";

export const ledgerOriginsProgression: Topic[] = [
  {
    id: "ledger_why",
    title: "Why ledgers matter",
    objective:
      "Show how written records solve memory/trust limits and enable multi-step, time-separated exchange.",
    concept_tags: ["ledger", "trust", "intertemporal_exchange"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "ancient_ledgers",
    title: "Clay tablets, notches, and tally sticks",
    objective:
      "Introduce early record systems (Mesopotamian tablets, tally sticks) and how they tracked obligations.",
    concept_tags: ["ledger_history", "obligations", "tally_stick"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "units_and_uniformity",
    title: "Units, standardization, and pricing",
    objective:
      "Show how standardized units and a money-of-account make ledgers comparable across trades.",
    concept_tags: ["unit_of_account", "standardization", "pricing"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "double_entry_basics",
    title: "Double-entry bookkeeping",
    objective:
      "Explain debits/credits, why every entry has two sides, and how this improves error detection.",
    concept_tags: ["double_entry", "accounting_identity", "controls", "trial_balance"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "iou_and_bills",
    title: "IOUs, bills, and netting",
    objective:
      "Describe how ledgers represent promises (IOUs), allow netting across parties, and reduce cash needs.",
    concept_tags: ["iou", "bills_of_exchange", "netting"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "audit_and_recon",
    title: "Reconciliation and audits",
    objective:
      "Introduce periodic checks (trial balance, reconciliation) to maintain ledger integrity at scale.",
    concept_tags: ["reconciliation", "audit", "controls", "trial_balance"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
];

export default ledgerOriginsProgression;
