import type { Topic } from "./history-of-money";

export const compoundingInterestProgression: Topic[] = [
  {
    id: "compound_vs_simple",
    title: "Compound vs simple interest",
    objective:
      "Compare simple interest (linear growth) with compound interest (exponential growth). Show how earning interest on interest accelerates wealth building.",
    concept_tags: ["compound_interest", "simple_interest", "exponential_growth"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "compounding_frequency",
    title: "Frequency of compounding",
    objective:
      "Explain how compounding frequency affects returns: annual, semi-annual, quarterly, monthly, daily, and continuous compounding.",
    concept_tags: ["compounding_frequency", "effective_rate", "continuous_compounding"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "rule_of_72",
    title: "The Rule of 72",
    objective:
      "Introduce the Rule of 72 as a quick way to estimate doubling time. Show how to use it for investment planning and understanding growth rates.",
    concept_tags: ["rule_of_72", "doubling_time", "growth_estimation"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "easy",
  },
  {
    id: "time_horizon_impact",
    title: "Time horizon and wealth building",
    objective:
      "Demonstrate how longer time horizons dramatically amplify compounding effects. Show the importance of starting early for retirement and long-term goals.",
    concept_tags: ["time_horizon", "early_investing", "wealth_building"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "regular_contributions",
    title: "Regular contributions and dollar-cost averaging",
    objective:
      "Show how regular contributions to investments benefit from compounding. Explain dollar-cost averaging and the power of consistent investing habits.",
    concept_tags: ["regular_contributions", "dollar_cost_averaging", "consistent_investing"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "inflation_impact",
    title: "Inflation's effect on compounding",
    objective:
      "Explain how inflation erodes purchasing power over time. Show the importance of earning returns above inflation to build real wealth.",
    concept_tags: ["inflation_impact", "real_returns", "purchasing_power"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "medium",
  },
  {
    id: "compound_debt_danger",
    title: "The dark side: compound debt",
    objective:
      "Show how compound interest works against borrowers. Explain credit card debt, minimum payments, and why high-interest debt should be prioritized.",
    concept_tags: ["compound_debt", "credit_card_debt", "debt_prioritization"],
    preferred_question_types: ["numeric", "mcq"],
    difficulty_hint: "hard",
  },
  {
    id: "investment_strategies",
    title: "Compounding-focused investment strategies",
    objective:
      "Discuss investment approaches that maximize compounding: reinvesting dividends, tax-advantaged accounts, and long-term buy-and-hold strategies.",
    concept_tags: ["dividend_reinvestment", "tax_advantaged_accounts", "buy_and_hold"],
    preferred_question_types: ["mcq", "numeric"],
    difficulty_hint: "hard",
  },
];

export default compoundingInterestProgression;
