"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/controls/button";
import { Card } from "@/components/ui/display/card";
import { getExamByIdService, getSectionsWithDetailsService } from "@/app/teacher/exams/exam.service";
import { TestTakingScreen, flattenExamSections } from "@/components/exam/TestTakingScreen";

const DEFAULT_DURATION_MINUTES = 60;
const NO_ANSWERS = {};
const doNothing = async () => {};

// The screen a student sees, opened for a teacher to try out. It is the student's own screen (TestTakingScreen) with its
// `preview` switch on, so it always looks and behaves the same, on a phone too; this only loads the exam and adds the banner.
export function TeacherExamPreviewModal({
  examId,
  onClose,
}: {
  examId: string;
  onClose: () => void;
}) {
  const [exam, setExam] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, secRes] = await Promise.all([
          getExamByIdService(examId),
          getSectionsWithDetailsService(examId),
        ]);
        setExam(examRes.data || examRes);
        setSections(secRes.data || secRes || []);
      } catch (err) {
        console.error("Failed to load exam preview", err);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchData();
  }, [examId]);

  const questions = useMemo(() => flattenExamSections(sections), [sections]);
  // The clock runs from the moment the preview opens, like a student's does from when they start.
  const endTime = useMemo(() => Date.now() + (exam?.duration || DEFAULT_DURATION_MINUTES) * 60 * 1000, [exam]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] backdrop-blur-md flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Student View Preview...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050505] backdrop-blur-md flex items-center justify-center p-4">
        <Card className="bg-[#0f0f11] border-white/10 p-5 sm:p-8 max-w-md w-full text-center space-y-4 text-white">
          <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto" />
          <h3 className="text-xl font-bold">No Questions Found</h3>
          <p className="text-sm text-gray-400">
            This exam does not have any questions yet. Add questions in the builder first to preview.
          </p>
          <Button onClick={onClose} variant="outline" className="w-full bg-transparent border-white/10 text-white hover:bg-white/5">
            Close Preview
          </Button>
        </Card>
      </div>
    );
  }

  return (
    // h-dvh follows the part of the screen that is actually visible, so a phone's browser bar never covers the bottom buttons.
    <div className="fixed inset-x-0 top-0 z-50 h-dvh bg-[#050505] text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
      <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 text-xs text-amber-300">
        <div className="flex items-center gap-2 font-semibold min-w-0">
          <Eye className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="sm:hidden">STUDENT VIEW PREVIEW</span>
          <span className="hidden sm:inline">STUDENT VIEW PREVIEW — Interactive preview mode for teachers. No submissions will be saved.</span>
        </div>
        <button onClick={onClose} className="shrink-0 hover:text-white font-bold uppercase tracking-wider text-[11px] bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded border border-amber-500/30 transition-colors">
          <span className="sm:hidden">EXIT ✕</span>
          <span className="hidden sm:inline">EXIT PREVIEW ✕</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <TestTakingScreen
          preview
          skipInstructions
          kind="exam"
          title={exam?.title || "Exam Preview"}
          storageId={`preview:${examId}`}
          questions={questions}
          sectionTitles={sections.map((section: any) => section.title)}
          initialAnswers={NO_ANSWERS}
          initialTextAnswers={NO_ANSWERS}
          clock={{ kind: "timer", endTime }}
          instructionStats={[]}
          saveAnswer={doNothing}
          submit={doNothing}
          onSubmitted={onClose}
        />
      </div>
    </div>
  );
}
