import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';
import { ReminderRepository } from '../repositories/reminder-repository';

const reminderRepo = new ReminderRepository();

const builder = new SlashCommandBuilder()
  .setName('reminder')
  .setDescription('リマインダーの登録や管理を行います。')
  .addSubcommand(subcommand =>
    subcommand
      .setName('set')
      .setDescription('リマインダーを登録します。')
      .addStringOption(option => 
        option.setName('time')
          .setDescription('時間 (例: 10m, 1h, 2d)')
          .setRequired(true)
      )
      .addStringOption(option => 
        option.setName('content')
          .setDescription('リマインドする内容')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('現在登録されているリマインダーの一覧を表示します。')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('unset')
      .setDescription('リマインダーを削除します。')
      .addIntegerOption(option => 
        option.setName('id')
          .setDescription('削除したいリマインダーのID (listで確認できます)')
          .setRequired(true)
      )
  );

// 時間パース関数 (相対時間: 10m, 1h, 2d または 絶対時間: 2026/3/31, 2026/3/31 15:30)
const parseTriggerTime = (timeStr: string): number | null => {
  const trimmed = timeStr.trim();
  
  // 1. 相対時間のパース
  const relativeMatch = trimmed.match(/^(\d+)(m|h|d)$/);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    
    if (unit === 'm') return Date.now() + value * 60 * 1000;
    if (unit === 'h') return Date.now() + value * 60 * 60 * 1000;
    if (unit === 'd') return Date.now() + value * 24 * 60 * 60 * 1000;
  }
  
  // 2. 絶対時間のパース (JSTとして解釈)
  // "2026/3/31" や "2026/03/31 15:00" など
  // タイムゾーン指定がない場合は JST (+09:00) を補完する
  const tzSuffix = (trimmed.includes('+') || trimmed.toUpperCase().includes('Z')) ? '' : ' GMT+0900';
  const parsedDate = new Date(trimmed + tzSuffix);
  
  if (!isNaN(parsedDate.getTime())) {
    // 過去の時間が指定された場合は null を返すか、そのまま返すか
    // ここではそのまま返して、すぐに通知される仕様にする
    return parsedDate.getTime();
  }

  return null;
};

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    if (subcommand === 'set') {
      const timeStr = interaction.options.getString('time', true);
      const content = interaction.options.getString('content', true);
      
      const triggerAt = parseTriggerTime(timeStr);
      if (!triggerAt) {
        await interaction.reply({ content: '時間の指定が正しくありません。`10m`, `1h`, `2d` または `2026/3/31 15:00` の形式で指定してください。', flags: [ MessageFlags.Ephemeral ] });
        return;
      }
      reminderRepo.addReminder(userId, interaction.channelId, content, triggerAt);

      const date = new Date(triggerAt);
      const formattedDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      await interaction.reply({ content: `✅ **${formattedDate}** にリマインドします: \`${content}\`` });
    } 
    else if (subcommand === 'list') {
      const reminders = reminderRepo.getRemindersForUser(userId);
      if (reminders.length === 0) {
        await interaction.reply({ content: '登録されているリマインダーはありません。', flags: [ MessageFlags.Ephemeral ] });
      } else {
        const lines = reminders.map(r => {
          const d = new Date(r.trigger_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
          return `ID: **${r.id}** | ${d} | \`${r.content}\``;
        });
        await interaction.reply({ content: `**あなたのリマインダー一覧:**\n${lines.join('\n')}`, flags: [ MessageFlags.Ephemeral ] });
      }
    } 
    else if (subcommand === 'unset') {
      const id = interaction.options.getInteger('id', true);
      const removed = reminderRepo.removeReminder(id, userId);
      if (removed) {
        await interaction.reply({ content: `✅ ID: **${id}** のリマインダーを削除しました。` });
      } else {
        await interaction.reply({ content: `❌ ID: **${id}** のリマインダーが見つからないか、権限がありません。`, flags: [ MessageFlags.Ephemeral ] });
      }
    }
  } catch (error) {
    console.error("Error in /reminder command:", error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: "エラーが発生しました。" });
    } else {
      await interaction.reply({ content: "エラーが発生しました。", flags: [ MessageFlags.Ephemeral ] });
    }
  }
};

const reminderCmd: SlashCmd = {
  builder,
  execute,
};
export default reminderCmd;
