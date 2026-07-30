import api from "@/utils/axios";

export const listExamsForClassroomService = async (classroomId: string) => {
  const res = await api.get(`/exams/classroom/${classroomId}`);
  return res.data;
};

export const deleteExamService = async (id: string) => {
  const res = await api.delete(`/exams/${id}`);
  return res.data;
};
