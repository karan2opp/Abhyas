import api from "@/utils/axios";

// ------------- EXAMS -------------
export const createExamService = async (data: any) => {
  const res = await api.post("/exams", data);
  return res.data;
};

export const getExamsService = async (params?: { page?: number, limit?: number, search?: string, days?: string }) => {
  const res = await api.get("/exams", { params });
  return res.data;
};

export const getTeacherOverviewStatsService = async () => {
  const res = await api.get("/exams/overview/stats");
  return res.data;
};

export const getExamByIdService = async (id: string) => {
  const res = await api.get(`/exams/${id}`);
  return res.data;
};

export const listExamsForClassroomService = async (classroomId: string, groupId?: string, search?: string) => {
  const res = await api.get(`/exams/classroom/${classroomId}`, { params: { groupId, search } });
  return res.data;
};

export const updateExamService = async (id: string, data: any) => {
  const res = await api.patch(`/exams/${id}`, data);
  return res.data;
};

export const deleteExamService = async (id: string) => {
  const res = await api.delete(`/exams/${id}`);
  return res.data;
};

// ------------- SECTIONS -------------
export const createSectionService = async (data: any) => {
  const res = await api.post("/sections", data);
  return res.data;
};

export const getSectionsByExamService = async (examId: string) => {
  const res = await api.get(`/sections/${examId}`);
  return res.data;
};

export const getSectionsWithDetailsService = async (examId: string) => {
  const res = await api.get(`/sections/${examId}/details`);
  return res.data;
};

export const updateSectionService = async (id: string, data: any) => {
  const res = await api.patch(`/sections/${id}`, data);
  return res.data;
};

export const deleteSectionService = async (id: string) => {
  const res = await api.delete(`/sections/${id}`);
  return res.data;
};

// ------------- QUESTIONS -------------
export const createQuestionService = async (data: any) => {
  const res = await api.post("/questions", data);
  return res.data;
};


export const saveGeneratedExamService = async (data: any) => {
  const res = await api.post("/exams/save-generated", data);
  return res.data;
};

export const generateBlueprintService = async (data: any) => {
  const res = await api.post("/generation/blueprint", data);
  return res.data;
};

export const verifyBlueprintService = async (blueprint: any) => {
  const res = await api.post("/generation/verify-blueprint", blueprint);
  return res.data;
};

export const enqueueGenerateFromBlueprintService = async (blueprint: any) => {
  const res = await api.post("/generation/generate-from-blueprint/async", blueprint);
  return res.data;
};

export const getGenerationJobService = async (jobId: string) => {
  const res = await api.get(`/jobs/${jobId}`);
  return res.data;
};

export const getQuestionsBySectionService = async (sectionId: string) => {
  const res = await api.get(`/questions/section/${sectionId}`);
  return res.data;
};

export const getQuestionByIdService = async (id: string) => {
  const res = await api.get(`/questions/${id}`);
  return res.data;
};

export const updateQuestionService = async (id: string, data: any) => {
  const res = await api.patch(`/questions/${id}`, data);
  return res.data;
};

export const deleteQuestionService = async (id: string) => {
  const res = await api.delete(`/questions/${id}`);
  return res.data;
};

// ------------- OPTIONS -------------
export const createOptionService = async (data: any) => {
  const res = await api.post("/options", data);
  return res.data;
};

export const updateOptionService = async (id: string, data: any) => {
  const res = await api.patch(`/options/${id}`, data);
  return res.data;
};

export const deleteOptionService = async (id: string) => {
  const res = await api.delete(`/options/${id}`);
  return res.data;
};

// ------------- SUBMISSIONS -------------
export const getExamSubmissionsService = async (examId: string) => {
  const res = await api.get(`/submissions/exam/${examId}`);
  return res.data;
};

export const getExamLeaderboardService = async (examId: string) => {
  const res = await api.get(`/submissions/exam/${examId}/leaderboard`);
  return res.data;
};

export const gradeExamSubmissionService = async (
  submissionId: string,
  data: { answers: { answerId: string; marksAwarded: number; feedback?: string }[]; overallFeedback?: string }
) => {
  const res = await api.patch(`/submissions/${submissionId}/grade`, data);
  return res.data;
};

export const evaluateExamSubmissionWithAiService = async (
  submissionId: string,
  data: { mode?: "marks_only" | "marks_and_feedback" }
) => {
  const res = await api.post(`/submissions/${submissionId}/evaluate-ai`, data);
  return res.data;
};
