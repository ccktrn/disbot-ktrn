import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { LLMService } from '../../services/llm-service';

export const handleListKeyword = async (interaction: ChatInputCommandInteraction, llmService: LLMService) => {
    const keywords = llmService.getKeywords();
    if (keywords.length === 0) {
        await interaction.reply({ content: '現在登録されているキーワードはありません。', flags: [ MessageFlags.Ephemeral ] });
    } else {
        await interaction.reply({ content: `**現在登録されているキーワード:**\n${keywords.map(kw => `- \`${kw}\``).join('\n')}` });
    }
};
