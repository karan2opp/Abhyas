import { eq, and, count, inArray, avg, desc, ilike, gte } from "drizzle-orm";
import db from "../../common/db/index.js";
import { exams, sections, questions, options } from "../../common/db/schema.js";
import { submissions } from "../submissions/submission.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateExamDto, UpdateExamDto } from "./dto/exam.dto.js";

import { run } from "@openai/agents";
import { guardrailAgent } from "../Test-agent-/guardrail/agent.js";
import { SubTopicAgent } from "../Test-agent-/subtopic/agent.js";
import { allocateGenerationTasks } from "./ai/planner/allocation.js";
import { executeGenerationTasks } from "./ai/question/executor.js";
import { validateGenerationResults, validateQuestion } from "./ai/question/validator.js";
import { repairQuestion } from "./ai/question/repair.js";
import { formatExam } from "./ai/question/formatter.js";














// ── Generate Join Code ─────────────────────────────────────────────────────────
const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ── Create Exam ────────────────────────────────────────────────────────────────
const createExam = async (data: CreateExamDto, teacherId: string) => {
    let joinCode = generateJoinCode();

    // ensure join code is unique
    let existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    while (existing.length > 0) {
        joinCode = generateJoinCode();
        existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    }

    // Calculate duration automatically if not provided or if we want to override
    let calculatedDuration = data.duration;
    if (data.type === "SCHEDULED" && data.startTime && data.endTime) {
        calculatedDuration = Math.round((new Date(data.endTime).getTime() - new Date(data.startTime).getTime()) / 60000);
    }

    const [exam] = await db.insert(exams).values({
        ...data,
        duration: calculatedDuration || 60, // fallback to 60 if somehow null
        joinCode,
        createdBy: teacherId,
    }).returning();

    if (!exam) throw ApiError.internal("Failed to create exam");
    return exam;
};

// ── Save Generated Exam ────────────────────────────────────────────────────────
const saveGeneratedExam = async (data: any, teacherId: string) => {
    let joinCode = generateJoinCode();
    let existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    while (existing.length > 0) {
        joinCode = generateJoinCode();
        existing = await db.select().from(exams).where(eq(exams.joinCode, joinCode));
    }

    return await db.transaction(async (tx) => {
        // Create Exam
        const [exam] = await tx.insert(exams).values({
            title: data.title,
            type: data.examType === "flexible" ? "ON_DEMAND" : "SCHEDULED",
            duration: data.duration,
            startTime: data.windowStart ? new Date(data.windowStart) : null,
            endTime: data.windowEnd ? new Date(data.windowEnd) : null,
            totalMarks: data.totalMarks || 100,
            instructions: [],
            joinCode,
            createdBy: teacherId,
        }).returning();

        if (!exam) throw ApiError.internal("Failed to create exam");

        // Create Sections and Questions
        for (const secData of data.sections || []) {
            const [section] = await tx.insert(sections).values({
                examId: exam.id,
                title: secData.title,
            }).returning();

            if (!section) throw ApiError.internal("Failed to create section");

            for (const qData of secData.questions || []) {
                const [question] = await tx.insert(questions).values({
                    sectionId: section.id,
                    type: qData.type,
                    description: qData.description,
                    marks: qData.marks,
                }).returning();

                if (!question) throw ApiError.internal("Failed to create question");

                if (qData.type === "mcq" && qData.options) {
                    await tx.insert(options).values(
                        qData.options.map((opt: any) => ({
                            questionId: question.id,
                            value: opt.value,
                            isCorrect: opt.isCorrect,
                        }))
                    );
                }
            }
        }
        return exam;
    });
};

