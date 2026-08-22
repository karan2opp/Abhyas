import { Router } from "express";
import * as controller from "./classroom.controller.js";
import validate from "../../common/middleware/validate.middleware.js";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import {
    createClassroomSchema,
    updateClassroomSchema,
    regenerateJoinCodeSchema,
    joinClassroomSchema,
    addTeacherSchema,
    inviteStudentSchema,
} from "./dto/classroom.dto.js";

const router = Router();

router.post("/", authenticate, authorize("teacher", "manager"), validate(createClassroomSchema), controller.createClassroom);
router.get("/", authenticate, authorize("teacher", "manager"), controller.getMyClassrooms);
router.get("/org", authenticate, authorize("manager"), controller.listOrganisationClassrooms);
router.patch("/:id", authenticate, authorize("teacher", "manager"), validate(updateClassroomSchema), controller.updateClassroom);
router.delete("/:id", authenticate, authorize("teacher", "manager"), controller.deleteClassroom);

router.get("/:id/roster", authenticate, authorize("teacher", "manager"), controller.getClassroomRoster);

router.get("/:id/teachers", authenticate, authorize("teacher", "manager"), controller.listTeachers);
router.post("/:id/teachers", authenticate, authorize("teacher", "manager"), validate(addTeacherSchema), controller.addTeacher);
router.delete("/:id/teachers/:teacherId", authenticate, authorize("teacher", "manager"), controller.removeTeacher);

router.post("/:id/invite", authenticate, authorize("teacher", "manager"), validate(inviteStudentSchema), controller.inviteStudent);

router.post("/:id/join-code/regenerate", authenticate, authorize("teacher", "manager"), validate(regenerateJoinCodeSchema), controller.regenerateJoinCode);
router.post("/:id/join-code/revoke", authenticate, authorize("teacher", "manager"), controller.revokeJoinCode);

router.post("/join", authenticate, authorize("student"), validate(joinClassroomSchema), controller.joinClassroom);
router.get("/me", authenticate, authorize("student"), controller.getMyClassroomsAsStudent);

export default router;
