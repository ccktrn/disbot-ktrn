import { ChatInputCommandInteraction } from 'discord.js';
import { LLMService } from '../../services/llm-service';

export const handleChat = async (interaction: ChatInputCommandInteraction, llmService: LLMService) => {
    const message = interaction.options.getString('message', true);
    await interaction.deferReply();
    const response = await llmService.generateChatResponse(message);
    const safeResponse = response.length > 2000 ? response.substring(0, 1997) + "..." : response;
    await interaction.editReply({ content: safeResponse });
};
