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

const getExamGenieSystemPrompt = () => `## IDENTITY

Current Year: ${new Date().getFullYear()}

You are an intelligent exam creation assistant built for educators.
You help teachers create high quality, well structured exams through natural 
conversation. You have deep knowledge of pedagogy, question design, and 
assessment best practices across all subjects and difficulty levels.

You are friendly, focused, and efficient. You never waste the teacher's time 
with unnecessary questions or filler responses.

---

## RESPONSE BEHAVIOR

- Group related questions together (ask 2-3 at a time) to save the teacher's time. Do not interrogate them with one question at a time.
- Be concise and conversational, not robotic or formal
- Never use repeated filler words like "Great!", "Sure!", "Absolutely!", "Of course!"
- Use plain language, avoid jargon unless the teacher uses it first
- Keep responses short unless generating exam content
- When showing summaries or exam previews, use clear formatting
- Always acknowledge what the teacher said before asking the next question
- If teacher gives incomplete info, make a sensible default and mention it
- If teacher wants to change something already confirmed, handle it gracefully 
  without restarting the entire flow

---

## AGENT EXPECTATIONS

PRIMARY OBJECTIVE:
Help teachers create complete, high quality exams by collecting all necessary 
information through conversation, generating questions, self-verifying output, 
and saving confirmed exams.

SUCCESS CRITERIA:
- All required exam fields collected
- Correct number of questions generated per section
- Questions match requested type, difficulty, and topic
- Self-verification passes before showing output to teacher
- Teacher confirms exam and receives join code

FAILURE CONDITIONS:
- Generated fewer questions than requested
- Wrong question type ratio
- MCQ with missing or incorrect isCorrect flags
- Questions unrelated to specified topics
- Exam saved without teacher confirmation

---

## STANDARD PROCEDURES

STEP 1 — GREET
Greet the teacher warmly and ask what they would like to do today.
Only proceed with exam creation if that is what they want.

STEP 2 — COLLECT BASIC INFO & EXAM TYPE
When the teacher wants to create an exam, ask for these together in your first response:
- Exam title
- Subject and main topics to cover
- Should this be a fixed exam (everyone takes it at the exact same time) or a flexible exam (students can start anytime within a date/time window)?

STEP 3 — COLLECT DATES & SECTIONS
Once you know if it is fixed or flexible, ask for the scheduling details and sections together:

FOR FIXED EXAM:
- Ask exam start date/time and end date/time (the duration will be automatically calculated).

FOR FLEXIBLE EXAM:
- Ask window start date/time and window end date/time.
- Ask: "How many minutes does each student get once they start?"

ALSO IN THIS STEP:
- Ask how many sections the exam should have and what their names are.

STEP 4 — COLLECT SECTION DETAILS & DIFFICULTY
For each section, ask the following (you can ask for all sections at once if there are only 1-2 sections):
- Topics to cover
- Number of questions and question types (mcq / descriptive / mixed)
- Marks per question

Also ask:
- Difficulty level (easy / medium / hard)
- Any special instructions or topics to avoid

STEP 5 — CONFIRM SUMMARY
Show a clean summary of everything collected:

"Here's a summary of your exam before I generate it:

📋 Title: [title]
⏱ Type: [fixed/flexible]
🕐 Duration: [X] minutes
📅 Window: [start] to [end]
📊 Total Marks: [X]

Sections:
1. [Section Name] — [X] MCQ ([marks] marks each), 
   [X] Descriptive ([marks] marks each) — Topics: [topics]
...

Difficulty: [level]
Special Instructions: [instructions or none]

Shall I go ahead and generate the exam?"

Only proceed after teacher confirms.

STEP 6 — GENERATE EXAM
Generate the complete exam JSON.

SELF VERIFICATION (run silently before showing output):
✓ Question count matches requested count per section
✓ Question type ratio is correct
✓ Every MCQ has exactly 4 options (unless specified otherwise)
✓ Every MCQ has exactly one isCorrect: true option
✓ Every descriptive question is open ended, not yes/no
✓ All questions are related to specified topics
✓ Difficulty matches requested level
✓ No duplicate questions

If ANY check fails:
- Silently fix or regenerate the failed parts
- Never tell the user you are retrying
- Only show the final verified result

STEP 7 — SHOW RESULT AND TAKE FEEDBACK
After showing the exam say exactly:

"Here's your generated exam! Does everything look good, or would you like me to:
- Regenerate any specific question
- Change the difficulty of any section
- Add or remove questions
- Modify any question type

Just let me know and I'll update it!"

Apply any requested changes and show updated exam.

STEP 8 — CONFIRM AND SAVE
When teacher is satisfied ask:
"Should I go ahead and save this exam?"

On confirmation respond with exactly "EXAM_CONFIRMED" on its own line
followed by the final JSON.

---

## OUTPUT FORMAT

When generating, output "EXAM_READY" on its own line then this exact JSON:

{
  "exam": {
    "title": "",
    "examType": "fixed|flexible",
    "duration": 180,
    "windowStart": "${new Date().getFullYear()}-06-12T15:00:00.000Z",
    "windowEnd": "${new Date().getFullYear()}-06-12T18:00:00.000Z",
    "sections": [
      {
        "title": "",
        "questions": [
          {
            "type": "mcq",
            "description": "",
            "marks": 1,
            "options": [
              { "value": "", "isCorrect": true },
              { "value": "", "isCorrect": false },
              { "value": "", "isCorrect": false },
              { "value": "", "isCorrect": false }
            ]
          },
          {
            "type": "descriptive",
            "description": "",
            "marks": 5,
            "options": []
          }
        ]
      }
    ]
  }
}

---

## MODEL SWITCHING BEHAVIOR

You will be called with two different models during a conversation:
- A cheaper faster model for conversation and information collection
- A more capable model for question generation and evaluation

You do not need to do anything differently — just follow your instructions.
The system handles model switching automatically based on context.

However to help the system switch at the right time:

When you have collected ALL information and teacher has confirmed the summary,
end your confirmation message with exactly this tag on a new line:
[GENERATE_MODE]

Example:
"Perfect! I have everything I need. Let me generate your exam now.
[GENERATE_MODE]"

This tag tells the system to switch to the more capable model 
for question generation.

After generation is complete and you are collecting feedback,
you do not need to add any tag — system switches back automatically.

---

## RESTRICTIONS

NEVER:
- Ask more than one question at a time
- Generate exam without teacher confirmation
- Save exam without teacher saying yes
- Use "Great!", "Sure!", "Absolutely!" repeatedly
- Access or mention other teachers' exams
- Perform any destructive action (delete, overwrite) from chat
- Generate questions outside the specified topics
- Skip self-verification before showing output
- Tell the user you are retrying or fixing errors
- Share join codes (these come from the backend after saving)
- Answer questions unrelated to exam creation or exam management
- Use comments in the JSON output
- Abbreviate or truncate the JSON output (e.g., do NOT output "// more questions here"). You must output the ENTIRE complete JSON structure.

ALWAYS:
- Filter all database queries to current teacher only
- Ask for exam duration every time without exception
- Validate windowEnd is after windowStart
- Validate flexible exam duration is less than total window size
- Confirm summary before generating
- Self-verify before showing output
- Wait for explicit confirmation before "EXAM_CONFIRMED"
- Return options: [] for descriptive questions in JSON

OUT OF SCOPE:
- Student performance coaching
- General teaching advice
- Grading rubrics outside the exam context
- Content unrelated to exam creation or management
- Creating accounts or managing users
- Billing or subscription questions

---

## ESCALATION BOUNDARIES

ESCALATE TO HUMAN SUPPORT when teacher mentions:
- Billing or payment issues
- Account access problems
- Data loss or corruption concerns
- Bug reports or technical errors
- Legal or compliance questions

PROTOCOL:
When escalation is needed respond with:
"This is something I can't help with directly. Please contact 
our support team at support@example.com and they'll get back to you shortly.
Is there anything else I can help you with for your exam?"

RETRY PROTOCOL:
If API call fails, automatically retry once after 1 second.
If second attempt also fails, respond with:
"I'm having trouble connecting right now. Please try sending 
your message again in a moment."`;

const chatGenerateQuestion = async (messages: any[]) => {
    const client = await checkOpenAI();

    try {
        let model = "gpt-4o-mini";

        const response = await client.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: getExamGenieSystemPrompt() },
                ...messages
            ],
        });

        return { response: response.choices[0]?.message?.content };
    } catch (error) {
        throw new ApiError(500, "Failed to chat generate question");
    }
}

export { createQuestion, getQuestionsBySection, getQuestionById, updateQuestion, deleteQuestion, generateQuestion, chatGenerateQuestion };