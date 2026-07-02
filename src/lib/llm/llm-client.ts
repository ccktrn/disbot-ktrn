import OpenAI from "openai";
import { LLMConfigRepository } from "../../repositories/llm-config-repository";
import { mcpManager } from "../mcp/mcp-manager";

// 環境変数から設定を取得 (デフォルトはOpenRouter)
const apiKey = process.env.LLM_API_KEY || "";
const baseURL = process.env.LLM_API_BASEURL || "https://openrouter.ai/api/v1";

const openai = new OpenAI({
  baseURL,
  apiKey,
});

const configRepo = new LLMConfigRepository();

export const generateLLMResponse = async (chatMessages: any[]): Promise<string> => {
  if (!apiKey) {
    return "エラー: LLM_API_KEY が環境変数に設定されていません。";
  }

  const dbModel = configRepo.getConfig("model_name");
  const modelName = dbModel || process.env.LLM_API_MODEL || "openrouter/free";

  // MCPから利用可能なツールを取得
  const mcpTools = await mcpManager.getAllTools();
  const tools: OpenAI.Chat.ChatCompletionTool[] | undefined = mcpTools.length > 0 ? mcpTools.map(t => ({
    type: "function",
    function: {
      name: `${t.serverName}__${t.tool.name}`,
      description: t.tool.description || "",
      parameters: t.tool.inputSchema
    }
  })) : undefined;

  let messages = [...chatMessages];
  let accumulatedContent = "";

  try {
    // 最大5回のツール呼び出しループ
    for (let i = 0; i < 5; i++) {
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages,
        tools: tools,
        tool_choice: tools ? "auto" : undefined,
      });

      const message = response.choices[0]?.message;
      if (!message) break;

      messages.push(message);

      // モデルが「考え」や「途中経過」をテキストで出力した場合は蓄積する
      if (message.content) {
        accumulatedContent += (accumulatedContent ? "\n" : "") + message.content;
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        const functionCalls = message.tool_calls.filter((tc: any) => tc.type === 'function');
        console.log(`[LLM] LLM decided to call tools: ${functionCalls.map((tc: any) => tc.function.name).join(", ")}`);
        
        // ツールを順番に実行
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const functionCall = toolCall as any;
          const fnName = functionCall.function.name;
          const [serverName, toolName] = fnName.split("__");
          let resultStr = "";
          
          try {
            const args = JSON.parse(functionCall.function.arguments || "{}");
            const result = await mcpManager.callTool(serverName, toolName, args);
            // MCPの結果フォーマットは通常 { content: [{ type: "text", text: "..." }] }
            if (result && result.content && result.content.length > 0) {
              resultStr = result.content.map((c: any) => c.text).join("\n");
            } else {
              resultStr = JSON.stringify(result);
            }
          } catch (e: any) {
            console.error(`[LLM] Tool execution error (${fnName}):`, e);
            resultStr = `Error executing tool: ${e.message}`;
          }

          // ツールの結果をメッセージ履歴に追加
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr
          });
        }
        // ツール実行結果を踏まえて再度LLMを呼び出すためループ継続
        continue;
      }

      // ツール呼び出しがなければ終了
      break;
    }

    return accumulatedContent;
  } catch (error) {
    console.error("LLM API error:", error);
    return "申し訳ありません、LLM APIとの通信中にエラーが発生しました。";
  }
};
