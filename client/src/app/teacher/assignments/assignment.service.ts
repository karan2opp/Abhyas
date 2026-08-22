import api from "@/utils/axios";

// ------------- SERIES -------------
export const createSeriesService = async (data: { title: string; type?: "weekly" | "custom"; classroomId: string; groupId?: string }) => {
  const res = await api.post("/assignments/series", data);
  return res.data;
};

export const listSeriesForClassroomService = async (classroomId: string) => {
  const res = await api.get(`/assignments/series/classroom/${classroomId}`);
  return res.data;
};

export const updateSeriesService = async (id: string, data: { title: string }) => {
  const res = await api.patch(`/assignments/series/${id}`, data);
  return res.data;
};

export const deleteSeriesService = async (id: string) => {
  const res = await api.delete(`/assignments/series/${id}`);
  return res.data;
};

// ------------- ASSIGNMENTS -------------
export const createAssignmentService = async (data: {
  title: string;
  instructions?: string;
  classroomId: string;
  groupId?: string;
  totalMarks: number;
  startDate?: string;
  dueDate?: string;
  seriesId?: string;
  dayGap?: number;
}) => {
  const res = await api.post("/assignments", data);
  return res.data;
};

export const listAssignmentsForClassroomService = async (
  classroomId: string,
  params?: { standaloneOnly?: boolean; groupId?: string; search?: string; status?: "upcoming" | "live" | "closed"; page?: number; limit?: number }
) => {
  const res = await api.get(`/assignments/classroom/${classroomId}`, { params });
  return res.data;
};

export const getAssignmentByIdService = async (id: string) => {
  const res = await api.get(`/assignments/${id}`);
  return res.data;
};

export const updateAssignmentService = async (id: string, data: any) => {
  const res = await api.patch(`/assignments/${id}`, data);
  return res.data;
};

export const extendAssignmentService = async (
  id: string,
  data: { days: number; mode: "grow" | "shift"; cascade: boolean }
) => {
  const res = await api.post(`/assignments/${id}/extend`, data);
  return res.data;
};

export const deleteAssignmentService = async (id: string) => {
  const res = await api.delete(`/assignments/${id}`);
  return res.data;
};

// ------------- QUESTIONS -------------
export const createQuestionService = async (data: {
  assignmentId: string;
  type: "mcq" | "descriptive";
  description: string;
  marks: number;
  modelAnswer?: string;
  options?: { value: string; isCorrect: boolean }[];
}) => {
  const res = await api.post("/assignments/questions", data);
  return res.data;
};

export const updateQuestionService = async (id: string, data: any) => {
  const res = await api.patch(`/assignments/questions/${id}`, data);
  return res.data;
};

export const deleteQuestionService = async (id: string) => {
  const res = await api.delete(`/assignments/questions/${id}`);
  return res.data;
};

export const getQuestionsService = async (assignmentId: string) => {
  const res = await api.get(`/assignments/${assignmentId}/questions`);
  return res.data;
};

// ------------- SUBMISSIONS / GRADING -------------
export const getSubmissionsForAssignmentService = async (
  assignmentId: string,
  params?: { search?: string; page?: number; limit?: number }
) => {
  const res = await api.get(`/assignments/${assignmentId}/submissions`, { params });
  return res.data;
};

export const getSubmissionByIdService = async (submissionId: string) => {
  const res = await api.get(`/assignments/submissions/${submissionId}`);
  return res.data;
};

export const gradeSubmissionService = async (
  submissionId: string,
  data: { answers: { answerId: string; marksAwarded: number; feedback?: string }[]; overallFeedback?: string }
) => {
  const res = await api.post(`/assignments/submissions/${submissionId}/grade`, data);
  return res.data;
};

export const generateAssignmentService = async (data: {
  subject: string;
  examType?: string;
  difficulty: string;
  questionType: string;
  topics: string[];
  marksPerQuestion: number;
  questionCount: number;
  specialInstructions?: string;
}) => {
  const res = await api.post("/assignments/generate-from-form", data);
  return res.data;
};

export const generateSingleQuestionService = async (data: {
  subject: string;
  difficulty: string;
  questionType: string;
  topic: string;
  marks: number;
  specialInstructions?: string;
}) => {
  const res = await api.post("/assignments/generate-single-question", data);
  return res.data;
};
