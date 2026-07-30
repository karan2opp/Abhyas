"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ClassroomIndexRedirect() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  useEffect(() => {
    router.replace(`/teacher/classrooms/${classroomId}/joincode`);
  }, [classroomId, router]);

  return null;
}
