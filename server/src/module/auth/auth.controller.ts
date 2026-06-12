import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return ApiResponse.ok(res, "User registered successfully", result);
};

export const login = async (req: Request, res: Response) => {
    const result = await authService.login(req.body)

    res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",  // ← change this
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
    return ApiResponse.ok(res, "User logged in successfully", { accessToken: result.accessToken, user: result.safeUser })
}
export const logout = async (req: Request, res: Response) => {
    const result = await authService.logout(req.user!.id)

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });
    return ApiResponse.ok(res, "User logged out successfully", result)
}

export const verifyEmail = async (req: Request, res: Response) => {
    await authService.verifyEmail(req.params.token as string);
    // User requested to redirect after verification
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
    // return ApiResponse.ok(res, "Email verified successfully", null);
};

export const refreshToken = async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken;
    const { accessToken } = await authService.refresh(token);
    return ApiResponse.ok(res, "Token refreshed", { accessToken });
};

export const forgotPassword = async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    return ApiResponse.ok(res, "Password reset email sent", null);
};

export const resetPassword = async (req: Request, res: Response) => {
    await authService.resetPassword(req.params.token as string, req.body.password);
    return ApiResponse.ok(res, "Password reset successful", null);
};

export const getMe = async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.id);
    return ApiResponse.ok(res, "User profile", user);
};