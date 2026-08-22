import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./module/auth/auth.route.js";
import organisationsRouter from "./module/organisations/organisation.route.js";
import classroomsRouter from "./module/classrooms/classroom.route.js";
import groupsRouter from "./module/groups/group.route.js";
import assignmentsRouter from "./module/assignments/assignment.route.js";
import examRouter from "./module/exam/exam.route.js";
import sectionsRouter from "./module/sections/section.routes.js";
import questionsRouter from "./module/questions/question.route.js";
import optionsRouter from "./module/options/option.route.js";
import submissionsRouter from "./module/submissions/submission.route.js";
import answersRouter from "./module/answers/answer.route.js";
import superadminRouter from "./module/superadmin/superadmin.route.js";
import feedbackRouter from "./module/feedback/feedback.route.js";
import ragRouter from "./module/generation/rag/rag.route.js";
import jobsRouter from "./module/jobs/jobs.route.js";
import { generationRouter } from "./module/generation/generation.route.js";
import billingRouter from "./module/billing/billing.route.js";
import studentProfileRouter from "./module/student-profile/student-profile.route.js";
import errorHandler from "./common/middleware/error.middleware.js";
import 'dotenv/config'
const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/organisations", organisationsRouter)
app.use("/api/classrooms", classroomsRouter)
app.use("/api/groups", groupsRouter)
app.use("/api/assignments", assignmentsRouter)
app.use("/api/exams", examRouter)
app.use("/api/sections", sectionsRouter)
app.use("/api/questions", questionsRouter)
app.use("/api/options", optionsRouter)
app.use("/api/submissions", submissionsRouter)
app.use("/api/answers", answersRouter)
app.use("/api/superadmin", superadminRouter)
app.use("/api/feedback", feedbackRouter)
app.use("/api/generation", generationRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/billing", billingRouter);
app.use("/api/student-profile", studentProfileRouter);
app.use("/", ragRouter);
app.use(errorHandler)

export default app;

// Trigger restart