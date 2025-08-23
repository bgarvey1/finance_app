// Shared Tutor Types
// Source of truth for Step, LastEvent, TutorRequest, TutorResponse

export type MCQChoice = {
  id: string; // e.g., "A", "B", ...
  text: string;
};

export type QuestionCore = {
  type: "mcq" | "numeric";
  prompt: string;
  choices?: MCQChoice[]; // required only when type="mcq"
  correct_answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

export type StepPanelOrReteach = {
  type: "panel" | "reteach";
  title: string;
  body_md: string;
  example_md: string;
  concept_tags: string[];
};

export type StepQuestion = {
  type: "question";
  title: string;
  body_md: string;
  concept_tags: string[];
  question: QuestionCore;
};

export type StepSummary = {
  type: "summary";
  title: string;
  body_md: string;
  concept_tags: string[];
};

export type Step = StepPanelOrReteach | StepQuestion | StepSummary;

export type LastEventPanelViewed = {
  type: "panel_viewed";
  payload?: {
    concept_tags?: string[];
  };
};

export type LastEventFeedback = {
  type: "feedback";
  payload: {
    didnt_get_it?: boolean;
    concept_tags?: string[];
  };
};

export type QuizProgress = {
  asked?: number; // non-negative; should increase monotonically
  correct?: number; // non-negative
};

export type LastEventQuestionAnswered = {
  type: "question_answered";
  payload: {
    correct: boolean;
    answer?: string;
    concept_tags?: string[];
    quiz_progress?: QuizProgress;
  };
};

export type LastEventAsk = {
  type: "ask";
  payload: {
    question: string;
  };
};

export type LastEvent =
  | LastEventPanelViewed
  | LastEventFeedback
  | LastEventQuestionAnswered
  | LastEventAsk;

export type TutorRequest = {
  userId?: string;
  lessonSlug: string;
  lastEvent?: LastEvent | null;
  recent_steps?: Array<{
    type: string;
    title?: string;
    concept_tags?: string[];
  }>;
};

export type TutorResponse = {
  step: Step;
  unlock_next?: boolean;
  error?: string;
};

// Optional helpers

export const isQuestionStep = (s: Step): s is StepQuestion => s.type === "question";
export const isPanelOrReteachStep = (s: Step): s is StepPanelOrReteach =>
  s.type === "panel" || s.type === "reteach";
