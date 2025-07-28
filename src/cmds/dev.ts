import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';


const builder = new SlashCommandBuilder()
  .setName('dev')
  .setDescription('dev commands for testing purposes');

const execute = async (interaction: Interaction<CacheType>) => {


  if (!interaction.isChatInputCommand()) return;
  await interaction.reply({
    content: interaction.channel?.isSendable() 
      ? 'This channel is sendable!' 
      : 'This channel is not sendable. Please check the channel permissions.',
    flags: [ MessageFlags.Ephemeral ], // This makes the reply visible only to the user who invoked the command
  });

  
};





const devCmd: SlashCmd = {
  builder,
  execute,
};
export default devCmd;