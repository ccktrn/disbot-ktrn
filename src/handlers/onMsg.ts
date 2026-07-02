import { Message, Client } from 'discord.js';
import { LLMService } from '../services/llm-service';

export const handleMessage = async (message: Message, client: Client, llmService: LLMService): Promise<boolean> => {
    if (message.author.bot || !client.user) return false;

    const keywords = llmService.getKeywords();
    const matchedKeyword = keywords.find(kw => message.content.startsWith(kw));
    const isMentioned = message.mentions.has(client.user);
    
    // 返信先が自分かどうか
    let isReplyToBot = false;
    if (message.reference?.messageId) {
        try {
            const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
            isReplyToBot = referencedMsg.author.id === client.user.id;
        } catch (e) {
            console.error("Failed to fetch referenced message", e);
        }
    }
    
    if (matchedKeyword || isMentioned || isReplyToBot) {
        try {
            if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
                await message.channel.sendTyping();
            }
            
            const chatMessages: { role: 'user' | 'assistant', content: string }[] = [];
            
            // もし返信（リプライ）であれば、最大10件までのスレッド（リプライチェーン）をさかのぼる
            if (message.reference?.messageId) {
                let currentMessageId: string | undefined = message.id;
                
                for (let i = 0; i < 10; i++) {
                    if (!currentMessageId) break;
                    try {
                        const fetchedMsg: Message = await message.channel.messages.fetch(currentMessageId);
                        chatMessages.unshift({
                            role: fetchedMsg.author.id === client.user.id ? 'assistant' : 'user',
                            content: fetchedMsg.content
                        });
                        currentMessageId = fetchedMsg.reference?.messageId;
                    } catch (e) {
                        break; // メッセージが取得できなかったらそこで遡るのをやめる
                    }
                }
            } else {
                // 返信でなければ今のメッセージだけ
                chatMessages.push({ role: 'user', content: message.content });
            }

            const response = await llmService.generateChatResponseWithHistory(chatMessages);
            
            // 空のレスポンスが返ってきた場合の安全対策
            let safeResponse = response && response.trim().length > 0 ? response : "（申し訳ありません、回答を生成できませんでした）";
            
            // Discordの文字数制限(2000文字)対策
            if (safeResponse.length > 2000) {
                safeResponse = safeResponse.substring(0, 1997) + "...";
            }
            
            await message.reply(safeResponse);
            return true;
        } catch (error) {
            console.error("Error in keyword response:", error);
            return false;
        }
    }

    return false;
};
