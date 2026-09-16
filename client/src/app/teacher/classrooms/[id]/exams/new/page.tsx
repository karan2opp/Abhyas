"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, Loader2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { createExamService, updateExamService } from "../../../../exams/exam.service";
import { getMyClassroomsService } from "../../../classroom.service";
import { listGroupsService } from "../../../group.service";
import { QuestionBuilder, AiExamGeneratorForm, AiGeneratorStage, WorkspaceParts } from "./QuestionBuilder";
import { PyqFlow, PyqStage } from "./PyqFlow";
import { SourceFlow } from "./SourceFlow";
import { ExamDetailsForm, ExamDetails, EMPTY_EXAM_DETAILS, scheduledDurationMinutes } from "./ExamDetailsForm";
import { WorkspaceShell, WizardHeader, ModePicker, StatTile, MODES, STEPS, CreationMode } from "./workspace";
import QuestionReviewChat from "@/components/QuestionReviewChat";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

type Phase = "details" | "build" | "review" | "publish";

const AI_STAGE_STEP: Record<AiGeneratorStage, number> = { config: 1, intent: 2, blueprint: 3, generating: 3 };
const PYQ_STAGE_STEP: Record<PyqStage, number> = { papers: 1, settings: 2, preview: 3 };

const primaryButton = "bg-purple-600 hover:bg-purple-700 text-white h-10 px-6 font-bold text-sm rounded-xl shadow-lg shadow-purple-950/40";
const ghostButton = "text-gray-400 hover:text-white h-10 px-4 text-sm font-semibold";

