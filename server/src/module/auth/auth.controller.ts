import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/ApiResponse.js";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return ApiResponse.ok(res, "User registered successfully", result);
};

// The sign-in cookie. Deployed it is secure and cross-site. While developing, the site (localhost:3000) and the API
// (127.0.0.1:8000) count as different sites, so on this computer it must still be secure + cross-site (browsers allow that
// on localhost). A phone reaching the API by the home-network address (192.168.x.x over plain http) cannot keep a secure
// cookie, so there it is not secure and uses "lax" (the site and the API share that address).
const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];

const refreshCookieOptions = (req: Request) => {
    const crossSite = process.env.NODE_ENV === "production" || LOCAL_HOSTS.includes(req.hostname);
    return { httpOnly: true, secure: crossSite, sameSite: (crossSite ? "none" : "lax") as "none" | "lax" };
};

// Sets the sign-in cookie and sends the token and user back. Used by login and by verifying the email code.
const sendSession = (req: Request, res: Response, message: string, session: Awaited<ReturnType<typeof authService.login>>) => {
    res.cookie("refreshToken", session.refreshToken, {
        ...refreshCookieOptions(req),
        maxAge: 7 * 24 * 60 * 60 * 1000
    })
    return ApiResponse.ok(res, message, { accessToken: session.accessToken, user: session.safeUser })
}

export const login = async (req: Request, res: Response) => {
    const result = await authService.login(req.body)
    return sendSession(req, res, "User logged in successfully", result)
}
export const logout = async (req: Request, res: Response) => {
    const result = await authService.logout(req.user!.id)

    // Must match the attributes the cookie was set with (see login). A browser ignores a "strict" cookie sent in a reply
    // to a request from another site, so with the site and the API on different domains this would not log anyone out.
    res.clearCookie("refreshToken", refreshCookieOptions(req));
    return ApiResponse.ok(res, "User logged out successfully", result)
}

export const verifyOtp = async (req: Request, res: Response) => {
    const result = await authService.verifyOtp(req.body);
    return sendSession(req, res, "Email verified successfully", result);
};

export const resendOtp = async (req: Request, res: Response) => {
    await authService.resendOtp(req.body.email);
    return ApiResponse.ok(res, "Verification code sent to your email", null);
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
    const { email, otp, password } = req.body;
    await authService.resetPassword(email, otp, password);
    return ApiResponse.ok(res, "Password reset successful", null);
};

export const getMe = async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.id);
    return ApiResponse.ok(res, "User profile", user);
};

export const updateProfile = async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.id, req.body, req.file);
    return ApiResponse.ok(res, "Profile updated successfully", user);
};