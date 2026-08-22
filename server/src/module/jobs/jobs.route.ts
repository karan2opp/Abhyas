import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.middleware.js";
import { generationQueue, evaluationQueue } from "../../common/queue/queues.js";

const router = Router();

router.get("/:id", authenticate, async (req, res) => {
    const id = req.params.id as string;
    const job = (await generationQueue.getJob(id)) || (await evaluationQueue.getJob(id));

    if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
    }

    const state = await job.getState();
    return res.json({
        success: true,
        data: {
            id,
            status: state,
            progress: job.progress,
            result: job.returnvalue,
            error: job.failedReason,
        },
    });
});

export default router;
