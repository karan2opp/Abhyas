export interface CuratedQuestion {
  questionId: string;
  topic: string;
  subtopic: string;
  type: "mcq" | "descriptive";
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
  topic?: string;
  subtopic?: string;
  type?: string;
  marks?: number;
  rubric?: { name: string; weight: number; key_points: string[] }[];
}
