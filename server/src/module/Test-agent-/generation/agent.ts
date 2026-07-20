import { Agent } from "@openai/agents";
import { GenerationOutputSchema } from "./schema.js";

function logExampleSource(subject: string, source: string) {
    console.log(`[PromptBuilder] Using example for subject "${subject}" from source: ${source}`);
}

const BASE_FALLBACK_EXAMPLE = {
  examTitle: "Sample Exam",
  subject: "General",
  questions: [
    {
      id: "q_001",
      subtopicId: "subtopic_001",
      section: "Section A",
      questionText: "Sample question text testing a single, specific concept.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "C",
      marks: 1,
    },
    {
      id: "q_002",
      subtopicId: "subtopic_001",
      section: "Section A",
      questionText: "Another sample question with four options.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "B",
      marks: 2,
    },
    {
      id: "q_003",
      subtopicId: "subtopic_002",
      section: "Section B",
      questionText: "Identify the correct statement based on the given concept.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "D",
      marks: 2,
    },
    {
      id: "q_004",
      subtopicId: "subtopic_002",
      section: "Section B",
      questionText: "Choose the most appropriate answer.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "A",
      marks: 1,
    },
    {
      id: "q_005",
      subtopicId: "subtopic_003",
      section: "Section C",
      questionText: "Select the correct option for the given scenario.",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "D",
      marks: 3,
    },
    {
      id: "q_006",
      subtopicId: "subtopic_003",
      section: "Section C",
      questionText: "Which of the following best satisfies the requirement?",
      options: [
        { id: "A", text: "Option A" },
        { id: "B", text: "Option B" },
        { id: "C", text: "Option C" },
        { id: "D", text: "Option D" },
      ],
      correctOptionId: "B",
      marks: 2,
    }
  ],
};

// Polyfill localStorage for Node
if (typeof localStorage === "undefined") {
    (global as any).localStorage = {
        _data: {} as Record<string, string>,
        getItem(key: string) { return this._data[key] || null; },
        setItem(key: string, value: string) { this._data[key] = value; },
        removeItem(key: string) { delete this._data[key]; }
    };
}

if (!localStorage.getItem("promptExamples")) {
    const CHEMISTRY_ORG_EXAMPLE = {
      examTitle: "Class 12 Chemistry Practice Test",
      subject: "Chemistry",
      questions: [
        {
          id: "q_001",
          subtopicId: "chem_001",
          section: "Section A",
          questionText: "What is the primary purpose of an electrochemical cell?",
          options: [
            { id: "A", text: "To convert chemical energy into electrical energy" },
            { id: "B", text: "To convert electrical energy into heat energy" },
            { id: "C", text: "To increase the reaction rate" },
            { id: "D", text: "To separate mixtures" }
          ],
          correctOptionId: "A",
          marks: 1
        },
        {
          id: "q_002",
          subtopicId: "chem_001",
          section: "Section A",
          questionText: "In a galvanic cell, oxidation occurs at the:",
          options: [
            { id: "A", text: "Cathode" },
            { id: "B", text: "Salt bridge" },
            { id: "C", text: "Anode" },
            { id: "D", text: "Electrolyte" }
          ],
          correctOptionId: "C",
          marks: 1
        },
        {
          id: "q_003",
          subtopicId: "chem_002",
          section: "Section A",
          questionText: "The standard electrode potential of a half-cell is 0.80 V. If the ion concentration decreases below 1 M, which equation is used to calculate the new electrode potential?",
          options: [
            { id: "A", text: "Arrhenius Equation" },
            { id: "B", text: "Nernst Equation" },
            { id: "C", text: "Ideal Gas Equation" },
            { id: "D", text: "Henderson Equation" }
          ],
          correctOptionId: "B",
          marks: 2
        },
        {
          id: "q_004",
          subtopicId: "chem_002",
          section: "Section A",
          questionText: "For a Daniell cell, the standard cell potential is 1.10 V. If Zn²⁺ concentration increases while Cu²⁺ concentration remains constant, the cell potential will:",
          options: [
            { id: "A", text: "Increase" },
            { id: "B", text: "Remain unchanged" },
            { id: "C", text: "Decrease" },
            { id: "D", text: "Become zero" }
          ],
          correctOptionId: "C",
          marks: 2
        },
        {
          id: "q_005",
          subtopicId: "chem_003",
          section: "Section B",
          questionText: "The unit of the rate constant depends on the:",
          options: [
            { id: "A", text: "Temperature only" },
            { id: "B", text: "Order of the reaction" },
            { id: "C", text: "Activation energy" },
            { id: "D", text: "Pressure only" }
          ],
          correctOptionId: "B",
          marks: 2
        },
        {
          id: "q_006",
          subtopicId: "chem_003",
          section: "Section B",
          questionText: "For a first-order reaction, the half-life is:",
          options: [
            { id: "A", text: "Directly proportional to the initial concentration" },
            { id: "B", text: "Independent of the initial concentration" },
            { id: "C", text: "Zero" },
            { id: "D", text: "Infinite" }
          ],
          correctOptionId: "B",
          marks: 2
        },
        {
          id: "q_007",
          subtopicId: "chem_004",
          section: "Section B",
          questionText: "What is the IUPAC name of the complex [Co(NH₃)₆]Cl₃?",
          options: [
            { id: "A", text: "Hexaamminecobalt(III) chloride" },
            { id: "B", text: "Hexaamminecobalt(II) chloride" },
            { id: "C", text: "Cobalt ammonia chloride" },
            { id: "D", text: "Hexaamine cobalt chloride" }
          ],
          correctOptionId: "A",
          marks: 1
        },
        {
          id: "q_008",
          subtopicId: "chem_004",
          section: "Section B",
          questionText: "The coordination number of the central metal ion in K₄[Fe(CN)₆] is:",
          options: [
            { id: "A", text: "2" },
            { id: "B", text: "4" },
            { id: "C", text: "6" },
            { id: "D", text: "8" }
          ],
          correctOptionId: "C",
          marks: 1
        }
      ]
    };
    
    localStorage.setItem("promptExamples", JSON.stringify([
      { orgId: "test_org", examType: "Competitive", ...CHEMISTRY_ORG_EXAMPLE }
    ]));
}

