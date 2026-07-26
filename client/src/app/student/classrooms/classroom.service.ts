import api from "@/utils/axios";

export const getMyClassroomsService = async () => {
  const res = await api.get("/classrooms/me");
  return res.data;
};

export const joinClassroomService = async (joinCode: string) => {
  const res = await api.post("/classrooms/join", { joinCode });
  return res.data;
};
