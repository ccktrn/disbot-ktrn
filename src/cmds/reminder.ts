import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';
import { ReminderService } from '../services/reminder-service';

import { handleSet } from '../handlers/reminder/set';
import { handleList } from '../handlers/reminder/list';
import { handleUnset } from '../handlers/reminder/unset';

const reminderService = new ReminderService();

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

// Helper is moved to lib/reminder.ts



const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  const subcommand = interaction.options.getSubcommand();

  try {
    if (subcommand === 'set') {
      await handleSet(interaction, reminderService);
    } 
    else if (subcommand === 'list') {
      await handleList(interaction, reminderService);
    } 
    else if (subcommand === 'unset') {
      await handleUnset(interaction, reminderService);
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
