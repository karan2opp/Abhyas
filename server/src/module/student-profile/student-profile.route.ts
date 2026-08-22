import { Router } from "express";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import { getStudentProfile } from "./student-profile.service.js";
import { ApiResponse } from "../../common/utils/ApiResponse.js";

const router = Router();

// Staff (teacher / manager / system_admin) can view a student's profile,
// their exams taken and assignments submitted.
router.get(
    "/:studentId",
    authenticate,
    authorize("teacher", "manager", "system_admin"),
    async (req, res, next) => {
        try {
            const result = await getStudentProfile(req.params.studentId as string, req.user!);
            return ApiResponse.ok(res, "Student profile", result);
        } catch (err) {
            next(err);
        }
    }
);

export default router;
