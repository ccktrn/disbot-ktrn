import { ChatInputCommandInteraction } from 'discord.js';
import { ReminderService } from '../../services/reminder-service';

export const handleUnset = async (interaction: ChatInputCommandInteraction, reminderService: ReminderService) => {
    const userId = interaction.user.id;
    const id = interaction.options.getInteger('id', true);
    
    const removed = reminderService.removeReminder(id, userId);
    if (removed) {
        await interaction.reply({ content: `✅ ID: **${id}** のリマインダーを削除しました。` });
    } else {
        await interaction.reply({ content: `❌ 指定されたIDのリマインダーが見つからないか、権限がありません。` });
    }
};
