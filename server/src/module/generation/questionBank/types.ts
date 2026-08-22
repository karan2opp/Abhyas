export interface CuratedQuestion {
  questionId: string;
  subject: string;
  topic: string;
  subtopic: string;
  type: "mcq" | "descriptive";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  marks: number;
  options?: string[];
  correctOption?: string;
  rubric?: {
    categories: { name: string; weight: number; key_points: string[] }[];
  };
  source: string;
}

export interface CuratedQuestionFrontmatter {
  subject?: string;
  topic?: string;
  subtopic?: string;
  type?: string;
  difficulty?: string;
  marks?: number;
  rubric?: { name: string; weight: number; key_points: string[] }[];
}
