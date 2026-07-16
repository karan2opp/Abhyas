import { generateExamFromForm } from "./module/exam/exam.service.js";
import dotenv from "dotenv";

dotenv.config();

const testData = {
    title: "Sample AI Exam",
    subject: "Computer Science",
    difficulty: "medium",
    specialInstructions: "Focus on basic concepts.",
    duration: 60,
    sections: [
        {
            name: "Section A",
            topics: ["Variables", "Loops"],
            groups: [
                {
                    questionType: "mcq",
                    numberOfQuestions: 2,
                    marksPerQuestion: 2
                }
            ]
        }
    ]
};

async function runTest() {
    console.log("🚀 Starting AI Exam Generation Pipeline Test...");
    try {
        console.log("Input data:", JSON.stringify(testData, null, 2));
        
        console.time("Pipeline Duration");
        const result = await generateExamFromForm(testData, "teacher_123");
        console.timeEnd("Pipeline Duration");

        console.log("\n✅ Generation Successful!");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("\n❌ Pipeline Failed:", error);
    }
}

runTest();
