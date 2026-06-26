import { ChatInputCommandInteraction } from 'discord.js';
import { YtdlpService } from '../../services/ytdlp-service';

export const handleUpdate = async (interaction: ChatInputCommandInteraction, ytdlpService: YtdlpService) => {
    const result = await ytdlpService.update();
    await interaction.editReply({ content: result.msg });
};
