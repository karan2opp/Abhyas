import { eq, and, inArray } from "drizzle-orm";
import db from "../../common/db/index.js";
import { questions, options, sections, exams } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateQuestionDto, UpdateQuestionDto, GenerateQuestionConfig } from "./dto/question.dto.js";
import { uploadToCloudinary } from "../../common/config/cloudinary.js";
import { checkOpenAI } from "../../common/agent/openai.client.js";
// ── Helper: verify section belongs to teacher ──────────────────────────────────
const verifySectionOwnership = async (sectionId: string, teacherId: string) => {
    const [section] = await db.select({
        id: sections.id,
        examCreatedBy: exams.createdBy,
    })
        .from(sections)
        .innerJoin(exams, eq(sections.examId, exams.id))
        .where(eq(sections.id, sectionId));

    if (!section) throw ApiError.notFound("Section not found");
    if (section.examCreatedBy !== teacherId) throw ApiError.forbidden("You are not authorized");
    return section;
};

// ── Helper: verify question belongs to teacher ─────────────────────────────────
const verifyQuestionOwnership = async (questionId: string, teacherId: string) => {
    const [question] = await db.select({
        id: questions.id,
        sectionId: questions.sectionId,
        type: questions.type,
        description: questions.description,
        marks: questions.marks,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        examCreatedBy: exams.createdBy,
    })
        .from(questions)
        .innerJoin(sections, eq(questions.sectionId, sections.id))
        .innerJoin(exams, eq(sections.examId, exams.id))
        .where(eq(questions.id, questionId));

    if (!question) throw ApiError.notFound("Question not found");
    if (question.examCreatedBy !== teacherId) throw ApiError.forbidden("You are not authorized");
    return question;
};

// ── Create Question ────────────────────────────────────────────────────────────
const createQuestion = async (
    data: CreateQuestionDto,
    teacherId: string,
    imageFiles?: Express.Multer.File[]  // ← receives files from controller
) => {
    await verifySectionOwnership(data.sectionId, teacherId);

    // upload images to cloudinary before transaction
    const uploadedImages: { url: string; publicId: string }[] = [];

    if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = imageFiles.map((file) =>
            uploadToCloudinary(file.buffer, "questions")
        );
        const results = await Promise.all(uploadPromises);
        uploadedImages.push(...results.map((r) => ({ url: r.url, publicId: r.publicId })));
    }

    const result = await db.transaction(async (tx) => {
        const [question] = await tx.insert(questions).values({
            sectionId: data.sectionId,
            type: data.type,
            description: data.description,
            marks: data.marks,
            images: uploadedImages.length > 0 ? uploadedImages : null,
        }).returning();

        if (!question) throw ApiError.internal("Failed to create question");

        let optionsData: typeof options.$inferSelect[] = [];

        if (data.type === "mcq" && data.options && data.options.length > 0) {
            optionsData = await tx.insert(options).values(
                data.options.map(opt => ({
                    questionId: question.id,
                    value: opt.value,
                    isCorrect: opt.isCorrect,
                }))
            ).returning();
        }

        return { ...question, options: optionsData };
    });

    return result;
};

// ── Get All Questions by Section ───────────────────────────────────────────────
const getQuestionsBySection = async (sectionId: string, teacherId: string) => {
    await verifySectionOwnership(sectionId, teacherId);

    const questionsData = await db.select().from(questions).where(eq(questions.sectionId, sectionId));

    const questionsWithOptions = await Promise.all(
        questionsData.map(async (question) => {
            const optionsData = await db.select().from(options).where(eq(options.questionId, question.id));
            return { ...question, options: optionsData };
        })
    );

    return questionsWithOptions;
};

// ── Get Single Question with Options ──────────────────────────────────────────
const getQuestionById = async (questionId: string, teacherId: string) => {
    const question = await verifyQuestionOwnership(questionId, teacherId);
    const optionsData = await db.select().from(options).where(eq(options.questionId, questionId));
    return { ...question, options: optionsData };
};

