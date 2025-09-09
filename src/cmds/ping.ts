import { SlashCommandBuilder, Interaction, CacheType, MessageFlags } from 'discord.js'
import { SlashCmd } from '../type';


const builder = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Checks the bot\'s latency.');

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  interaction.reply({
    content: `Pong! Latency is ${Date.now() - interaction.createdTimestamp}ms.`,
    flags: [ MessageFlags.Ephemeral ], // This makes the reply visible only to the user who invoked the command
  });
};


const pingCmd: SlashCmd = {
  builder,
  execute,
};
export default pingCmd;