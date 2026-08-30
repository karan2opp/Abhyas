import api from "@/utils/axios";

export interface BankQuestionInput {
  topic: string;
  subtopic?: string;
  type: "mcq" | "descriptive";
  question: string;
  marks: number;
  options?: string[];
  correctOption?: string;
}

export interface BankQuestion {
  questionId: string;
  topic: string;
  subtopic: string;
  type: string;
  question: string;
  marks: number;
  options?: string[];
  correct_option?: string;
  rubric?: any;
  source?: string;
}

export const addQuestionToBankService = async (
  question: BankQuestionInput
): Promise<{ indexed: number; skipped: number }> => {
  const res = await api.post("/question-bank", question);
  return res.data.data || { indexed: 0, skipped: 0 };
};

export const getQuestionBankService = async (): Promise<BankQuestion[]> => {
  const res = await api.get("/question-bank");
  return res.data.data || [];
};

export const deleteQuestionFromBankService = async (questionId: string): Promise<void> => {
  await api.delete(`/question-bank/${questionId}`);
};

export const uploadQuestionBankFileService = async (
  file: File
): Promise<{ indexed: number; skipped: number; errors: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/question-bank/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.data || { indexed: 0, skipped: 0, errors: 0 };
};