// ── Update Question (with smart options merge) ─────────────────────────────────
const updateQuestion = async (questionId: string, data: UpdateQuestionDto, teacherId: string, imageFiles?: Express.Multer.File[]) => {
    await verifyQuestionOwnership(questionId, teacherId);

    const uploadedImages: { url: string; publicId: string }[] = [];

    if (imageFiles && imageFiles.length > 0) {
        const uploadPromises = imageFiles.map((file) =>
            uploadToCloudinary(file.buffer, "questions")
        );
        const results = await Promise.all(uploadPromises);
        uploadedImages.push(...results.map((r) => ({ url: r.url, publicId: r.publicId })));
    }

    const result = await db.transaction(async (tx) => {
        // update question fields
        const [updated] = await tx.update(questions)
            .set({
                ...(data.description && { description: data.description }),
                ...(data.marks && { marks: data.marks }),
                ...(uploadedImages.length > 0 && { images: uploadedImages }),
                updatedAt: new Date(),
            })
            .where(eq(questions.id, questionId))
            .returning();

        if (!updated) throw ApiError.internal("Failed to update question");

        if (data.options && data.options.length > 0) {
            // separate options into update and create
            const toUpdate = data.options.filter(opt => opt.id)
            const toCreate = data.options.filter(opt => !opt.id)

            // ids included in request — keep these
            const incomingIds = toUpdate.map(opt => opt.id as string)

            // delete options not included in request
            const existingOptions = await tx.select().from(options).where(eq(options.questionId, questionId))
            const toDelete = existingOptions.filter(opt => !incomingIds.includes(opt.id))

            if (toDelete.length > 0) {
                await tx.delete(options).where(
                    inArray(options.id, toDelete.map(opt => opt.id))
                )
            }

            // update existing options
            await Promise.all(
                toUpdate.map(opt =>
                    tx.update(options)
                        .set({
                            value: opt.value,
                            isCorrect: opt.isCorrect,
                            updatedAt: new Date(),
                        })
                        .where(eq(options.id, opt.id as string))
                )
            )

            // create new options
            if (toCreate.length > 0) {
                await tx.insert(options).values(
                    toCreate.map(opt => ({
                        questionId,
                        value: opt.value!,
                        isCorrect: opt.isCorrect!,
                    }))
                )
            }
        }

        const updatedOptions = await tx.select().from(options).where(eq(options.questionId, questionId))
        return { ...updated, options: updatedOptions };
    });

    return result;
};

// ── Delete Question (cascades options) ────────────────────────────────────────
const deleteQuestion = async (questionId: string, teacherId: string) => {
    await verifyQuestionOwnership(questionId, teacherId);
    await db.delete(questions).where(eq(questions.id, questionId));
    // options are cascade deleted automatically by PostgreSQL
};

const buildUserPrompt = (config: GenerateQuestionConfig): string => {
    let prompt = `Subject: ${config.subject}\nDifficulty: ${config.difficulty}\n\n`
    prompt += `Generate questions for the following topics and subtopics:\n\n`

    config.topics.forEach((topic) => {
        prompt += `Topic: ${topic.name}\n`
        topic.subtopics.forEach((sub) => {
            prompt += `  - Subtopic: ${sub.name} | Count: ${sub.count} | Types: ${sub.questionTypes.join(", ")}\n`
        })
        prompt += `\n`
    })

    prompt += `MARKS CONFIGURATION:\n`
    prompt += `- MCQ questions: 1 mark\n`
    prompt += `- Text-based (descriptive) questions: ${config.textMarks || 5} marks\n\n`

    if (config.customInstructions) {
        prompt += `Additional Instructions: ${config.customInstructions}\n`
    }

    return prompt
}
const generateQuestion = async (info: GenerateQuestionConfig) => {
    const client = await checkOpenAI();
    const explanationRule = info.includeExplanation !== false ? `\n- Include a short explanation for the correct answer` : "";
    const explanationFormat = info.includeExplanation !== false ? `\n      "explanation": "string",` : "";

    const SYSTEM_PROMPT = `You are an expert exam question generator for our computer training institute.

INSTITUTE EXAM PATTERN:
- Question ratio: 60% theory-based, 40% practical/application-based
- Maintain this ratio strictly across generated questions

SUBJECT CATEGORIES (only generate questions from these):
1. Programming (e.g. C, C++, Python, Java basics — logic, syntax, concepts)
2. Tally (accounting software — vouchers, ledgers, GST, inventory)
3. MS Office Basic:
   - MS Word (formatting, mail merge, templates)
   - MS Excel (formulas, functions, charts, pivot tables)
   - MS PowerPoint (slides, animations, design, presentation tools)

QUESTION RULES:
- Theory questions → test conceptual understanding, definitions, "what is", "why", "differentiate between"
- Practical questions → test "how to perform X", step-based, output-based, formula-based (especially for Excel/Tally)
- Difficulty must match requested level (beginner/intermediate/advanced)
- If requested type is "mcq": you MUST provide exactly 4 options and a correctAnswer. The correctAnswer MUST exactly match the full text of one of the options (e.g. do not just say "A", but the full text).
- CRITICAL: For MCQs, aggressively randomize the position of the correct answer among the 4 options. Do NOT just make the first option the correct answer.
- If requested type is "text" (descriptive): do NOT provide options or a correctAnswer. The question should be open-ended.
- Assign "marks" to each question based on the MARKS CONFIGURATION provided by the user${explanationRule}

OUTPUT FORMAT:
Respond ONLY in valid JSON:
{
  "questions": [
    {
      "question": "string",
      "type": "mcq" | "descriptive", // Match the requested type
      "subject": "programming" | "tally" | "ms_word" | "ms_excel" | "ms_powerpoint",
      "options": ["string", "string", "string", "string"], // ONLY include if type is 'mcq'
      "correctAnswer": "string", // ONLY include if type is 'mcq'. MUST exactly match one of the options!${explanationFormat}
      "marks": number
    }
  ]
}`
    const prompt = buildUserPrompt(info)
    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt },
            ],
        });

        return response.choices[0]?.message?.content;
    } catch (error) {
        throw new ApiError(500, "Failed to generate question");
    }


}
export { createQuestion, getQuestionsBySection, getQuestionById, updateQuestion, deleteQuestion, generateQuestion };