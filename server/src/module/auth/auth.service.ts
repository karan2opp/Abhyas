import bcrypt from "bcrypt";
import { eq, and, gt, isNotNull } from "drizzle-orm";
import db from "../../common/db/index.js";
import { users } from "../../common/db/schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { sendVerificationEmail, sendResetPasswordEmail } from "../../common/config/email.js";
import {
    generateAccessToken,
    generateRefreshToken,
    generateResetToken,
    verifyRefreshToken,
    hashToken,
} from "../../common/utils/jwt.utils.js";
import type { RegisterDto, LoginDto } from "./auth.dto.js";

// ── Register ──────────────────────────────────────────────────────────────────
const register = async (data: RegisterDto) => {
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (existing) throw ApiError.conflict("User already exists");

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const { rawToken, hashedToken } = generateResetToken();

    const [newUser] = await db.insert(users).values({
        ...data,
        password: hashedPassword,
        verificationToken: hashedToken,
        isVerified: false,
    }).returning();

    try {
        await sendVerificationEmail(data.email, rawToken)
    } catch (err) {
        console.error("Failed to send verification email:", err)
    }
    if (!newUser) throw ApiError.internal("Failed to create user");

    const { password, verificationToken, refreshToken, ...safeUser } = newUser;
    return safeUser;
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async (data: LoginDto) => {
    const [existing] = await db.select().from(users).where(eq(users.email, data.email));
    if (!existing) throw ApiError.unauthorized("Invalid email or password");

    const isPasswordValid = await bcrypt.compare(data.password, existing.password);
    if (!isPasswordValid) throw ApiError.unauthorized("Invalid email or password");

    if (!existing.isVerified) throw ApiError.unauthorized("Please verify your email first");

    const accessToken = generateAccessToken({ id: existing.id, role: existing.role });
    const refreshToken = generateRefreshToken({ id: existing.id });

    await db.update(users)
        .set({ refreshToken: hashToken(refreshToken) })
        .where(eq(users.id, existing.id));

    // reuse existing, no need for extra DB call
    const { password, verificationToken, refreshToken: _, resetPasswordToken, resetPasswordExpires, ...safeUser } = existing;
    return { accessToken, refreshToken, safeUser };
};

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = async (userId: string) => {
    await db.update(users)
        .set({ refreshToken: null })
        .where(eq(users.id, userId));
};

// ── Verify email ──────────────────────────────────────────────────────────────
const verifyEmail = async (token: string) => {
    const trimmed = String(token).trim();
    if (!trimmed) throw ApiError.badRequest("Invalid or expired verification token");

    const hashedInput = hashToken(trimmed);
    let [user] = await db.select().from(users).where(eq(users.verificationToken, hashedInput));

    // fallback: direct match for dev/Postman convenience
    if (!user) {
        [user] = await db.select().from(users).where(eq(users.verificationToken, trimmed));
    }

    if (!user) throw ApiError.badRequest("Invalid or expired verification token");

    const [updatedUser] = await db.update(users)
        .set({ isVerified: true, verificationToken: null })
        .where(eq(users.id, user.id))
        .returning();

    return updatedUser;
};

// ── Forgot password ───────────────────────────────────────────────────────────
const forgotPassword = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw ApiError.notFound("No account with that email");

    const { rawToken, hashedToken } = generateResetToken();

    await db.update(users)
        .set({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
        })
        .where(eq(users.id, user.id));

    try {
        await sendResetPasswordEmail(email, rawToken);
    } catch (err: unknown) {
        console.error("Failed to send reset email:", (err as Error).message);
    }
};

// ── Reset password ────────────────────────────────────────────────────────────
const resetPassword = async (token: string, newPassword: string) => {
    const hashedToken = hashToken(token);

    const [user] = await db.select().from(users).where(
        and(
            eq(users.resetPasswordToken, hashedToken),
            isNotNull(users.resetPasswordExpires),
            gt(users.resetPasswordExpires!, new Date()),
        ),
    );

    if (!user) throw ApiError.badRequest("Invalid or expired reset token");

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.update(users)
        .set({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        })
        .where(eq(users.id, user.id));
};

// ── Refresh token ─────────────────────────────────────────────────────────────
const refresh = async (token: string) => {
    if (!token) throw ApiError.unauthorized("Refresh token missing");

    const decoded = verifyRefreshToken(token) as { id: string };

    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) throw ApiError.unauthorized("User no longer exists");

    if (user.refreshToken !== hashToken(token)) {
        throw ApiError.unauthorized("Invalid refresh token — please log in again");
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    return { accessToken };
};

// ── Get me ────────────────────────────────────────────────────────────────────
const getMe = async (userId: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw ApiError.notFound("User not found");

    const { password, verificationToken, refreshToken, resetPasswordToken, resetPasswordExpires, ...safeUser } = user;
    return safeUser;
};

export { register, login, logout, verifyEmail, forgotPassword, resetPassword, refresh, getMe };