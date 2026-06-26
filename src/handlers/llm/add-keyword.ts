import { ChatInputCommandInteraction } from 'discord.js';
import { LLMService } from '../../services/llm-service';

export const handleAddKeyword = async (interaction: ChatInputCommandInteraction, llmService: LLMService) => {
    const keyword = interaction.options.getString('keyword', true);
    llmService.addKeyword(keyword);
    await interaction.reply({ content: `キーワード \`${keyword}\` を追加しました。` });
};
