import type { Topic } from "./history-of-money";

export const timeValueMoneyProgression: Topic[] = [
  {
    id: "present_value_basics",
    title: "Present value fundamentals",
    objective:
      "Explain why money today is worth more than money tomorrow due to opportunity cost and the ability to earn returns. Introduce the concept of discounting future cash flows.",
    concept_tags: ["present_value", "opportunity_cost", "discounting"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "easy",
  },
  {
    id: "future_value_basics",
    title: "Future value calculations",
    objective:
      "Show how money grows over time with interest. Introduce the future value formula and demonstrate simple interest vs compound interest calculations.",
    concept_tags: ["future_value", "simple_interest", "compound_interest"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "discount_rates",
    title: "Understanding discount rates",
    objective:
      "Explain what discount rates represent: required returns, risk premiums, and opportunity costs. Show how different rates affect present value calculations.",
    concept_tags: ["discount_rate", "required_return", "risk_premium"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "annuities_basics",
    title: "Annuities and regular payments",
    objective:
      "Introduce annuities as series of equal payments. Calculate present and future values of ordinary annuities and annuities due.",
    concept_tags: ["annuities", "regular_payments", "payment_streams"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "perpetuities",
    title: "Perpetuities and infinite streams",
    objective:
      "Explain perpetuities as infinite payment streams. Show the simple formula for perpetuity valuation and real-world examples like preferred dividends.",
    concept_tags: ["perpetuities", "infinite_streams", "valuation"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "real_vs_nominal",
    title: "Real vs nominal rates",
    objective:
      "Distinguish between nominal and real interest rates. Explain how inflation affects purchasing power and the Fisher equation relationship.",
    concept_tags: ["real_rates", "nominal_rates", "inflation", "fisher_equation"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "medium",
  },
  {
    id: "tvm_applications",
    title: "Time value applications",
    objective:
      "Apply time value concepts to real decisions: loan payments, investment choices, retirement planning, and comparing financial alternatives.",
    concept_tags: ["loan_payments", "investment_decisions", "retirement_planning"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "hard",
  },
];

export default timeValueMoneyProgression;
