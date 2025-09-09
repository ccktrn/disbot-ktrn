import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';

const builder = new SlashCommandBuilder()
  .setName('dev')
  .setDescription('dev commands for testing purposes');

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await interaction.deferReply({
      flags: [ MessageFlags.Ephemeral ],
    });
    const proc = Bun.spawn({
      cmd: ['sleep', `1`],
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const status = await proc.exited;
    if (status !== 0) {
      await interaction.editReply({
        content: `error: ${status}`,
      });
    } else {
      await interaction.editReply({
        content: `thank you for waiting!`,
      });
    }
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
  } finally {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: [ MessageFlags.Ephemeral ],
      });
    }
  }
};





const devCmd: SlashCmd = {
  builder,
  execute,
};
export default devCmd;