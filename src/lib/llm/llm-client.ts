import OpenAI from "openai";
import { LLMConfigRepository } from "../../repositories/llm-config-repository";

// 環境変数から設定を取得 (デフォルトはOpenRouter)
const apiKey = process.env.LLM_API_KEY || "";
const baseURL = process.env.LLM_API_BASEURL || "https://openrouter.ai/api/v1";

const openai = new OpenAI({
  baseURL,
  apiKey,
});

const configRepo = new LLMConfigRepository();

export const generateLLMResponse = async (prompt: string): Promise<string> => {
  if (!apiKey) {
    return "エラー: LLM_API_KEY が環境変数に設定されていません。";
  }

  // DBからモデル設定を取得。なければ環境変数、それでもなければデフォルトを使用
  const dbModel = configRepo.getConfig("model_name");
  const modelName = dbModel || process.env.LLM_API_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free";

  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: "あなたはDiscordの便利なAIアシスタントです。フレンドリーに、かつ簡潔に日本語で返答してください。" },
        { role: "user", content: prompt }
      ],
    });

    return response.choices[0]?.message?.content || "返答を生成できませんでした。";
  } catch (error) {
    console.error("LLM API error:", error);
    return "申し訳ありません、LLM APIとの通信中にエラーが発生しました。";
  }
};
