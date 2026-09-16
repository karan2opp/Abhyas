import { Router } from "express";
import multer from "multer";
import { authenticate, authorize } from "../../common/middleware/auth.middleware.js";
import {
    uploadBookHandler,
    listBooksHandler,
    getBookHandler,
    getSubsectionContentHandler,
    setBookVisibilityHandler,
    deleteBookHandler,
} from "./book.controller.js";

const bookUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 150 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") cb(null, true);
        else cb(new Error("Only PDF files are allowed"));
    },
});

const staff = authorize("system_admin", "teacher", "manager");
const router = Router();

router.post("/", authenticate, staff, bookUpload.single("file"), uploadBookHandler);
router.get("/", authenticate, staff, listBooksHandler);
router.get("/:bookId", authenticate, staff, getBookHandler);
router.get("/:bookId/subsections/:nodeId", authenticate, staff, getSubsectionContentHandler);
router.patch("/:bookId/visibility", authenticate, staff, setBookVisibilityHandler);
router.delete("/:bookId", authenticate, staff, deleteBookHandler);

export default router;
