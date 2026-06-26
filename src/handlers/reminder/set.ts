import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ReminderService } from '../../services/reminder-service';
import { parseTimeInput } from '../../lib/reminder';

export const handleSet = async (interaction: ChatInputCommandInteraction, reminderService: ReminderService) => {
    const timeStr = interaction.options.getString('time', true);
    const content = interaction.options.getString('content', true);
    const userId = interaction.user.id;

    try {
        const triggerAt = parseTimeInput(timeStr);
        if (!triggerAt) {
            await interaction.reply({ content: '時間の指定が正しくありません。`10m`, `1h`, `2d` または `2026/3/31 15:00` の形式で指定してください。', flags: [ MessageFlags.Ephemeral ] });
            return;
        }
        reminderService.addReminder(userId, interaction.channelId, content, triggerAt);

        const date = new Date(triggerAt);
        const formattedDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        await interaction.reply({ content: `✅ リマインダーを設定しました！\n⏰ **${formattedDate}**\n> ${content}` });
    } catch (e) {
        console.error(e);
        await interaction.reply({ content: 'エラーが発生しました。', flags: [ MessageFlags.Ephemeral ] });
    }
};
