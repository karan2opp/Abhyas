import { eq, and, desc } from "drizzle-orm";
import db from "../../common/db/index.js";
import { chats } from "./chat.schema.js";
import { ApiError } from "../../common/utils/ApiError.js";
import { checkOpenAI, checkMistral } from "../../common/agent/openai.client.js";

import { run } from "@openai/agents";

export const getChats = async (teacherId: string) => {
    return await db.select({
        _id: chats.id,
        title: chats.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
    }).from(chats).where(eq(chats.teacherId, teacherId)).orderBy(desc(chats.updatedAt));
};

export const generateChatTitle = async (firstMessage: string) => {
    try {
        const client = await checkOpenAI();
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes a user's exam creation request into a short, punchy 3-4 word title (e.g., 'ML Mystery Exam' or 'Data Structures Mock'). Return ONLY the raw string title, no quotes. If the user is just saying hello, greeting you, or the exam topic is not yet clear, you MUST strictly return 'New Chat'." },
                { role: "user", content: firstMessage }
            ],
            temperature: 0.5,
            max_tokens: 15
        });
        const generated = response.choices[0]?.message?.content?.trim();
        return generated || "New Chat";
    } catch (e) {
        return "New Chat";
    }
};

export const getChatById = async (chatId: string, teacherId: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return { ...chat, _id: chat.id };
};

export const createEmptyChat = async (teacherId: string, model: string = "gpt-4o-mini") => {
    const chatArr = await db.insert(chats).values({
        teacherId,
        title: "New Chat",
        model,
        messages: []
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");
    return { ...chat, _id: chat.id };
};

export const createChat = async (teacherId: string, firstMessage: string, model: string = "gpt-4o-mini") => {
    const title = await generateChatTitle(firstMessage);
    
    const chatArr = await db.insert(chats).values({
        teacherId,
        title,
        model,
        messages: [{ role: "user", content: firstMessage }]
    }).returning();
    const chat = chatArr[0];
    if (!chat) throw new ApiError(500, "Failed to create chat");

    return { chat: { ...chat, _id: chat.id } };
};

export const addMessageToChat = async (chatId: string, teacherId: string, content: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");

    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");

    let chatTitle = chat.title;
    if (chatTitle === "New Chat" && content) {
        chatTitle = await generateChatTitle(content);
    }

    const updatedMessages = [...(chat.messages as any[]), { role: "user", content }];

    await db.update(chats).set({ messages: updatedMessages, title: chatTitle, updatedAt: new Date() }).where(eq(chats.id, chatId));

    return { chat: { ...chat, messages: updatedMessages, title: chatTitle, _id: chat.id } };
};

export const appendSystemMessage = async (chatId: string, teacherId: string, message: string) => {
    const chatArr = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId)));
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    
    const finalMessages = [...(chat.messages || []), { role: "system", content: message }];
    await db.update(chats).set({ messages: finalMessages, updatedAt: new Date() }).where(eq(chats.id, chatId));
    
    return { chat: { ...chat, messages: finalMessages, _id: chat.id } };
};

export const deleteChat = async (chatId: string, teacherId: string) => {
    const chatArr = await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.teacherId, teacherId))).returning();
    if (!chatArr.length) throw new ApiError(404, "Chat not found");
    const chat = chatArr[0];
    if (!chat) throw new ApiError(404, "Chat not found");
    return chat;
};