function formatDateTime(value: string) {
  return value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

function NewExamBuilderContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const classroomId = params.id as string;
  const groupIdParam = searchParams.get("groupId") || "";
  const router = useRouter();
  const { resetStore } = useExamBuilderStore();
  const [isMounted, setIsMounted] = useState(false);

  const [mode, setMode] = useState<CreationMode | null>(null);
  const [phase, setPhase] = useState<Phase>("details");
  const [buildStep, setBuildStep] = useState(1);

  const [examId, setExamId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [details, setDetails] = useState<ExamDetails>(EMPTY_EXAM_DETAILS);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [publishTime, setPublishTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // The builder store is persisted per tab; a leftover AI-mode flag would open the wrong view inside the question list.
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
      .then((res) => {
        const list = res.data || [];
        setGroups(list);
        if (groupIdParam && list.some((g: any) => g.id === groupIdParam)) {
          setDetails((prev) => ({ ...prev, groupId: groupIdParam }));
        }
      })
      .catch(() => toast.error("Failed to load groups"));
  }, [classroomId]);

  const questionCount = useMemo(() => sections.reduce((n, s) => n + (s.questions?.length || 0), 0), [sections]);
  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + (s.questions || []).reduce((m: number, q: any) => m + (Number(q.marks) || 0), 0), 0),
    [sections]
  );

  const handleDetailsNext = async () => {
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
      totalMarks: 0,
      requireFeedback: details.requireFeedback,
      allowCoTeacherEdit: details.allowCoTeacherEdit,
      classroomId,
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
      if (!examId) {
        const data = await createExamService(payload);
        const newExam = data.data || data;
        setExamId(newExam.id || newExam._id);
        if (newExam.joinCode) setJoinCode(newExam.joinCode);
      } else {
        await updateExamService(examId, payload);
      }
      setPhase("build");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save exam details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeModeDuringBuild = () => {
    if (!confirm("Switching mode discards what you've set up in this mode so far. Continue?")) return;
    setMode(null);
    setPhase("details");
  };

  const handleSaveExam = async (status: "DRAFT" | "PUBLISHED") => {
    if (!examId) return;
    if (status === "PUBLISHED" && publishTime && details.startTime && new Date(publishTime) >= new Date(details.startTime)) {
      toast.error("Publish date and time must be before the exam's start time");
      return;
    }
    setIsSaving(true);
    try {
      await updateExamService(examId, { publishTime: publishTime ? new Date(publishTime).toISOString() : null, status });
      toast.success(status === "PUBLISHED" ? (publishTime ? "Exam scheduled and published!" : "Exam published successfully!") : "Exam saved as draft");
      resetStore();
      router.push(`/teacher/classrooms/${classroomId}/exams`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to update exam");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isMounted) return null;

  const modeSteps = mode ? STEPS[mode] : [];
  const currentStep =
    phase === "details" ? 0 : phase === "build" ? buildStep : modeSteps.indexOf(phase === "review" ? "Review" : "Publish");
  const header = mode ? (
    <WizardHeader mode={mode} currentStep={currentStep} onChangeMode={phase === "build" ? handleChangeModeDuringBuild : undefined} />
  ) : undefined;

  const detailsShell = () => {
    if (!mode) {
      return (
        <WorkspaceShell
          left={
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-3 px-6">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
                <MousePointerClick className="h-6 w-6 text-orange-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Create a new exam</h2>
              <p className="text-sm text-gray-400 max-w-sm">Choose how you want to build it. The exam details form opens here once you pick a mode.</p>
            </div>
          }
          right={<ModePicker selected={null} onSelect={setMode} />}
        />
      );
    }

    const modeInfo = MODES.find((m) => m.id === mode)!;
    const ModeIcon = modeInfo.icon;
    return (
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
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <ModeIcon className="h-4 w-4 text-orange-400" /> {modeInfo.label}
                </span>
                <button onClick={() => setMode(null)} className="text-xs font-semibold text-gray-400 hover:text-orange-300">
                  Change mode
                </button>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{modeInfo.description}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-2.5">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">What happens next</h3>
              <ol className="space-y-2">
                {STEPS[mode].map((step, i) => (
                  <li key={step} className="flex items-center gap-2.5 text-xs text-gray-300">
                    <span className="h-5 w-5 rounded-full border border-white/15 flex items-center justify-center text-[10px] tabular-nums text-gray-400">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        }
        footer={
          <>
            <span className="text-xs text-gray-500">{examId ? "Draft saved" : "A draft is saved when you continue"}</span>
            <Button onClick={handleDetailsNext} disabled={isSaving} className={primaryButton}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </>
        }
      />
    );
  };

  // The build flow stays mounted while the teacher steps back to the details form, so topics and progress aren't lost.
  const buildShell = (parts: WorkspaceParts) =>
    phase === "details" ? detailsShell() : <WorkspaceShell header={header} left={parts.left} right={parts.right} footer={parts.footer} />;

  let content: React.ReactNode;
  if ((phase === "details" || phase === "build") && examId && mode === "ai") {
    content = (
      <AiExamGeneratorForm
        examId={examId}
        saveStatus={null}
        onBack={() => setPhase("details")}
        onSuccess={() => setPhase("review")}
        renderShell={buildShell}
        onStageChange={(stage) => setBuildStep(AI_STAGE_STEP[stage])}
      />
    );
  } else if ((phase === "details" || phase === "build") && examId && mode === "pyq") {
    content = (
      <PyqFlow
        examId={examId}
        onBack={() => setPhase("details")}
        onSuccess={() => setPhase("review")}
        renderShell={buildShell}
        onStageChange={(stage) => setBuildStep(PYQ_STAGE_STEP[stage])}
      />
    );
  } else if ((phase === "details" || phase === "build") && examId && mode === "source") {
    content = (
      <SourceFlow
        examId={examId}
        onBack={() => setPhase("details")}
        onSuccess={() => setPhase("review")}
        renderShell={buildShell}
        onStepChange={setBuildStep}
      />
    );
  } else if (phase === "details" || phase === "build") {
    content = detailsShell();
  } else if (phase === "review" && examId) {
    content = (
      <WorkspaceShell
        header={header}
        left={<QuestionBuilder examId={examId} sectionsState={{ sections, setSections }} showReviewAgent={false} />}
        right={<QuestionReviewChat examId={examId} onSectionsChange={setSections} />}
        footer={
          <>
            <Button variant="ghost" onClick={() => handleSaveExam("DRAFT")} disabled={isSaving} className={ghostButton}>
              Save as Draft & Exit
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
            <Button variant="ghost" onClick={() => setPhase("review")} className={ghostButton}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSaveExam("DRAFT")}
                disabled={isSaving}
                className="bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 h-10 text-sm font-semibold"
              >
                Save as Draft
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
        <h1 className="text-base font-bold text-white tracking-tight">New Exam</h1>
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

export default function NewExamBuilder() {
  return (
    <Suspense fallback={<div className="p-10 text-white text-center">Loading...</div>}>
      <NewExamBuilderContent />
    </Suspense>
  );
}
