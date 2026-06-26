import { SlashCommandBuilder, Interaction, CacheType, MessageFlags, AttachmentBuilder } from 'discord.js'
import { SlashCmd } from '../type';
import { supportedFormats } from '../lib/ytdlp/ytdlp-cmd-builder';
import { YtdlpService } from '../services/ytdlp-service';

import { handleUpdate } from '../handlers/ytdlp/update';
import { handleDownload } from '../handlers/ytdlp/download';

const ytdlpService = new YtdlpService();
const builder = new SlashCommandBuilder()
  .setName('ytdlp')
  .setDescription('Download video from ANY site supported by yt-dlp or update the tool')
  .addSubcommand(subcommand =>
    subcommand
      .setName('download')
      .setDescription('Download a video')
      .addStringOption(option => 
        option.setName('url').setDescription('The URL of the video').setRequired(true)
      )
      .addStringOption(option => 
        option.setName('format').setDescription('The format to download').addChoices(supportedFormats.map(f => ({ name: f, value: f })))
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('update')
      .setDescription('Update yt-dlp binary')
  );



const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'update') {
      await handleUpdate(interaction, ytdlpService);
    }
    else if (subcommand === 'download') {
      await handleDownload(interaction, ytdlpService);
    }
  } catch (error) {
    console.error('Error in ytdlp command:', error);
    const msg = `An error occurred: ${error}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
    }
  }
};

const ytdlpCmd: SlashCmd = { builder, execute };
export default ytdlpCmd;