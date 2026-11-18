import { createHash, randomBytes } from "crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import db from "../../common/db/index.js";
import { organisations, organisationInvites, users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { assertTeacherQuota } from "../billing/usage.service.js";
import { sendOrganisationInviteEmail } from "../../common/config/email.js";

// How long an invitation stays open.
const INVITE_DAYS = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

const inviteLink = (token: string) => `${process.env.FRONTEND_URL || "http://localhost:3000"}/invite/${token}`;

type InviteRow = typeof organisationInvites.$inferSelect;

// What the manager and the invited person see: "pending" turns into "expired" once the time is up.
const statusOf = (invite: InviteRow): "pending" | "accepted" | "declined" | "revoked" | "expired" =>
    invite.status === "pending" && invite.expiresAt.getTime() < Date.now() ? "expired" : invite.status;

// ── Manager: invite someone to be a teacher ───────────────────────────────────
// Nobody is added without agreeing: this only sends the invitation. Inviting an address that already has an open invitation
// sends it again with a fresh link.
export const inviteTeacher = async (organisationId: string, invitedBy: string, rawEmail: string) => {
    const email = rawEmail.trim().toLowerCase();

    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    if (existingUser) {
        if (existingUser.role === "manager" || existingUser.role === "system_admin") {
            throw ApiError.badRequest("A manager or system admin cannot be invited as a teacher");
        }
        if (existingUser.organisationId === organisationId) {
            throw ApiError.badRequest(existingUser.role === "teacher" ? "This person is already a teacher in your organisation" : "This person already belongs to your organisation");
        }
        if (existingUser.organisationId) {
            throw ApiError.badRequest("This person already belongs to another organisation. A teacher can only be in one.");
        }
    }

    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000);

    const [open] = await db
        .select()
        .from(organisationInvites)
        .where(and(eq(organisationInvites.organisationId, organisationId), eq(organisationInvites.email, email), eq(organisationInvites.status, "pending")));

    const [invite] = open
        ? await db.update(organisationInvites).set({ tokenHash: hashToken(token), expiresAt }).where(eq(organisationInvites.id, open.id)).returning()
        : await db.insert(organisationInvites).values({ organisationId, email, tokenHash: hashToken(token), invitedBy, expiresAt }).returning();
    if (!invite) throw ApiError.internal("Failed to create the invitation");

    await sendInviteEmail(invite, token);
    return { id: invite.id, email: invite.email, status: statusOf(invite), expiresAt: invite.expiresAt };
};

const sendInviteEmail = async (invite: InviteRow, token: string) => {
    const [organisation] = await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, invite.organisationId));
    const [inviter] = invite.invitedBy ? await db.select({ name: users.name }).from(users).where(eq(users.id, invite.invitedBy)) : [];
    const link = inviteLink(token);

    // Same as the other emails: the link is also in the server log, so it can be used while developing without a mail service.
    console.log(`\n🔗 ORGANISATION INVITE for ${invite.email}: ${link}\n`);

    try {
        await sendOrganisationInviteEmail(invite.email, organisation?.name ?? "an organisation", inviter?.name ?? null, link);
    } catch {
        throw new ApiError(502, "The invitation was saved, but the email could not be sent. Use Resend to try again.");
    }
};

// ── Manager: the invitations of their organisation ────────────────────────────
export const listInvites = async (organisationId: string) => {
    const rows = await db
        .select()
        .from(organisationInvites)
        .where(and(eq(organisationInvites.organisationId, organisationId), ne(organisationInvites.status, "revoked")))
        .orderBy(desc(organisationInvites.createdAt))
        .limit(50);
    return rows.map((r) => ({ id: r.id, email: r.email, status: statusOf(r), expiresAt: r.expiresAt, createdAt: r.createdAt, respondedAt: r.respondedAt }));
};

