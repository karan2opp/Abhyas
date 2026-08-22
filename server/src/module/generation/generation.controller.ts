import type { Request, Response, NextFunction } from "express";
import { 
    generateExamBlueprint, 
    verifyExamBlueprint 
} from "./generation.service.js";
import { generationQueue } from "../../common/queue/queues.js";
import { assertQuota } from "../billing/usage.service.js";

export const generateBlueprintHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await generateExamBlueprint(req.body);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const verifyBlueprintHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await verifyExamBlueprint(req.body);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const enqueueGenerateFromBlueprintHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const blueprint = req.body;
        if (!blueprint || !Array.isArray(blueprint.sections)) {
            res.status(400).json({ success: false, message: "Invalid blueprint structure." });
            return;
        }

        // Metering pre-check: ensure the organisation still has generation quota
        // before accepting the job. Teachers/managers belong to an org; system
        // admins have no org and are not metered.
        const organisationId = req.user?.organisationId ?? null;
        if (organisationId) {
            const estimatedCount = blueprint.sections.reduce(
                (sum: number, sec: any) => sum + (sec.blocks || []).reduce(
                    (bs: number, b: any) => bs + (b.topics || []).reduce(
                        (ts: number, t: any) => ts + (t.subtopics || []).reduce(
                            (ss: number, st: any) => ss + (st.allocatedQuestions || 0),
                            0
                        ),
                        0
                    ),
                    0
                ),
                0
            );
            await assertQuota(organisationId, "question_generation", estimatedCount);
        }

        const job = await generationQueue.add("generate-from-blueprint", { blueprint, organisationId }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
        });
        res.status(202).json({ success: true, data: { jobId: job.id } });
    } catch (error) {
        next(error);
    }
};
