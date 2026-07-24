import db from "../src/common/db/index.js";
import { exams, sections, questions } from "../src/common/db/schema.js";
import { desc, eq } from "drizzle-orm";

async function main() {
    const [latestExam] = await db.select().from(exams).orderBy(desc(exams.createdAt)).limit(1);
    if (!latestExam) {
        console.log("No exams found");
        return;
    }
    console.log("Exam:", latestExam.title);
    
    const examSections = await db.select().from(sections).where(eq(sections.examId, latestExam.id));
    
    let predictionCount = 0;
    for (const sec of examSections) {
        console.log("Section:", sec.title);
        const sectionQuestions = await db.select().from(questions).where(eq(questions.sectionId, sec.id));
        for (const q of sectionQuestions) {
            console.log("Q:", q.description);
        }
        console.log("Total questions in section:", sectionQuestions.length);
    }
    process.exit(0);
}

main().catch(console.error);
