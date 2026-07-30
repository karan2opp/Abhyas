import api from "@/utils/axios";

export const getMyGroupsService = async (classroomId: string) => {
  const res = await api.get("/groups/me", { params: { classroomId } });
  return res.data;
};
