import api from "@/utils/axios";

export const getOrganisationClassroomsService = async () => {
  const res = await api.get("/classrooms/org");
  return res.data;
};

export const updateClassroomService = async (id: string, data: { name?: string }) => {
  const res = await api.patch(`/classrooms/${id}`, data);
  return res.data;
};

export const getClassroomRosterService = async (id: string) => {
  const res = await api.get(`/classrooms/${id}/roster`);
  return res.data;
};

export const getClassroomTeachersService = async (id: string) => {
  const res = await api.get(`/classrooms/${id}/teachers`);
  return res.data;
};

export const addTeacherService = async (id: string, email: string) => {
  const res = await api.post(`/classrooms/${id}/teachers`, { email });
  return res.data;
};

export const removeTeacherService = async (id: string, teacherId: string) => {
  const res = await api.delete(`/classrooms/${id}/teachers/${teacherId}`);
  return res.data;
};

export const regenerateJoinCodeService = async (id: string, data?: { joinCodeExpiresInDays?: number; joinCodeMaxUses?: number }) => {
  const res = await api.post(`/classrooms/${id}/join-code/regenerate`, data || {});
  return res.data;
};

export const revokeJoinCodeService = async (id: string) => {
  const res = await api.post(`/classrooms/${id}/join-code/revoke`);
  return res.data;
};

export const inviteStudentService = async (id: string, email: string) => {
  const res = await api.post(`/classrooms/${id}/invite`, { email });
  return res.data;
};
