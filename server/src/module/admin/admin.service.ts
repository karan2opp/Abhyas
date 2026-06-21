import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { users } from "../auth/user.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

export const assignTeacher = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    if (user.role === "teacher") {
        throw ApiError.badRequest("User is already a teacher");
    }
    if (user.role === "admin" || user.role === "superadmin") {
        throw ApiError.badRequest("Cannot downgrade an admin to teacher");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "teacher" })
        .where(eq(users.email, email))
        .returning();

    return updatedUser;
};

export const revokeTeacher = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    if (user.role !== "teacher") {
        throw ApiError.badRequest("User is not a teacher");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "student" })
        .where(eq(users.email, email))
        .returning();

    return updatedUser;
};

export const getTeachers = async () => {
    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.role, "teacher"));
};

export const getUserByEmail = async (email: string) => {
    const [user] = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.email, email));

    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    return user;
};
