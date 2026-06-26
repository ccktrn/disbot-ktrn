import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { ReminderService } from '../../services/reminder-service';

export const handleList = async (interaction: ChatInputCommandInteraction, reminderService: ReminderService) => {
    const userId = interaction.user.id;
    const reminders = reminderService.getRemindersForUser(userId);
    
    if (reminders.length === 0) {
        await interaction.reply({ content: '登録されているリマインダーはありません。', flags: [ MessageFlags.Ephemeral ] });
    } else {
        const listStr = reminders.map(r => {
            const d = new Date(r.trigger_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            return `\`ID: ${r.id}\` **${d}**\n> ${r.content}`;
        }).join('\n\n');
        await interaction.reply({ content: `**あなたのリマインダー一覧:**\n\n${listStr}`, flags: [ MessageFlags.Ephemeral ] });
    }
};
