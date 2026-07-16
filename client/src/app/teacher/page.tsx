"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, FileText, Users, BarChart, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTeacherOverviewStatsService } from "./exams/exam.service";

export default function TeacherDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getTeacherOverviewStatsService();
        setStats(res.data || res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-10 text-white text-center">Loading overview...</div>;

  const totalExams = stats?.totalExams || 0;
  const totalStudents = stats?.totalStudents || 0;
  const averageScore = stats?.averageScore || 0;
  const recentExams = stats?.recentExams || [];

  return (
    <div className="p-10 flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Overview</h2>
          <p className="text-gray-400 mt-1">Welcome back to your Institutional Portal.</p>
        </div>
        <Button 
          onClick={() => {
            import('@/store/useExamBuilderStore').then(m => m.useExamBuilderStore.getState().resetStore());
            router.push('/teacher/exams/new');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          Create New Exam
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#111520] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Exams</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalExams}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#111520] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card className="bg-[#111520] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Average Score</CardTitle>
            <BarChart className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{averageScore}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Exams</h3>
        {recentExams.length === 0 ? (
          <Card className="bg-[#111520] border-white/5">
            <CardContent className="p-0">
               <div className="p-8 text-center text-gray-500 text-sm">
                  No recent exams found. Click "Create New Exam" to get started.
               </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {recentExams.map((exam: any) => (
              <Card key={exam.id || exam._id} className="bg-[#111520] border-white/5 hover:border-blue-500/30 transition-colors shadow-lg overflow-hidden group">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{exam.title}</h3>
                  </div>
                  
                  <div className="space-y-2 mt-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span>Duration: {exam.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      <span>Total Marks: {exam.totalMarks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-400" />
                      <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-gray-300 uppercase tracking-wider border border-white/5">
                      {exam.joinCode ? `CODE: ${exam.joinCode}` : "DRAFT"}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-transparent border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
                        onClick={() => router.push(`/teacher/exams/${exam.id || exam._id}/results`)}
                      >
                        Results
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-transparent border-white/10 text-blue-400 border-blue-500/30 hover:text-blue-300 hover:bg-blue-500/10"
                        onClick={() => router.push(`/teacher/exams/${exam.id || exam._id}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
