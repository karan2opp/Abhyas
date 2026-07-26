import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { organisations, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import type { CreateOrganisationDto } from "./dto/organisation.dto.js";

// ── Create Organisation ──────────────────────────────────────────────────────
const createOrganisation = async (data: CreateOrganisationDto) => {
    const [organisation] = await db.insert(organisations).values({ name: data.name }).returning();
    if (!organisation) throw ApiError.internal("Failed to create organisation");
    return organisation;
};

// ── List Organisations ───────────────────────────────────────────────────────
const listOrganisations = async () => {
    return await db.select().from(organisations);
};

// ── Assign User to Organisation ──────────────────────────────────────────────
const assignUserToOrganisation = async (userId: string, organisationId: string) => {
    const [organisation] = await db.select().from(organisations).where(eq(organisations.id, organisationId));
    if (!organisation) throw ApiError.notFound("Organisation not found");

    const [updatedUser] = await db.update(users)
        .set({ organisationId, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

    if (!updatedUser) throw ApiError.notFound("User not found");

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updatedUser;
    return safeUser;
};

export { createOrganisation, listOrganisations, assignUserToOrganisation };
