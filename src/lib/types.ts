export type Module = {
  id: number;
  slug: string;
  title: string;
  description: string;
  sort_order: number | null;
  created_at: string;
};

export type Lesson = {
  id: number;
  module_id: number;
  slug: string;
  title: string;
  content_md: string;
  sort_order: number | null;
  created_at: string;
  // Optional denormalized fields when joined
  module?: Module;
};

export type MCQChoice = {
  id: string; // e.g., "A", "B", "C", "D"
  text: string;
};

export type Question = {
  id: number;
  lesson_id: number;
  type: "mcq" | "numeric";
  prompt: string;
  choices: MCQChoice[] | null;
  correct_answer: string;
  explanation: string | null;
  sort_order: number | null;
  created_at: string;
};