export const resendInvite = async (organisationId: string, inviteId: string) => {
    const [invite] = await db.select().from(organisationInvites).where(and(eq(organisationInvites.id, inviteId), eq(organisationInvites.organisationId, organisationId)));
    if (!invite) throw ApiError.notFound("Invitation not found");
    if (invite.status !== "pending") throw ApiError.badRequest(`This invitation was ${invite.status}. Send a new one instead.`);
    return inviteTeacher(organisationId, invite.invitedBy ?? "", invite.email);
};

export const revokeInvite = async (organisationId: string, inviteId: string) => {
    const [invite] = await db
        .update(organisationInvites)
        .set({ status: "revoked", respondedAt: new Date() })
        .where(and(eq(organisationInvites.id, inviteId), eq(organisationInvites.organisationId, organisationId), eq(organisationInvites.status, "pending")))
        .returning();
    if (!invite) throw ApiError.notFound("No open invitation found");
};

// ── The invited person: look at, accept, or decline the invitation ────────────
const findByToken = async (token: string) => {
    const [invite] = await db.select().from(organisationInvites).where(eq(organisationInvites.tokenHash, hashToken(token)));
    if (!invite) throw ApiError.notFound("This invitation link is not valid");
    return invite;
};

/** What the invitation page shows. Needs no sign-in: whoever holds the link is the person it was sent to. */
export const getInviteByToken = async (token: string) => {
    const invite = await findByToken(token);
    const [organisation] = await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, invite.organisationId));
    const [inviter] = invite.invitedBy ? await db.select({ name: users.name }).from(users).where(eq(users.id, invite.invitedBy)) : [];
    return {
        organisationName: organisation?.name ?? "an organisation",
        invitedBy: inviter?.name ?? null,
        email: invite.email,
        status: statusOf(invite),
        expiresAt: invite.expiresAt,
    };
};

export const acceptInvite = async (token: string, userId: string) => {
    const invite = await findByToken(token);
    const status = statusOf(invite);
    if (status !== "pending") throw ApiError.badRequest(status === "expired" ? "This invitation has expired. Ask for a new one." : `This invitation was ${status}.`);

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");
    if (user.email.toLowerCase() !== invite.email) {
        throw ApiError.forbidden(`This invitation was sent to ${invite.email}. You are signed in as ${user.email}.`);
    }
    if (!user.isVerified) throw ApiError.forbidden("Verify your email address first, then accept the invitation.");
    if (user.role === "manager" || user.role === "system_admin") {
        throw ApiError.badRequest("A manager or system admin cannot become a teacher.");
    }
    if (user.organisationId && user.organisationId !== invite.organisationId) {
        throw ApiError.badRequest("You already belong to another organisation. A teacher can only be in one.");
    }

    if (user.organisationId !== invite.organisationId) await assertTeacherQuota(invite.organisationId);

    return await db.transaction(async (tx) => {
        // Only one answer counts: if two requests race, the second finds the invitation already answered.
        const [taken] = await tx
            .update(organisationInvites)
            .set({ status: "accepted", respondedAt: new Date() })
            .where(and(eq(organisationInvites.id, invite.id), eq(organisationInvites.status, "pending")))
            .returning();
        if (!taken) throw ApiError.badRequest("This invitation was already answered.");

        const [updated] = await tx
            .update(users)
            .set({ role: "teacher", organisationId: invite.organisationId, updatedAt: new Date() })
            .where(eq(users.id, user.id))
            .returning();
        if (!updated) throw ApiError.internal("Failed to join the organisation");

        const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = updated;
        return safeUser;
    });
};

export const declineInvite = async (token: string) => {
    const invite = await findByToken(token);
    const status = statusOf(invite);
    if (status !== "pending") throw ApiError.badRequest(status === "expired" ? "This invitation has expired." : `This invitation was already ${status}.`);

    await db
        .update(organisationInvites)
        .set({ status: "declined", respondedAt: new Date() })
        .where(and(eq(organisationInvites.id, invite.id), eq(organisationInvites.status, "pending")));
};
