"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { School, Users, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { getOrganisationClassroomsService } from "./classrooms/classroom.service";
import { getMyOrganisationTeachersService } from "./manager.service";

export default function ManagerDashboardPage() {
  const user = useAuthStore(state => state.user);
  const [classroomCount, setClassroomCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [classroomsRes, teachersRes] = await Promise.all([
          getOrganisationClassroomsService(),
          getMyOrganisationTeachersService(),
        ]);
        setClassroomCount((classroomsRes.data || []).length);
        setTeacherCount((teachersRes.data || []).length);
      } catch {
        toast.error("Failed to load overview");
      }
    })();
  }, []);

  return (
    <div className="p-10">
      <h2 className="text-3xl font-bold text-white tracking-tight">Welcome, {user?.name}</h2>
      <p className="text-gray-400 mt-1">Overview of your organisation.</p>

      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        <Link href="/manager/classrooms">
          <Card className="bg-[#0f0f11] border-white/5 hover:bg-[#18181b] hover:border-white/10 transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#1652F0]/20 text-[#1652F0] rounded-lg flex items-center justify-center border border-[#1652F0]/20">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{classroomCount ?? "..."}</p>
                  <p className="text-sm text-gray-400">Classrooms</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/teachers">
          <Card className="bg-[#0f0f11] border-white/5 hover:bg-[#18181b] hover:border-white/10 transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-[#18181b]merald-600/20 text-emerald-400 rounded-lg flex items-center justify-center border border-emerald-500/20">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{teacherCount ?? "..."}</p>
                  <p className="text-sm text-gray-400">Teachers</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
