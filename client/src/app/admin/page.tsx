"use client";

import React, { useEffect, useState } from "react";
import { Users, Search, Trash2, UserPlus, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getTeachersService, assignTeacherService, revokeTeacherService, searchUserService } from "./admin.service";

export default function AdminDashboardPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchTeachers = async () => {
    try {
      const data = await getTeachersService();
      setTeachers(data.data || data);
    } catch (error) {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;
    try {
      const res = await searchUserService(searchEmail);
      setSearchResult(res.data || res);
      toast.success("User found");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "User not found");
      setSearchResult(null);
    }
  };

  const handleAssignTeacher = async () => {
    if (!searchResult) return;
    setIsAssigning(true);
    try {
      await assignTeacherService(searchResult.email);
      toast.success(`${searchResult.name} is now a teacher`);
      setSearchResult(null);
      setSearchEmail("");
      fetchTeachers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign teacher role");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRevokeTeacher = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke teacher access for ${email}?`)) return;
    try {
      await revokeTeacherService(email);
      toast.success(`Teacher role revoked for ${email}`);
      fetchTeachers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to revoke role");
    }
  };

  if (loading) return <div className="p-10 text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar p-10">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Manage Teachers</h2>
        <p className="text-gray-400 mt-1">Assign or revoke teacher privileges for users.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Teacher List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#111520]/80 border-white/5 shadow-2xl backdrop-blur-xl rounded-xl">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Current Teachers ({teachers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {teachers.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No teachers found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-[#0b0f19]/50 text-gray-400 font-semibold border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {teachers.map((teacher) => (
                        <tr key={teacher.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">{teacher.name}</td>
                          <td className="px-6 py-4 text-gray-400">{teacher.email}</td>
                          <td className="px-6 py-4 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleRevokeTeacher(teacher.email)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Snatch Role
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Assign Teacher */}
        <div className="space-y-6">
          <Card className="bg-[#111520]/80 border-white/5 shadow-2xl backdrop-blur-xl rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-400" />
                Assign Teacher
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSearchUser} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300">Search User by Email</label>
                  <div className="flex gap-2">
                    <Input 
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="user@example.com" 
                      className="bg-[#0b0f19] border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-blue-500/50 flex-1"
                    />
                    <Button type="submit" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>

              {searchResult && (
                <div className="p-4 rounded-lg bg-[#0b0f19] border border-white/10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                      {searchResult.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{searchResult.name}</p>
                      <p className="text-xs text-gray-400">{searchResult.email}</p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-white/5">
                    {searchResult.role === "teacher" ? (
                      <p className="text-sm text-yellow-400 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" /> Already a teacher
                      </p>
                    ) : searchResult.role === "admin" || searchResult.role === "superadmin" ? (
                      <p className="text-sm text-red-400 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" /> Cannot assign teacher to an admin
                      </p>
                    ) : (
                      <Button 
                        onClick={handleAssignTeacher}
                        disabled={isAssigning}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                      >
                        {isAssigning ? "Assigning..." : "Make Teacher"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
