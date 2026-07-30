import api from "@/utils/axios";

// ------------- CLASSROOMS -------------
export const createClassroomService = async (data: { name: string; joinCodeExpiresInDays?: number; joinCodeMaxUses?: number }) => {
  const res = await api.post("/classrooms", data);
  return res.data;
};

export const getMyClassroomsService = async (search?: string) => {
  const res = await api.get("/classrooms", { params: { search } });
  return res.data;
};

export const updateClassroomService = async (id: string, data: { name?: string }) => {
  const res = await api.patch(`/classrooms/${id}`, data);
  return res.data;
};

export const deleteClassroomService = async (id: string) => {
  const res = await api.delete(`/classrooms/${id}`);
  return res.data;
};

// ------------- ROSTER / TEACHERS -------------
export const getClassroomRosterService = async (id: string, search?: string) => {
  const res = await api.get(`/classrooms/${id}/roster`, { params: { search } });
  return res.data;
};

export const getClassroomTeachersService = async (id: string, search?: string) => {
  const res = await api.get(`/classrooms/${id}/teachers`, { params: { search } });
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

// ------------- JOIN CODE -------------
export const regenerateJoinCodeService = async (id: string, data?: { joinCodeExpiresInDays?: number; joinCodeMaxUses?: number }) => {
  const res = await api.post(`/classrooms/${id}/join-code/regenerate`, data || {});
  return res.data;
};

export const revokeJoinCodeService = async (id: string) => {
  const res = await api.post(`/classrooms/${id}/join-code/revoke`);
  return res.data;
};

// ------------- STUDENT INVITE -------------
export const inviteStudentService = async (id: string, email: string) => {
  const res = await api.post(`/classrooms/${id}/invite`, { email });
  return res.data;
};
