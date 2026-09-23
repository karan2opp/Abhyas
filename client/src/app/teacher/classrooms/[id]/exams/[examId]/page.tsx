"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";

import { getExamByIdService, updateExamService } from "../../../../exams/exam.service";
import { getMyClassroomsService } from "../../../classroom.service";
import { listGroupsService } from "../../../group.service";
import { QuestionBuilder } from "../new/QuestionBuilder";
import { ExamDetailsForm, ExamDetails, EMPTY_EXAM_DETAILS, scheduledDurationMinutes } from "../new/ExamDetailsForm";
import { WorkspaceShell, StatTile } from "../new/workspace";
import QuestionReviewChat from "@/components/QuestionReviewChat";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

type Phase = "details" | "questions" | "publish";

const primaryButton = "bg-purple-600 hover:bg-purple-700 text-white h-10 px-6 font-bold text-sm rounded-xl shadow-lg shadow-purple-950/40";
const ghostButton = "text-gray-400 hover:text-white h-10 px-4 text-sm font-semibold";

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

export default function EditExamBuilder() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const examId = params.examId as string;
  const { resetStore } = useExamBuilderStore();

  const [isMounted, setIsMounted] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [phase, setPhase] = useState<Phase>("details");

  const [details, setDetails] = useState<ExamDetails>(EMPTY_EXAM_DETAILS);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [publishTime, setPublishTime] = useState("");
  const [sections, setSections] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // A leftover AI-mode flag from a previous session would open the wrong
    // view inside the question builder.
    resetStore();
  }, [resetStore]);

  useEffect(() => {
    getMyClassroomsService()
      .then((res) => setClassrooms((res.data || []).map((r: any) => r.classroom)))
      .catch(() => toast.error("Failed to load classrooms"));
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    listGroupsService(classroomId)
      .then((res) => setGroups(res.data || []))
      .catch(() => toast.error("Failed to load groups"));
  }, [classroomId]);

  useEffect(() => {
    if (!examId) return;
    getExamByIdService(examId)
      .then((res) => {
        const data = res.data || res;
        const toDatetimeLocal = (value?: string) => {
          if (!value) return "";
          const d = new Date(value);
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };
        setDetails({
          title: data.title || "",
          type: data.type === "ON_DEMAND" ? "ON_DEMAND" : "SCHEDULED",
          duration: data.duration?.toString() || "60",
          startTime: toDatetimeLocal(data.startTime),
          endTime: toDatetimeLocal(data.endTime),
          instructions: data.instructions?.length > 0 ? data.instructions : [""],
          requireFeedback: !!data.requireFeedback,
          allowCoTeacherEdit: !!data.allowCoTeacherEdit,
          groupId: data.groupId || "",
        });
        if (data.joinCode) setJoinCode(data.joinCode);
        setPublishTime(toDatetimeLocal(data.publishTime));
      })
      .catch((err: any) => {
        if (err?.response?.status === 403) {
          setAccessDenied(true);
        } else {
          toast.error("Failed to load exam details");
        }
      })
      .finally(() => setLoadingInitial(false));
  }, [examId]);

  const questionCount = useMemo(() => sections.reduce((n, s) => n + (s.questions?.length || 0), 0), [sections]);
  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + (s.questions || []).reduce((m: number, q: any) => m + (Number(q.marks) || 0), 0), 0),
    [sections]
  );

  const handleSaveDetails = async () => {
    if (!details.title.trim()) {
      toast.error("Please enter an exam title");
      return;
    }
    if (details.type === "SCHEDULED" && (!details.startTime || !details.endTime)) {
      toast.error("Please provide start and end times for scheduled exams");
      return;
    }
    if (details.type === "ON_DEMAND" && !details.duration) {
      toast.error("Please provide a duration for on-demand exams");
      return;
    }

    const payload: any = {
      title: details.title.trim(),
      type: details.type,
      instructions: details.instructions.filter((i) => i.trim() !== ""),
      requireFeedback: details.requireFeedback,
      allowCoTeacherEdit: details.allowCoTeacherEdit,
    };
    if (details.groupId) payload.groupId = details.groupId;
    if (details.type === "SCHEDULED") {
      payload.startTime = new Date(details.startTime).toISOString();
      payload.endTime = new Date(details.endTime).toISOString();
    } else {
      payload.duration = parseInt(details.duration);
      if (details.startTime) payload.startTime = new Date(details.startTime).toISOString();
      if (details.endTime) payload.endTime = new Date(details.endTime).toISOString();
    }

    setIsSaving(true);
    try {
      await updateExamService(examId, payload);
      toast.success("Exam details updated");
      setPhase("questions");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to update exam details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveExam = async (status?: "PUBLISHED") => {
    if (status === "PUBLISHED" && publishTime && details.startTime && new Date(publishTime) >= new Date(details.startTime)) {
      toast.error("Publish date and time must be before the exam's start time");
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = { publishTime: publishTime ? new Date(publishTime).toISOString() : null };
      if (status) payload.status = status;
      await updateExamService(examId, payload);
      toast.success(status ? "Exam published successfully!" : "Changes saved");
      resetStore();
      router.push(`/teacher/classrooms/${classroomId}/exams`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save exam");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingInitial || !isMounted) return <div className="p-10 text-white text-center">Loading exam...</div>;

  if (accessDenied) {
    return (
      <Dialog open onOpenChange={(open) => !open && router.push(`/teacher/classrooms/${classroomId}/exams`)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldAlert className="h-5 w-5" /> No permission to edit
            </DialogTitle>
            <DialogDescription>
              This exam was created by another teacher or manager, and they haven&apos;t enabled co-teacher editing for it. You can&apos;t view or edit its questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => router.push(`/teacher/classrooms/${classroomId}/exams`)} className={primaryButton}>
              Back to exams
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const phases: { id: Phase; label: string }[] = [
    { id: "details", label: "Details" },
    { id: "questions", label: "Questions" },
    { id: "publish", label: "Publish" },
  ];
  const currentIndex = phases.findIndex((p) => p.id === phase);

  const header = (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white">Editing exam</div>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        {phases.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2">
            <button
              onClick={() => setPhase(p.id)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                i === currentIndex
                  ? "border-orange-500/60 bg-orange-500/10 text-orange-300"
                  : i < currentIndex
                  ? "border-white/15 text-gray-300 hover:text-white"
                  : "border-white/10 text-gray-500 hover:text-white"
              }`}
            >
              {p.label}
            </button>
            {i < phases.length - 1 && <span className="text-gray-600">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );

  let content: React.ReactNode;
  if (phase === "details") {
    content = (
      <WorkspaceShell
        header={header}
        left={
          <ExamDetailsForm
            values={details}
            onChange={(patch) => setDetails((prev) => ({ ...prev, ...patch }))}
            classrooms={classrooms}
            selectedClassroomId={classroomId}
            groups={groups}
          />
        }
        right={
          <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Join code</h3>
            <p className="text-sm font-mono text-white">{joinCode || "—"}</p>
          </div>
        }
        footer={
          <>
            <span className="text-xs text-gray-500">Changes here are saved when you continue</span>
            <Button onClick={handleSaveDetails} disabled={isSaving} className={primaryButton}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next: Questions <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </>
        }
      />
    );
  } else if (phase === "questions") {
    content = (
      <WorkspaceShell
        header={header}
        left={<QuestionBuilder examId={examId} sectionsState={{ sections, setSections }} showReviewAgent={false} />}
        right={<QuestionReviewChat examId={examId} onSectionsChange={setSections} />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPhase("details")} className={ghostButton}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Button onClick={() => setPhase("publish")} className={primaryButton}>
              Next: Publish Settings <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        }
      />
    );
  } else {
    content = (
      <WorkspaceShell
        header={header}
        left={
          <div className="space-y-5 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-400" /> Publish settings
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Choose when students can see this exam.</p>
            </div>
            <div className="space-y-2 p-5 bg-[#0f0f11] border border-white/10 rounded-xl">
              <label className="text-sm font-semibold text-gray-300">Publish Date & Time</label>
              <p className="text-xs text-gray-500">Students can&apos;t see the exam before this time. Leave blank to publish immediately.</p>
              <Input
                type="datetime-local"
                value={publishTime}
                onChange={(e) => setPublishTime(e.target.value)}
                className="bg-[#14151f] border-white/15 text-white h-11 rounded-lg w-full [color-scheme:dark]"
              />
            </div>
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-2">
              <h3 className="text-sm font-bold text-white truncate">{details.title}</h3>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-200">{details.type === "SCHEDULED" ? "Scheduled" : "On-demand"}</dd>
                <dt className="text-gray-500">Starts</dt>
                <dd className="text-gray-200">{formatDateTime(details.startTime)}</dd>
                <dt className="text-gray-500">Ends</dt>
                <dd className="text-gray-200">{formatDateTime(details.endTime)}</dd>
                <dt className="text-gray-500">Duration</dt>
                <dd className="text-gray-200">
                  {details.type === "SCHEDULED" ? scheduledDurationMinutes(details.startTime, details.endTime) : details.duration} min
                </dd>
                {joinCode && (
                  <>
                    <dt className="text-gray-500">Join code</dt>
                    <dd className="text-gray-200 font-mono">{joinCode}</dd>
                  </>
                )}
              </dl>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile label="Sections" value={sections.length} />
              <StatTile label="Questions" value={questionCount} tone="text-purple-300" />
            </div>
            <StatTile label="Total marks" value={totalMarks} tone="text-emerald-400" />
          </div>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPhase("questions")} className={ghostButton}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSaveExam()}
                disabled={isSaving}
                className="bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 h-10 text-sm font-semibold"
              >
                Save
              </Button>
              <Button onClick={() => handleSaveExam("PUBLISHED")} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 font-bold text-sm rounded-xl">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : publishTime ? "Schedule & Publish" : "Publish Exam"}
              </Button>
            </div>
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push(`/teacher/classrooms/${classroomId}/exams`)}
          className="flex items-center justify-center p-2 rounded-lg bg-[#18181b] border border-white/10 hover:bg-white/10 hover:text-white transition-colors text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-bold text-white tracking-tight">Edit Exam</h1>
        {joinCode && (
          <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border border-white/10">
            Join code: {joinCode}
          </span>
        )}
      </div>
      <div className="flex-1 lg:min-h-0">{content}</div>
    </div>
  );
}
