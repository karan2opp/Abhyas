import api from "@/utils/axios";

// One page of the classrooms a student is in: `data` in the reply is { data, total, page, limit, hasMore }.
export const getMyClassroomsService = async (page = 1, limit = 9) => {
  const res = await api.get("/classrooms/me", { params: { page, limit } });
  return res.data;
};

export const joinClassroomService = async (joinCode: string) => {
  const res = await api.post("/classrooms/join", { joinCode });
  return res.data;
};
