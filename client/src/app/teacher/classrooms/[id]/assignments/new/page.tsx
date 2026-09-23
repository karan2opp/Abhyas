"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, Loader2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { createAssignmentService, createQuestionService } from "../../../../assignments/assignment.service";
import { createExamService, updateExamService } from "../../../../exams/exam.service";
import { getMyClassroomsService } from "../../../classroom.service";
import { listGroupsService } from "../../../group.service";
import { AssignmentDetailsForm, AssignmentDetails, EMPTY_ASSIGNMENT_DETAILS } from "./AssignmentDetailsForm";
import { QuestionBuilder, AiExamGeneratorForm, AiGeneratorStage, WorkspaceParts } from "../../exams/new/QuestionBuilder";
import { PyqFlow, PyqStage } from "../../exams/new/PyqFlow";
import { SourceFlow } from "../../exams/new/SourceFlow";
import { WorkspaceShell, WizardHeader, ModePicker, StatTile, MODES, STEPS, CreationMode } from "../../exams/new/workspace";
import QuestionReviewChat from "@/components/QuestionReviewChat";
import { useExamBuilderStore } from "@/store/useExamBuilderStore";

type Phase = "details" | "build" | "review" | "publish";

const AI_STAGE_STEP: Record<AiGeneratorStage, number> = { config: 1, intent: 2, blueprint: 3, generating: 3 };
const PYQ_STAGE_STEP: Record<PyqStage, number> = { papers: 1, settings: 2, preview: 3 };

const primaryButton = "bg-orange-600 hover:bg-orange-700 text-white h-10 px-6 font-bold text-sm rounded-xl shadow-lg shadow-orange-950/40";
const ghostButton = "text-gray-400 hover:text-white h-10 px-4 text-sm font-semibold";

function NewAssignmentBuilderContent() {
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

  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [details, setDetails] = useState<AssignmentDetails>(EMPTY_ASSIGNMENT_DETAILS);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
  }, [classroomId, groupIdParam]);

  const questionCount = useMemo(() => sections.reduce((n, s) => n + (s.questions?.length || 0), 0), [sections]);
  const totalMarks = useMemo(
    () => sections.reduce((sum, s) => sum + (s.questions || []).reduce((m: number, q: any) => m + (Number(q.marks) || 0), 0), 0),
    [sections]
  );

  const handleDetailsNext = async () => {
    if (!details.title.trim()) {
      toast.error("Please enter an assignment title");
      return;
    }

    setIsSaving(true);
    try {
      if (!assignmentId) {
        const assignPayload: any = {
          title: details.title.trim(),
          instructions: details.instructions.filter((i) => i.trim() !== "").join("\n"),
          classroomId,
          totalMarks: 0,
        };
        if (details.groupId) assignPayload.groupId = details.groupId;
        if (details.startDate) assignPayload.startDate = new Date(details.startDate).toISOString();
        if (details.dueDate) assignPayload.dueDate = new Date(details.dueDate).toISOString();

        const data = await createAssignmentService(assignPayload);
        const newAssignment = data.data || data;
        setAssignmentId(newAssignment.id || newAssignment._id);

        const isScheduled = !!(details.startDate && details.dueDate && new Date(details.dueDate) > new Date(details.startDate));
        const examPayload: any = {
          title: details.title.trim(),
          type: isScheduled ? "SCHEDULED" : "ON_DEMAND",
          duration: 60,
          instructions: details.instructions.filter((i) => i.trim() !== ""),
          totalMarks: 0,
          classroomId,
        };
        if (details.groupId) examPayload.groupId = details.groupId;
        if (isScheduled) {
          examPayload.startTime = new Date(details.startDate).toISOString();
          examPayload.endTime = new Date(details.dueDate).toISOString();
        }
        const examData = await createExamService(examPayload);
        const newExam = examData.data || examData;
        setExamId(newExam.id || newExam._id);
      }
      setPhase("build");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save assignment details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeModeDuringBuild = () => {
    if (!confirm("Switching mode discards what you've set up in this mode so far. Continue?")) return;
    setMode(null);
    setPhase("details");
  };

  const handleSaveAssignment = async () => {
    if (!assignmentId) return;
    setIsSaving(true);
    try {
      // Sync generated questions from sections tree to assignment questions
      const MCQ_LETTERS = ["A", "B", "C", "D"];
      let importedCount = 0;
      for (const section of sections) {
        const qList = section.questions || [];
        for (const q of qList) {
          const type = q.type === "mcq" || q.questionType === "mcq" || q.options?.length ? "mcq" : "descriptive";
          const rawOpts = q.options || [];
          const options = type === "mcq" && rawOpts.length ? rawOpts.map((opt: any, idx: number) => ({
            value: typeof opt === "string" ? opt : opt.text || opt.value || "",
            isCorrect: opt.isCorrect ?? (MCQ_LETTERS[idx] === q.correct_option || idx === 0),
          })) : undefined;

          await createQuestionService({
            assignmentId,
            type,
            description: q.question_text || q.description || q.stem || "Question",
            marks: Number(q.marks) || 5,
            modelAnswer: q.modelAnswer || q.model_answer || undefined,
            options,
          });
          importedCount++;
        }
      }

      toast.success(importedCount > 0 ? `Assignment published with ${importedCount} question(s)!` : "Assignment saved!");
      resetStore();
      router.push(`/teacher/classrooms/${classroomId}/assignments`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Failed to save assignment questions");
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
              <h2 className="text-lg font-bold text-white">Create a new assignment</h2>
              <p className="text-sm text-gray-400 max-w-sm">Choose how you want to build it. The assignment details form opens here once you pick a mode.</p>
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
          <AssignmentDetailsForm
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
            <span className="text-xs text-gray-500">{assignmentId ? "Draft saved" : "A draft is saved when you continue"}</span>
            <Button onClick={handleDetailsNext} disabled={isSaving} className={primaryButton}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
          </>
        }
      />
    );
  };

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
            <Button variant="ghost" onClick={handleSaveAssignment} disabled={isSaving} className={ghostButton}>
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
                <Bell className="h-5 w-5 text-purple-400" /> Publish Settings
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Review dates and publish options for this assignment.</p>
            </div>
            <div className="space-y-3 p-5 bg-[#0f0f11] border border-white/10 rounded-xl">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Assignment Title</span>
                <span className="text-white font-bold">{details.title}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Unlock / Start Date</span>
                <span className="text-white font-mono">{details.startDate || "Immediate"}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Due Date / Deadline</span>
                <span className="text-white font-mono">{details.dueDate || "No deadline"}</span>
              </div>
            </div>
          </div>
        }
        right={
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0f0f11] p-4 space-y-2">
              <h3 className="text-sm font-bold text-white truncate">{details.title}</h3>
              <p className="text-xs text-gray-400">Assignment ready for publish.</p>
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
            <Button onClick={handleSaveAssignment} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white h-10 px-6 font-bold text-sm rounded-xl">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Assignment"}
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-base font-bold text-white tracking-tight">New Assignment</h1>
      </div>
      <div className="flex-1 lg:min-h-0">{content}</div>
    </div>
  );
}

export default function NewAssignmentBuilder() {
  return (
    <Suspense fallback={<div className="p-10 text-white text-center">Loading...</div>}>
      <NewAssignmentBuilderContent />
    </Suspense>
  );
}