// ── Get All Exams (teacher sees only his own) ──────────────────────────────────
const getExams = async (teacherId: string, search?: string, days?: string, page: number = 1, limit: number = 10) => {
    const conditions = [eq(exams.createdBy, teacherId)];

    if (search) {
        conditions.push(ilike(exams.title, `%${search}%`));
    }

    if (days && days !== "all") {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        // Use createdAt for filtering newly created exams
        conditions.push(gte(exams.createdAt, cutoffDate));
    }

    const offset = (page - 1) * limit;

    const data = await db.select().from(exams)
        .where(and(...conditions))
        .orderBy(desc(exams.createdAt))
        .limit(limit)
        .offset(offset);

    const [totalCount] = await db.select({ value: count() }).from(exams)
        .where(and(...conditions));
    const total = Number(totalCount?.value) || 0;

    return {
        data,
        total,
        page,
        limit,
        hasMore: offset + data.length < total
    };
};

// ── Get Single Exam ────────────────────────────────────────────────────────────
const getExamById = async (examId: string, teacherId: string) => {
    const [exam] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!exam) throw ApiError.notFound("Exam not found");
    return exam;
};

// ── Update Exam ────────────────────────────────────────────────────────────────
const updateExam = async (examId: string, data: UpdateExamDto, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

    // Calculate new duration if start/end times change
    let calculatedDuration = data.duration;
    const finalType = data.type !== undefined ? data.type : existing.type;
    const finalStartTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const finalEndTime = data.endTime !== undefined ? data.endTime : existing.endTime;

    if (finalType === "SCHEDULED" && finalStartTime && finalEndTime) {
        calculatedDuration = Math.round((new Date(finalEndTime).getTime() - new Date(finalStartTime).getTime()) / 60000);
    }

    const [updated] = await db.update(exams)
        .set({
            ...data,
            duration: calculatedDuration !== undefined ? calculatedDuration : existing.duration,
            updatedAt: new Date()
        })
        .where(eq(exams.id, examId))
        .returning();

    return updated;
};

// ── Delete Exam ────────────────────────────────────────────────────────────────
const deleteExam = async (examId: string, teacherId: string) => {
    const [existing] = await db.select().from(exams).where(
        and(eq(exams.id, examId), eq(exams.createdBy, teacherId))
    );
    if (!existing) throw ApiError.notFound("Exam not found");

    await db.delete(exams).where(eq(exams.id, examId));
};

// ── Get Overview Stats ─────────────────────────────────────────────────────────
const getOverviewStats = async (teacherId: string) => {
    const [examsCount] = await db.select({ value: count() }).from(exams).where(eq(exams.createdBy, teacherId));

    const recentExams = await db.select().from(exams)
        .where(eq(exams.createdBy, teacherId))
        .orderBy(desc(exams.createdAt))
        .limit(5);

    const teacherExams = await db.select({ id: exams.id }).from(exams).where(eq(exams.createdBy, teacherId));
    const examIds = teacherExams.map(e => e.id);

    let totalStudents = 0;
    let averageScore = 0;

    if (examIds.length > 0) {
        const uniqueStudents = await db.selectDistinct({ userId: submissions.userId })
            .from(submissions)
            .where(and(
                inArray(submissions.examId, examIds),
                eq(submissions.status, "submitted")
            ));
        totalStudents = uniqueStudents.length;

        const [avgResult] = await db.select({ value: avg(submissions.score) })
            .from(submissions)
            .where(and(inArray(submissions.examId, examIds), eq(submissions.status, "submitted")));

        averageScore = avgResult?.value ? Math.round(Number(avgResult.value)) : 0;
    }

    return {
        totalExams: Number(examsCount?.value) || 0,
        totalStudents,
        averageScore,
        recentExams
    };
};

// ── Generate Exam From Form ──────────────────────────────────────────────────────

const ORG_CONFIG = {
    orgId: "default",
    examType: "Competitive",
};

