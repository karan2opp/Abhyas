import db from "../../common/db/index.js";
import { feedbacks } from "./feedback.schema.js";
import type { CreateFeedbackDto } from "./dto/feedback.dto.js";

export const createFeedback = async (studentId: string, data: CreateFeedbackDto) => {
  const [newFeedback] = await db
    .insert(feedbacks)
    .values({
      examId: data.examId,
      studentId: studentId,
      submissionId: data.submissionId,
      experienceRating: data.experienceRating,
      experienceText: data.experienceText,
      aiEvaluationRating: data.aiEvaluationRating,
      aiEvaluationText: data.aiEvaluationText,
    })
    .returning();

  return newFeedback;
};
