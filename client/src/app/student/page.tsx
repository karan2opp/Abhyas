"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Clock, FileText, Search, MoreVertical, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { joinExamService, getMySubmissionsService, verifyJoinCodeService } from "./student.service";

export default function StudentDashboard() {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchSubmissions = async (currentPage: number, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const res = await getMySubmissionsService({
        page: currentPage,
        limit: LIMIT,
        search: debouncedSearch,
        days: dateFilter,
      });
      
      const newSubmissions = res.data?.data || [];
      if (isLoadMore) {
        setSubmissions(prev => [...prev, ...newSubmissions]);
      } else {
        setSubmissions(newSubmissions);
      }
      setHasMore(res.data?.hasMore || false);
    } catch (err: any) {
      if (err.response?.status !== 403) {
        console.error(err);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchSubmissions(1, false);
  }, [debouncedSearch, dateFilter]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSubmissions(nextPage, true);
  };

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    try {
      const verifyRes = await verifyJoinCodeService(joinCode.toUpperCase());
      const exam = verifyRes.data || verifyRes;

      if (exam.startTime && new Date() < new Date(exam.startTime)) {
        router.push(`/student/waiting/${joinCode.toUpperCase()}`);
        return;
      }

      const res = await joinExamService(joinCode.toUpperCase());
      toast.success("Joined exam successfully!");
      const submissionId = res.data?.submission?.id || res.submission?.id;
      if (submissionId) {
        router.push(`/student/exams/${submissionId}`);
      } else {
        fetchSubmissions(1, false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join exam");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="p-4 sm:p-10 flex flex-col gap-8 h-full overflow-y-auto custom-scrollbar">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Student Dashboard</h2>
        <p className="text-gray-400 mt-1">Join new exams and view your past performance.</p>
      </header>

      {/* Join Exam Section */}
      <div className="flex gap-4">
        <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
          placeholder="enter the join code"
          className="outline-none bg-gray-900 border border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 p-2.5 px-4 rounded-lg w-full max-w-sm transition-all"
        />
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg transition-all" 
          onClick={handleJoinExam}
          disabled={isJoining}
        >
          {isJoining ? "Joining..." : "Join Exam"}
        </button>
      </div>

      {/* Submissions Section */}
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">My Exams</h3>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search exams..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111520] border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm"
              />
            </div>
            
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#111520] border border-white/10 text-white py-2 px-3 rounded-lg focus:outline-none focus:border-white/20 transition-all text-sm cursor-pointer appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em', paddingRight: '2rem' }}
            >
              <option value="1">Last 1 Day</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading your exams...</div>
        ) : (
          <>
          {submissions.length === 0 ? (
            <Card className="bg-[#111520] border-white/5 py-10 text-center">
              <CardContent>
                <FileText className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No exams found matching your criteria.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {submissions.map((item) => {
                const { submission, exam } = item;
                const isCompleted = submission.status === "submitted" || submission.status === "timeout";
                const examDate = new Date(exam.startTime || submission.createdAt);
                
                const formattedDate = examDate.toLocaleString('en-GB', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(',', '');

                return (
                  <div key={submission.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#111520] border border-white/5 rounded-xl hover:bg-[#1a1f2e] hover:border-white/10 transition-all gap-4">
                    {/* Left Side: Icon & Title & Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 w-full sm:w-auto flex-1">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-[#1652F0]/20 text-[#1652F0] rounded-lg flex items-center justify-center shrink-0 border border-[#1652F0]/20">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="w-[200px] xl:w-[250px] shrink-0">
                          <h3 className="text-[15px] font-bold text-white leading-tight truncate" title={exam.title}>{exam.title}</h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-gray-400 text-[13px] w-[150px] shrink-0">
                        <CalendarIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{formattedDate}</span>
                      </div>
                    </div>
                    
                    {/* Right Side: Badge, Score, Button, Menu */}
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 sm:gap-6">
                      <div className="w-[70px] flex justify-center shrink-0">
                        <div className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-semibold whitespace-nowrap">
                          Exam
                        </div>
                      </div>
                      
                      <div className="text-[14px] font-bold text-emerald-400 w-[80px] text-center whitespace-nowrap shrink-0">
                        {isCompleted ? `${submission.score ?? 0} / ${exam.totalMarks}` : '- / -'}
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3">
                        {isCompleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3 sm:px-4 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 transition-all text-[12px] sm:text-[13px]"
                            onClick={() => router.push(`/student/results/${submission.id}`)}
                          >
                            View Result <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-9 px-3 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white text-[12px] sm:text-[13px] transition-all"
                            onClick={() => router.push(`/student/exams/${submission.id}`)}
                          >
                            Resume <Play className="h-3 w-3 ml-1.5" />
                          </Button>
                        )}
                        <button className="h-9 w-9 flex items-center justify-center text-gray-500 hover:text-white rounded-md hover:bg-white/5 transition-colors">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button 
                    variant="outline" 
                    className="bg-transparent border-white/10 text-white hover:bg-white/5"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
