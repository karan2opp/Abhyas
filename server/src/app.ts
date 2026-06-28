import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./module/auth/auth.route.js";
import examRouter from "./module/exam/exam.route.js";
import sectionsRouter from "./module/sections/section.routes.js";
import questionsRouter from "./module/questions/question.route.js";
import optionsRouter from "./module/options/option.route.js";
import submissionsRouter from "./module/submissions/submission.route.js";
import answersRouter from "./module/answers/answer.route.js";
import adminRouter from "./module/admin/admin.route.js";
import superadminRouter from "./module/superadmin/superadmin.route.js";
import feedbackRouter from "./module/feedback/feedback.route.js";
import chatRouter from "./module/chat/chat.route.js";
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
app.use("/api/exams", examRouter)
app.use("/api/sections", sectionsRouter)
app.use("/api/questions", questionsRouter)
app.use("/api/options", optionsRouter)
app.use("/api/submissions", submissionsRouter)
app.use("/api/answers", answersRouter)
app.use("/api/admin", adminRouter)
app.use("/api/superadmin", superadminRouter)
app.use("/api/feedback", feedbackRouter)
app.use("/api/chat", chatRouter)
app.use(errorHandler)

export default app;
// Trigger restart