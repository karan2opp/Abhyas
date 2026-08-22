import { eq } from "drizzle-orm";
import db from "../../common/db/index.js";
import { users } from "../auth/user.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";

export const assignAdmin = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    if (user.role === "system_admin") {
        throw ApiError.badRequest("User is already a system admin");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "system_admin" })
        .where(eq(users.email, email))
        .returning();

    return updatedUser;
};

export const revokeAdmin = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
        throw ApiError.notFound("User not found with this email address");
    }

    if (user.role !== "system_admin") {
        throw ApiError.badRequest("User is not a system admin");
    }

    const [updatedUser] = await db.update(users)
        .set({ role: "student" })
        .where(eq(users.email, email))
        .returning();

    return updatedUser;
};

export const getAdmins = async () => {
    return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
    }).from(users).where(eq(users.role, "system_admin"));
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