const generateExamFromForm = async (data: any, teacherId: string) => {
    // 1. Guardrail
    const allTopics = data.sections.map((s: any) => s.topics).join(", ");
    const guardrailInput: any = [
        { 
            role: "user", 
            content: [{ type: "input_text", text: `Create an exam with title "${data.title}" and subject "${data.subject}". Topics include: ${allTopics}. Special instructions: ${data.specialInstructions || "None"}.` }] 
        }
    ];

    const guardrailResult = await run(guardrailAgent, guardrailInput);
    const guardrailData = guardrailResult.finalOutput as any;

    if (!guardrailData || !guardrailData.isValid) {
        throw new ApiError(400, guardrailData?.reason || "Invalid request according to safety guardrails.");
    }

    // 2. Subtopic Planner
    const allSubtopics = [];
    for (const section of data.sections) {
        const totalSectionQuestions = section.groups.reduce((acc: number, g: any) => acc + (Number(g.numberOfQuestions) || 0), 0);
        const subTopicInput = {
            topic: section.topics,
            subject: data.subject,
            difficulty: data.difficulty,
            specialInstructions: data.specialInstructions,
            sections: [{ name: section.name, questions: [{ count: totalSectionQuestions }] }],
            questionCount: totalSectionQuestions,
            orgConfig: ORG_CONFIG
        };
        const subTopicResult = await run(SubTopicAgent, JSON.stringify(subTopicInput));
        
        const subtopics = ((subTopicResult.finalOutput as any).subtopics || []).map((st: any) => ({
            ...st,
            section: section.name
        }));
        
        allSubtopics.push({ sectionData: section, subtopics });
    }

    // 3. Allocation Engine
    let generationTasks: any[] = [];
    for (const { sectionData, subtopics } of allSubtopics) {
        const groups = sectionData.groups.map((g: any) => ({
            questionType: g.questionType,
            numberOfQuestions: Number(g.numberOfQuestions),
            marksPerQuestion: Number(g.marksPerQuestion),
            specialInstructions: g.specialInstructions ? g.specialInstructions.filter((i: string) => i.trim() !== "").join("\n") : undefined,
            topics: g.topics,
            mergeSectionTopics: g.mergeSectionTopics
        }));

        const allocation = allocateGenerationTasks(
            data.title,
            data.subject,
            subtopics,
            groups,
            data.specialInstructions
        );
        generationTasks.push(...allocation.tasks);
    }

    // 4. Executor
    const executorConfig = { ...ORG_CONFIG, concurrency: 5 };
    console.log("=== GENERATION TASKS ===");
    console.log(JSON.stringify(generationTasks, null, 2));
    const executorResult = await executeGenerationTasks(generationTasks, executorConfig);

    // 5. Validator
    let validationResult = validateGenerationResults(executorResult.results);

    // 6. Repair
    if (!validationResult.isValid) {
        for (const issue of validationResult.issues) {
            const task = issue.task;
            const question = issue.question;
            if (!task || !question) continue;

            const taskId = task.id;
            const questionId = question.id;

            // Repair the question
            const repairResult = await repairQuestion(issue, ORG_CONFIG);
            
            // Revalidate repaired question
            const newIssues = validateQuestion(repairResult.repairedQuestion, task);
            if (newIssues.length > 0) {
                throw new ApiError(500, `Validation failed after repair: ${newIssues[0]?.message}`);
            }

            // Update the GenerationResult
            const resultIndex = executorResult.results.findIndex((r: any) => r.task.id === taskId);
            if (resultIndex !== -1) {
                const result = executorResult.results[resultIndex];
                if (result && result.output) {
                    const output = result.output;
                    const qIndex = output.questions.findIndex((q: any) => q.id === questionId);
                    if (qIndex !== -1) {
                        output.questions[qIndex] = repairResult.repairedQuestion;
                    }
                }
            }
        }
        
        // Re-run global validator just to be safe
        validationResult = validateGenerationResults(executorResult.results);
        if (!validationResult.isValid) {
            throw new ApiError(500, "Validation failed after repair.");
        }
    }

    // 7. Formatter
    const examMetadata = {
        title: data.title,
        subject: data.subject,
        description: `${data.subject} exam`,
        duration: data.duration || 60,
        examType: "flexible"
    };

    const formattedExam = formatExam(examMetadata, executorResult.results);

    return formattedExam;
};












export { createExam, getExams, getExamById, updateExam, deleteExam, getOverviewStats, saveGeneratedExam, generateExamFromForm };