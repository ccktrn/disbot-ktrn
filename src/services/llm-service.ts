import { Message, Client } from "discord.js";
import { LLMConfigRepository } from "../repositories/llm-config-repository";
import { generateLLMResponse } from "../lib/llm/llm-client";

const SYSTEM_PROMPT = "あなたはDiscordの便利なAIアシスタントです。フレンドリーに、かつ簡潔に日本語で返答してください。";

export class LLMService {
    private configRepo: LLMConfigRepository;

    constructor() {
        this.configRepo = new LLMConfigRepository();
    }

    public async generateChatResponse(message: string): Promise<string> {
        return generateLLMResponse([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: message }
        ]);
    }

    public addKeyword(keyword: string): void {
        this.configRepo.addKeyword(keyword);
    }

    public removeKeyword(keyword: string): boolean {
        return this.configRepo.removeKeyword(keyword);
    }

    public getKeywords(): string[] {
        return this.configRepo.getKeywords();
    }

    public setModel(name: string): void {
        this.configRepo.setConfig('model_name', name);
    }

    public getModel(): string {
        return this.configRepo.getConfig('model_name') || process.env.LLM_API_MODEL || "デフォルト(google/gemini-2.0-flash-lite-preview-02-05:free)";
    }

    public async generateChatResponseWithHistory(chatMessages: { role: "system" | "user" | "assistant", content: string }[]): Promise<string> {
        return generateLLMResponse([
            { role: "system", content: SYSTEM_PROMPT },
            ...chatMessages
        ]);
    }
}
