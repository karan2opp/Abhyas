import api from "@/utils/axios";

export const joinExamService = async (joinCode: string) => {
  const res = await api.post("/submissions/join", { joinCode });
  return res.data;
};

export const verifyJoinCodeService = async (joinCode: string) => {
  const res = await api.get(`/submissions/verify/${joinCode}`);
  return res.data;
};

export const getMySubmissionsService = async (params?: { page?: number, limit?: number, search?: string, days?: string }) => {
  const res = await api.get("/submissions/me", { params });
  return res.data;
};

export const getExamForSubmissionService = async (id: string) => {
  const res = await api.get(`/submissions/${id}/exam`);
  return res.data;
};

export const submitAnswerService = async (data: any) => {
  const res = await api.post("/answers", data);
  return res.data;
};

export const submitExamService = async (id: string) => {
  const res = await api.patch(`/submissions/${id}/submit`);
  return res.data;
};

export const getSubmissionByIdService = async (id: string) => {
  const res = await api.get(`/submissions/${id}`);
  return res.data;
};

export const getExamLeaderboardService = async (examId: string) => {
  const res = await api.get(`/submissions/exam/${examId}/leaderboard`);
  return res.data;
};

export const submitFeedbackService = async (data: any) => {
  const res = await api.post("/feedback", data);
  return res.data;
};
