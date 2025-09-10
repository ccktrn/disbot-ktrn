import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';

const builder = new SlashCommandBuilder()
  .setName('dev')
  .setDescription('dev: random error by 20% or success by 80% after 5 seconds wait');

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await interaction.deferReply({
      flags: [ MessageFlags.Ephemeral ],
    });

    await new Promise<void>((resolve, reject) => {
      const random = Math.random();
      setTimeout(() => {
        if (random < 0.8) {
          resolve();
        } else {
          reject();
        }
      }, 5000)
    });
    await interaction.editReply({
      content: `thank you for waiting!`,
    });
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