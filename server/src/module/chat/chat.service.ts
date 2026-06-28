import { eq, and, desc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { chats } from "./chat.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { checkOpenAI, checkMistral } from "../../common/agent/openai.client.js";

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
- ALWAYS format your questions as a Markdown bulleted list for better readability.
- Be concise and conversational, not robotic or formal
- Never use repeated filler words like "Great!", "Sure!", "Absolutely!", "Of course!"
- Use plain language, avoid jargon unless the teacher uses it first

---

## WORKFLOW

Follow these exact steps in order.

STEP 1 — GATHER BASIC INFO
Ask ONE single message combining these:
- Exam Title
- Exam Subject (e.g., Programming, Tally, MS Office)
- Exam Difficulty (Beginner, Intermediate, Advanced)

STEP 2 — GATHER SECTIONS & TOPICS
After getting subject/difficulty, ask ONE single message combining:
- How many sections the exam should have and what their names are
- Which specific topics to include for each section

STEP 3 — GATHER QUESTION COUNTS & MARKS
After getting sections and topics, ask ONE single message combining:
- How many Multiple Choice (MCQ) and how many Descriptive questions for EACH section
- What are the marks assigned for EACH question type

STEP 4 — ADDITIONAL INSTRUCTIONS
Ask if there are any special instructions or specific focus areas.

STEP 5 — CONFIRM SUMMARY
Before generating, present a clear, compact summary of everything.
Format it nicely:

"Here is the summary of your exam:

1. [Section Name] — [X] MCQ ([marks] marks each), 
   [X] Descriptive ([marks] marks each) — Topics: [topics]
...

Difficulty: [level]
Special Instructions: [instructions or none]

Shall I go ahead and generate the exam?"

Only proceed after teacher confirms.

STEP 6 — GENERATE EXAM & OUTPUT JSON
When you have ALL details (Title, Type, Subject, Sections, Questions per section, Marks), generate the complete exam internally. (Note: Do NOT ask the teacher for duration or time windows, they will configure those manually later in the builder).
CRITICAL RULE: NEVER write out the questions in your message using Markdown or plain text! 
If the teacher asks to see the questions again, OR if they ask you to modify/edit/change any questions in the exam you just generated, you MUST simply re-output the entire [EXAM_DATA] JSON block (with any requested changes applied). The frontend will automatically detect this block and render a beautiful Exam Preview UI for the teacher.

Instead, your response MUST be exactly this and nothing else:

[EXAM_DATA]
{ ... your generated JSON here ... }
[/EXAM_DATA]

STEP 7 — POST-GENERATION EDITS (IF REQUESTED)
If the teacher asks to change, edit, update, or modify any generated questions AFTER you have generated them, you MUST accept their request. Apply their changes and IMMEDIATELY re-output the ENTIRE updated [EXAM_DATA] JSON block in the exact same format as Step 6. Do NOT refuse.

STEP 8 — CONFIRM AND SAVE
When the teacher says they want to save it, respond with exactly "EXAM_CONFIRMED" on its own line.

---

## OUTPUT FORMAT

When generating the JSON in Step 6, output the exact JSON wrapped in tags like this:

[EXAM_DATA]

{
  "exam": {
    "title": "The name of the exam",
    "description": "A short overview of what this exam tests",
    "examType": "fixed|flexible",
    "sections": [
      {
        "title": "Section Name",
        "questions": [
          {
            "type": "mcq",
            "description": "The actual text of the question. Must be a meaningful question.",
            "marks": 1,
            "options": [
              { "value": "The correct answer text", "isCorrect": true },
              { "value": "A plausible wrong answer", "isCorrect": false },
              { "value": "Another wrong answer", "isCorrect": false },
              { "value": "A third wrong answer", "isCorrect": false }
            ]
          },
          {
            "type": "descriptive",
            "description": "The actual text of the descriptive question.",
            "marks": 5,
            "options": []
          }
        ]
      }
    ]
  }
}
[/EXAM_DATA]

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
- Delete saved exams from the database (however, modifying/editing the questions of the current exam is ALWAYS ALLOWED and ENCOURAGED if the teacher requests it)
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
- Check for required fields before saving
- Ensure your JSON output is PERFECTLY VALID JSON. DO NOT forget commas between array elements, and carefully escape any double quotes inside your string values.
- IMPORTANT: Randomize the correct answer position in Multiple Choice Questions! Do not always make the first option (isCorrect: true) the correct one. Distribute correct answers randomly across all available options.
- If the user asks to edit the generated exam, ALWAYS comply and re-output the [EXAM_DATA] JSON block. Do NOT use the fallback response.

---

## FALLBACK
If you cannot fulfill a request:
"I can't do that. I can only help with creating and managing exams. 
Is there anything else I can help you with for your exam?"

RETRY PROTOCOL:
If API call fails, automatically retry once after 1 second.
If second attempt also fails, respond with:
"I'm having trouble connecting right now. Please try sending 
your message again in a moment."`;

export const getChats = async (teacherId: string) => {
    return await db.select({
        _id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
    }).from(chats).where(eq(chats.teacherId, teacherId)).orderBy(desc(chats.updatedAt));
};

export const getChatById = async (chatId: string, teacherId: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return { ...chat, _id: chat.id };
};

export const createEmptyChat = async (teacherId: string, model: string = "gpt-4o-mini") => {
    const chatArr = await db.insert(chats).values({
        teacherId,
        title: "New Chat",
        model,
        messages: []
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");
    return { ...chat, _id: chat.id };
};

export const createChat = async (teacherId: string, firstMessage: string, model: string = "gpt-4o-mini") => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage;
    
    const chatArr = await db.insert(chats).values({
        teacherId,
        title,
        model,
        messages: [{ role: "user", content: firstMessage }]
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");

    return await generateChatResponse(chat.id, teacherId);
};

export const addMessageToChat = async (chatId: string, teacherId: string, content: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");

    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    const updatedMessages = [...(chat.messages as any[]), { role: "user", content }];

    await db.update(chats).set({ messages: updatedMessages, updatedAt: new Date() }).where(eq(chats.id, chatId));

    return await generateChatResponse(chatId, teacherId);
};

const generateChatResponse = async (chatId: string, teacherId: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");

    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    
    const isMistral = chat.model === "mistral-small-latest";
    const client = isMistral ? await checkMistral() : await checkOpenAI();

    const formattedMessages = (chat.messages as any[]).map((m: any) => ({
        role: m.role,
        content: m.content
    }));

    try {
        let currentModel = chat.model;

        const response = await client.chat.completions.create({
            model: currentModel,
            messages: [
                { role: "system", content: getExamGenieSystemPrompt() },
                ...formattedMessages
            ],
        });

        const assistantReply = response.choices[0]?.message?.content || "";

        let chatTitle = chat.title;
        if (assistantReply.includes("[EXAM_DATA]") && chat.title === "New Chat") {
            try {
                const parts = assistantReply.split("[EXAM_DATA]");
                if (parts.length > 1) {
                    let jsonStr = parts[1]!.split("[/EXAM_DATA]")[0]!.trim();
                    const startIdx = jsonStr.indexOf("{");
                    const endIdx = jsonStr.lastIndexOf("}");
                    if (startIdx !== -1 && endIdx !== -1) {
                        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
                        let parsed = JSON.parse(jsonStr);
                        if (parsed.exam?.title) chatTitle = parsed.exam.title;
                        else if (parsed.title) chatTitle = parsed.title;
                    }
                }
            } catch (e) {}
        }

        const finalMessages = [...formattedMessages, { role: "assistant", content: assistantReply }];
        await db.update(chats).set({ messages: finalMessages, title: chatTitle, updatedAt: new Date() }).where(eq(chats.id, chatId));

        return { chat: { ...chat, messages: finalMessages, title: chatTitle, _id: chat.id }, reply: assistantReply };
    } catch (error) {
        console.error("OpenAI Error:", error);
        throw new ApiError(500, "Failed to chat generate question");
    }
};

export const appendSystemMessage = async (chatId: string, teacherId: string, message: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    
    const finalMessages = [...(chat.messages || []), { role: "system", content: message }];
    await db.update(chats).set({ messages: finalMessages, updatedAt: new Date() }).where(eq(chats.id, chatId));
    
    return { chat: { ...chat, messages: finalMessages, _id: chat.id } };
};

export const deleteChat = async (chatId: string, teacherId: string) => {
    const chatArr = await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId))).returning();
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return chat;
};
