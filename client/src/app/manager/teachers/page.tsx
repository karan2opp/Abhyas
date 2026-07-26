"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getMyOrganisationTeachersService,
  assignTeacherToMyOrganisationService,
  removeTeacherFromMyOrganisationService,
} from "../manager.service";

interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ManagerTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await getMyOrganisationTeachersService();
      setTeachers(res.data || []);
    } catch (err) {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleAssign = async () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setAssigning(true);
    try {
      await assignTeacherToMyOrganisationService(email.trim());
      toast.success(`${email} added to your organisation`);
      setEmail("");
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign teacher");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string, teacherEmail: string) => {
    if (!confirm(`Remove ${teacherEmail} from your organisation?`)) return;
    try {
      await removeTeacherFromMyOrganisationService(userId);
      toast.success("Teacher removed");
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove teacher");
    }
  };

  if (loading) return <div className="p-10 text-white text-center">Loading teachers...</div>;

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Teachers</h2>
        <p className="text-gray-400 mt-1">Teachers who belong to your organisation.</p>
      </div>

      <Card className="bg-[#111520] border-white/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Add a Teacher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-3">
            The user must already have a teacher account (registered with the teacher role). This links them to your organisation.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="teacher@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAssign()}
              className="flex-1 bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm"
            />
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={handleAssign} disabled={assigning}>
              {assigning ? "Adding..." : "Add Teacher"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold text-white mb-3">Current Teachers ({teachers.length})</h3>
      {teachers.length === 0 ? (
        <Card className="bg-[#111520]/50 border-white/5 py-10 text-center">
          <CardContent>
            <Users className="h-8 w-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No teachers in your organisation yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl">
              <div>
                <p className="text-white font-semibold text-sm">{t.name}</p>
                <p className="text-gray-500 text-xs">{t.email}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => handleRemove(t.id, t.email)}
                title="Remove teacher"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
