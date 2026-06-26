import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { LLMService } from '../../services/llm-service';

export const handleRemoveKeyword = async (interaction: ChatInputCommandInteraction, llmService: LLMService) => {
    const keyword = interaction.options.getString('keyword', true);
    const removed = llmService.removeKeyword(keyword);
    if (removed) {
        await interaction.reply({ content: `キーワード \`${keyword}\` を削除しました。` });
    } else {
        await interaction.reply({ content: `キーワード \`${keyword}\` は登録されていません。`, flags: [ MessageFlags.Ephemeral ] });
    }
};
