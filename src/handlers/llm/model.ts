import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { LLMService } from '../../services/llm-service';

export const handleModel = async (interaction: ChatInputCommandInteraction, llmService: LLMService) => {
    const name = interaction.options.getString('name');
    if (name) {
        llmService.setModel(name);
        await interaction.reply({ content: `使用するモデルを \`${name}\` に設定しました。` });
    } else {
        const currentModel = llmService.getModel();
        await interaction.reply({ content: `現在のモデル設定: \`${currentModel}\``, flags: [ MessageFlags.Ephemeral ] });
    }
};
