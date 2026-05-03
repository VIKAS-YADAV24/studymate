export type DifficultWord = { word: string; meaning: string };

export type Summary = {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  revisionBullets: string[];
  difficultWords: DifficultWord[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  summary: Summary | null;
  messages: ChatMessage[];
  createdAt: number;
  /** Mermaid.js flowchart code generated from the note's summary. Persisted so users don't have to regenerate. */
  flowchartCode?: string;
};

export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Quiz = {
  title: string;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
};

export type ReportValueStatus = "normal" | "borderline" | "abnormal";

export type ReportValue = {
  name: string;
  value: string;
  referenceRange: string;
  status: ReportValueStatus;
  plainExplanation: string;
};

export type AbnormalFlag = {
  label: string;
  explanation: string;
};

export type MedicalReport = {
  reportType: string;
  about: string;
  keyFindings: string[];
  values: ReportValue[];
  abnormalFlags: AbnormalFlag[];
  nextSteps: string[];
};

export type RevisionSection = {
  heading: string;
  bullets: string[];
};

export type RevisionDefinition = {
  term: string;
  definition: string;
};

export type Revision = {
  thirtySecond: string[];
  twoMinute: string[];
  fiveMinute: RevisionSection[];
  memoryHooks: string[];
  keywords: string[];
  definitions: RevisionDefinition[];
};

export type RevisionMode = "30s" | "2min" | "5min";
