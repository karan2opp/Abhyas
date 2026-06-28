import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY;

export const apikeyChecker = () => {
    if (!API_KEY) {
        console.error(
            "Error: OPENAI_API_KEY is not set in the environment variables.",
        );
        process.exit(1);
    }
};
export const checkOpenAI = async () => {
    const openai = (await import("openai")).default;
    const client = new openai.OpenAI({
        apiKey: API_KEY,
    });

    if (!client) {
        console.error("Error: Failed to initialize OpenAI client.");
        process.exit(1);
    }
    console.log("OpenAI client initialized successfully.");
    return client;
};

export const checkMistral = async () => {
    const openai = (await import("openai")).default;
    const client = new openai.OpenAI({
        apiKey: process.env.MISTRAL_API_KEY,
        baseURL: "https://api.mistral.ai/v1",
    });

    if (!client) {
        console.error("Error: Failed to initialize Mistral client.");
        process.exit(1);
    }
    console.log("Mistral client initialized successfully.");
    return client;
};
