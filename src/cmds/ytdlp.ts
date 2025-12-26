import { SlashCommandBuilder, Interaction, CacheType, MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder } from 'discord.js'
import { SlashCmd } from '../type';
import { Format, supportedFormats, updateYtdlpCmdBuilder, ytdlpCmdBuilder } from '../lib/ytdlp-cmd-builder';
import { fetchTitleYT } from '../lib/fetchTitleYT';

const ONLINE_UPLOAD_URL = "https://litterbox.catbox.moe/resources/internals/api.php";
const ONLINE_UPLOAD_RETENTION = '24h'; // '1h', '24h', '72h', to set retention time
const DIRECT_UPLOAD_LIMIT = 8 * 1024 * 1024; // 8MB limit for direct upload


const outputDir = 'outputs';

const builder = new SlashCommandBuilder()
  .setName('ytdlp')
  .addStringOption(option => 
    option
      .setName('url')
      .setDescription('The URL of the YouTube video to download')
  )
  .addStringOption(option => 
    option
      .setName('format')
      .setDescription('The format to download')
      .addChoices(
        supportedFormats.map(f => ({ name: f, value: f }))
      )
  )
  .addBooleanOption(option =>
    option
      .setName('update')
      .setDescription('only update yt-dlp binary')
      .setRequired(false)
  )
  .setDescription('YouTube download commands');

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    // Defer the reply to give more time for processing
    await interaction.deferReply({
      // flags: [ MessageFlags.Ephemeral ], 
    });
    const isUpdate = interaction.options.getBoolean('update') || false;
    const url = interaction.options.getString('url');
    const format = interaction.options.getString('format') || 'm4a';

    // update yt-dlp binary
    if (isUpdate) {
      console.log(`[/ytdlp] updating yt-dlp binary`);
      const proc = Bun.spawn({
        cmd: updateYtdlpCmdBuilder(),
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const res = await proc.exited;
      if (res !== 0) {
        // on error
        await interaction.editReply({
          content: `yt-dlp update process failed with exit code ${res}`,
        });
        console.log(`[/ytdlp] => yt-dlp update process failed with exit code ${res}`);
        return;
      }
      await interaction.editReply({
        content: `yt-dlp has been updated successfully!`,
      });
      console.log(`[/ytdlp] => yt-dlp updated successfully`);
      return;
    }

    // 
    if (!url) {
      await interaction.editReply({
        content: 'URL is required.',
      });
      return;
    }
    if (format && !(supportedFormats as string[]).includes(format)) {
      await interaction.editReply({
        content: `Unsupported format: ${format}. Supported formats are: ${supportedFormats.join(', ')}`,
      });
      return;
    }    
    // get file name from fetch metadata
    console.log(`[/ytdlp] get url: ${url}`);
    const title = await fetchTitleYT(url);
    if (!title) {
      await interaction.editReply({
        content: `Failed to fetch video title from URL: ${url}`,
      });
      console.log(`[/ytdlp] => failed fetching url title`);
      return;
    }
    // const outputPath = `${outputDir}/${title.replace(/[/\\?%*:|"<>]/g, '_')}.${format}`
    const outputPath = `${outputDir}/output.${format}` // filename はあとでせってい

    const cmd = ytdlpCmdBuilder( url, { 
      format: format as Format, 
      outputPath: outputPath,
      embedThumbnail: true 
    });
    console.log(`[/ytdlp] executing yt-dlp with command: ${cmd.join(' ')}`);
    const proc = Bun.spawn({
      cmd: cmd,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    const res = await proc.exited;
    if (res !== 0) {
      // on error
      await interaction.editReply({
        content: `yt-dlp process failed with exit code ${res}`,
      });
      console.log(`[/ytdlp] => yt-dlp process failed with exit code ${res}`);
      return;
    }

    // get file
    const file = Bun.file(outputPath);
    console.log(`[/ytdlp] downloaded file size: ${(file.size / 1024).toFixed(2)} KB`);
    if (file.size < DIRECT_UPLOAD_LIMIT) {
      // create attachment
      const newAttachment = new AttachmentBuilder(
        outputPath, { name: `${title}.${format}` }
      );

      await interaction.editReply({
        content: `Download completed successfully!\n Here is your file:`,
        files: [newAttachment],
      });
      console.log(`[/ytdlp] => sent file: ${title}.${format}`);

    } else {
      // file too large, upload to catbox.moe
      const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', ONLINE_UPLOAD_RETENTION); 
        formData.append('fileToUpload', file);
        try {
          const response = await fetch(ONLINE_UPLOAD_URL, {
              method: "POST",
              body: formData,
          });
          const resUrl = await response.text();
          if (!resUrl.startsWith('http')) {
            throw new Error(`catbox.moe upload failed: ${resUrl}`);
          }
          await interaction.editReply({
            content: `File is too large to send directly. Please download from this url (retension: ${ONLINE_UPLOAD_RETENTION}):\n${resUrl}`,
          });
          console.log(`[/ytdlp] => uploaded to catbox.moe: ${resUrl}`);
        } catch (error) {
          console.error('Error uploading to catbox.moe:', error);
          await interaction.editReply({
            content: `Failed to upload the file to catbox.moe: ${error}`,
          });
          return;
        }
    }

  } catch (error) {
    console.error('Error in ytdlp command:', error);
    if (!interaction.isChatInputCommand()) return;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `An error occurred while processing your request: ${error}`,
      });
    } else {
      await interaction.reply({
        content: `An error occurred while processing your request: ${error}`,
        flags: [ MessageFlags.Ephemeral ],
      });
    }
    console.log(`[/ytdlp] => unknown error occurred`);
  }
};

const ytdlpCmd: SlashCmd = {
  builder,
  execute,
};

export default ytdlpCmd;