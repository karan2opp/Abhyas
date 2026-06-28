import type { Request, Response } from "express";
import * as chatService from "./chat.service.js";

export const getChats = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const chats = await chatService.getChats(teacherId);
    res.status(200).json({ success: true, data: chats });
};

export const getChatById = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const id = req.params.id as string;
    const chat = await chatService.getChatById(id, teacherId);
    res.status(200).json({ success: true, data: chat });
};

export const createChat = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const { message, model } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    const result = await chatService.createChat(teacherId, message, model);
    res.status(201).json({ success: true, data: result });
};

export const initChat = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const { model } = req.body;
    const result = await chatService.createEmptyChat(teacherId, model);
    res.status(201).json({ success: true, data: result });
};

export const addMessageToChat = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const id = req.params.id as string;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    const result = await chatService.addMessageToChat(id, teacherId, message);
    res.status(200).json({ success: true, data: result });
};

export const appendSystemMessage = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const id = req.params.id as string;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required" });
    const result = await chatService.appendSystemMessage(id, teacherId, message);
    res.status(200).json({ success: true, data: result });
};

export const deleteChat = async (req: Request, res: Response) => {
    // @ts-ignore
    const teacherId = req.user._id || req.user.id;
    const id = req.params.id as string;
    await chatService.deleteChat(id, teacherId);
    res.status(200).json({ success: true, message: "Chat deleted" });
};