const db = {
    promptExamples: {
        async findOne(query: { orgId?: string | null; examType?: string; subject?: string }) {
            const dataStr = localStorage.getItem("promptExamples");
            const data: any[] = dataStr ? JSON.parse(dataStr) : [];
            return data.find((item: any) => {
                let match = true;
                for (const key in query) {
                    if (item[key] !== (query as any)[key]) match = false;
                }
                return match;
            }) || null;
        }
    }
};

async function getPromptExample(orgId: string, examType: string, subject: string) {
  const orgSpecific = await db.promptExamples.findOne({ orgId, subject });
  if (orgSpecific) return { example: orgSpecific, source: "org_specific" };

  const shared = await db.promptExamples.findOne({ orgId: null, examType, subject });
  if (shared) return { example: shared, source: "shared_default" };

  return { example: BASE_FALLBACK_EXAMPLE, source: "base_fallback" };
}

export function chunkSubtopics(subtopics: any[], maxQuestions: number = 20): any[][] {
    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    let currentCount = 0;

    for (const subtopic of subtopics) {
        let remaining = subtopic.questionCount;
        while (remaining > 0) {
            const space = maxQuestions - currentCount;
            if (space <= 0) {
                chunks.push(currentChunk);
                currentChunk = [];
                currentCount = 0;
                continue;
            }

            const toTake = Math.min(remaining, space);
            currentChunk.push({
                ...subtopic,
                questionCount: toTake
            });
            currentCount += toTake;
            remaining -= toTake;
        }
    }
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }
    return chunks;
}

const baseQuestionGenerationInstructions = `
You are an expert exam-setting professor who writes exam questions.
You understand topics and subtopics and generate questions strictly from the
information given to you — never inventing scope beyond it.

## Inputs you will receive
- examTitle: name of the overall exam (pass through unchanged in your output)
- subject: the academic subject this subtopic belongs to (e.g. "Physics", "JavaScript")
- subtopics: array of { id, name, section, description, questionCount, difficulty }
  - name: the specific concept/skill to write questions about — this is your primary focus
  - section: which part of the exam this question belongs to (tag every question with it)
  - description: optional scope note — if present, it narrows or constrains what
    the question should focus on (e.g. "numericals only, no derivation");
    if null, use your own judgment based on name and difficulty alone
  - questionCount: generate EXACTLY this many questions for this subtopic — no more, no less
  - difficulty: calibrate question complexity to this level
- sectionQuestionConfig: array of { type, count, marksPerQuestion } detailing the global section configuration. CRITICAL: Do NOT generate the 'count' listed in this config. You MUST strictly generate the exact number of questions specified by each subtopic's 'questionCount' field. Use this config ONLY to determine what types of questions are allowed and their marks.
- specialInstructions: any org- or session-level constraints (e.g. "true/false allowed",
  "allow multiple correct answers", "avoid diagram-based questions") — these override
  the default rules below when they conflict

## Rules
1. Generate questions strictly about the given subtopics' "name" — never drift to
   a neighboring subtopic or the parent topic in general.
2. Follow the difficulty level given. Do not soften or escalate it.
3. Every question must be genuinely distinct — no two questions in this batch may
   test the same fact or be reworded versions of each other.
4. Default question format: MCQ with exactly 4 options and exactly 1 correct answer unless specified otherwise by the sectionQuestionConfig or specialInstructions.
5. correctOptionId must exactly match one of the option ids you generated for that
   question — never reference an option that doesn't exist in your own output.
6. Do not include your own reasoning, commentary, or explanations outside the
   structured output fields.

## Example
{{EXAMPLE_PLACEHOLDER}}
<!-- Injected at call time: org-specific example if one exists for this org+subject,
     otherwise the shared default example for this examType+subject. May be absent
     for a brand-new subject with no example on file yet — in that case, rely on the
     rules above alone. -->

Return structured output only, matching the provided schema.
`;

async function buildGenerationPrompt(basePrompt: string, orgId: string, examType: string, subject: string) {
  const { example, source } = await getPromptExample(orgId, examType, subject);

  // log which tier served this call — useful signal for which subjects
  // still need a real example written
  logExampleSource(subject, source);

  const exampleBlock = `Reference example (source: ${source}):\n${JSON.stringify(example, null, 2)}`;
  return basePrompt.replace("{{EXAMPLE_PLACEHOLDER}}", exampleBlock);
}

// Function to create an agent dynamically based on the subject and config
export async function createQuestionGenerationAgent(orgId: string, examType: string, subject: string) {
    const instructions = await buildGenerationPrompt(baseQuestionGenerationInstructions, orgId, examType, subject);
    return new Agent({
        name: "Question Generation Agent",
        model: "gpt-4o-mini",
        instructions: instructions,
        outputType: GenerationOutputSchema
    });
}
