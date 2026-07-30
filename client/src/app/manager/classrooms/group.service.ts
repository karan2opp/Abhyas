import api from "@/utils/axios";

export const listGroupsService = async (classroomId: string) => {
  const res = await api.get(`/groups/${classroomId}`);
  return res.data;
};
