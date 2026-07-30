"use client";

import React, { createContext, useContext } from "react";

export interface Classroom {
  id: string;
  name: string;
  joinCode: string;
  joinCodeExpiresAt: string;
  joinCodeMaxUses: number;
  joinCodeUseCount: number;
  joinCodeRevoked: boolean;
}

interface ClassroomContextValue {
  classroom: Classroom;
  reloadClassroom: () => Promise<void>;
}

export const ClassroomContext = createContext<ClassroomContextValue | null>(null);

export const useClassroom = () => {
  const ctx = useContext(ClassroomContext);
  if (!ctx) throw new Error("useClassroom must be used within the classroom section layout");
  return ctx;
};
