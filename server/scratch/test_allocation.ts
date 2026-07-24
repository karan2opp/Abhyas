import { allocateGenerationTasks } from "../src/module/exam/ai/planner/allocation.js";

const subtopics = [
    { id: "sub_1", name: "Python Basics", section: "Section 1", questionCount: 20, difficulty: "medium" },
    { id: "sub_2", name: "Python Loops", section: "Section 1", questionCount: 20, difficulty: "medium" }
];

const groups = [
    {
        id: "group_1",
        questionType: "mcq",
        numberOfQuestions: 10,
        marksPerQuestion: 1,
        specialInstructions: "ask output prediction based question",
        topics: "prediction loops",
        mergeSectionTopics: false
    },
    {
        id: "group_2",
        questionType: "mcq",
        numberOfQuestions: 30,
        marksPerQuestion: 1,
        specialInstructions: undefined,
        topics: "",
        mergeSectionTopics: true
    }
];

const allocation = allocateGenerationTasks("Python 101", "Python", subtopics, groups as any, "");

console.log(JSON.stringify(allocation.tasks, null, 2));
