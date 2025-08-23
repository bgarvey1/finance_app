export type Topic = {
  id: string;
  title: string;
  objective: string;
  concept_tags: string[];
  preferred_question_types?: Array<"mcq" | "numeric">;
  difficulty_hint?: "easy" | "medium" | "hard";
};

export const historyOfMoneyProgression: Topic[] = [
  {
    id: "barter_basics",
    title: "Barter basics",
    objective:
      "Explain direct exchange (barter) and why it can work in very small groups or simple situations. Introduce the 'double coincidence of wants' idea (both sides must want the other’s item at the same time) to foreshadow why money/store-of-value is needed to bridge the mismatch.",
    concept_tags: ["barter"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "double_coincidence",
    title: "The double coincidence of wants",
    objective:
      "Describe why barter breaks at scale: both sides must want what the other has at the same time.",
    concept_tags: ["double_coincidence"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "why_money",
    title: "Why money emerged",
    objective:
      "Show how money fixes the matching/timing problem by acting as a commonly accepted medium of exchange and a store of value that bridges the double coincidence of wants.",
    concept_tags: ["money_as_medium"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "properties_money",
    title: "What makes good money",
    objective:
      "Introduce the desirable properties of money: durability, divisibility, portability, uniformity, scarcity, acceptability.",
    concept_tags: ["properties_of_money"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "early_forms",
    title: "Early forms of money",
    objective:
      "Give examples of commodity money (like shells/metal) and the move to standardized coins.",
    concept_tags: ["commodity_money", "coins"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "fiat_transition",
    title: "From commodity to fiat",
    objective:
      "Explain the transition to fiat currency and the role of trust/institutions backing it.",
    concept_tags: ["fiat_money"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "fiat_demand_taxes",
    title: "Why taxes create demand for USD",
    objective:
      "Explain how obligations to pay taxes in U.S. dollars create baseline demand for USD and support general acceptance of fiat money.",
    concept_tags: ["taxes_demand_usd", "fiat_money"],
    preferred_question_types: ["mcq"],
    difficulty_hint: "medium",
  },
];

export default historyOfMoneyProgression;
