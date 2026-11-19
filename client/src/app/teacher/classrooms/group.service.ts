import api from "@/utils/axios";

export const createGroupService = async (data: { name: string; classroomId: string }) => {
  const res = await api.post("/groups", data);
  return res.data;
};

export const listGroupsService = async (classroomId: string) => {
  const res = await api.get(`/groups/${classroomId}`);
  return res.data;
};

export const updateGroupService = async (id: string, data: { name?: string }) => {
  const res = await api.patch(`/groups/${id}`, data);
  return res.data;
};

export const deleteGroupService = async (id: string) => {
  const res = await api.delete(`/groups/${id}`);
  return res.data;
};

// One page of the group's students: `data` in the reply is { data, total, page, limit, hasMore }.
export const getGroupMembersService = async (id: string, search?: string, page = 1, limit = 10) => {
  const res = await api.get(`/groups/${id}/students`, { params: { search, page, limit } });
  return res.data;
};

export const addStudentToGroupService = async (id: string, studentId: string) => {
  const res = await api.post(`/groups/${id}/students`, { studentId });
  return res.data;
};

export const removeStudentFromGroupService = async (id: string, studentId: string) => {
  const res = await api.delete(`/groups/${id}/students/${studentId}`);
  return res.data;
};
