import { SlashCommandBuilder, Interaction, CacheType, MessageFlags, AttachmentBuilder } from 'discord.js'
import { SlashCmd } from '../type';
import { Format, getSupportedFormatsCmdBuilder, supportedFormats, updateYtdlpCmdBuilder, ytdlpCmdBuilder } from '../lib/ytdlp-cmd-builder';
import { fetchTitle } from '../lib/fetchTitle';
import { PCloudService } from '../services/pcloud';
import fs from 'fs';
import path from 'path';
import { get } from 'http';

// --- Services ---
const pCloud = new PCloudService();

// --- Constants ---
const DIRECT_UPLOAD_LIMIT = 8 * 1024 * 1024; // 8MB
const outputDir = 'outputs';
const DISCORD_MSG_LIMIT = 2000;

const builder = new SlashCommandBuilder()
  .setName('ytdlp')
  .addStringOption(option => 
    option.setName('url').setDescription('The URL of the video').setRequired(true)
  )
  .addStringOption(option => 
    option.setName('format').setDescription('The format to download').addChoices(supportedFormats.map(f => ({ name: f, value: f })))
  )
  .addBooleanOption(option =>
    option.setName('update').setDescription('only update yt-dlp binary').setRequired(false)
  )
  .setDescription('Download video from ANY site supported by yt-dlp');

const execute = async (interaction: Interaction<CacheType>) => {
  if (!interaction.isChatInputCommand()) return;

  // クリーンアップ用変数をスコープ外に定義
  let finalPath: string | null = null;
  let tempPath: string | null = null;

  try {
    await interaction.deferReply();
    // --- Options ---
    const isUpdate = interaction.options.getBoolean('update') || false;
    const url = interaction.options.getString('url', true);
    const format = interaction.options.getString('format') || 'm4a';

    // --- Update yt-dlp ---
    if (isUpdate) {
      console.log(`[/ytdlp] updating yt-dlp binary`);
      const proc = Bun.spawn({ cmd: updateYtdlpCmdBuilder(), stdout: 'inherit', stderr: 'inherit' });
      const res = await proc.exited;
      await interaction.editReply({ content: res !== 0 ? `Update failed: code ${res}` : `yt-dlp updated successfully!` });
      return;
    }

    if (format && !(supportedFormats as string[]).includes(format)) {
      await interaction.editReply({ content: `Unsupported format: ${format}` });
      return;
    }

    // --- 1. Fetch Title ---
    console.log(`[/ytdlp] fetching title for: ${url}`);
    let title = await fetchTitle(url);
    if (!title) {
      // タイトル取得失敗時のフォールバック (URLの末尾など)
      title = `video_${Date.now()}`;
      console.log(`[/ytdlp] failed to fetch title, using fallback: ${title}`);
    }

    // --- 2. Download ---
    // 衝突回避のため一時ファイル名にはタイムスタンプをつける
    tempPath = `${outputDir}/${Date.now()}_temp.${format}`;

    const cmd = ytdlpCmdBuilder(url, { 
      format: format as Format, 
      outputPath: tempPath,
      embedThumbnail: true 
    });

    console.log(`[/ytdlp] executing yt-dlp...`);
    const proc = Bun.spawn({ cmd: cmd, stdout: 'pipe', stderr: 'pipe' });
    const res = await proc.exited;

    if (res !== 0) {
      const errmsg = proc.stderr ? await new Response(proc.stderr).text() : '';
      const isUnsupportedFormat = /Requested format is not available|unsupported format/i.test(errmsg);
      if (isUnsupportedFormat) {
        const formatProc = Bun.spawn({ cmd: getSupportedFormatsCmdBuilder(url), stdout: 'pipe', stderr: 'pipe' });
        const formatRes = await formatProc.exited;
        const formatStdout = formatProc.stdout ? await new Response(formatProc.stdout).text() : '';
        const formatStderr = formatProc.stderr ? await new Response(formatProc.stderr).text() : '';

        if (formatRes !== 0) {
          const formatErrmsg = formatStderr || formatStdout;
          await interaction.editReply({ content: `Failed to get supported formats. Error: ${formatErrmsg}` });
          return;
        }

        // Some yt-dlp builds print warnings on stderr and table on stdout. Keep both and trim to Discord limit.
        const supportedFormats = (formatStdout || formatStderr).trim();
        const header = 'Requested format is not available. Supported formats:\n```';
        const footer = '```';
        const maxBodyLen = DISCORD_MSG_LIMIT - header.length - footer.length;
        const body = supportedFormats.length > maxBodyLen
          ? `${supportedFormats.slice(0, Math.max(0, maxBodyLen - 18))}\n... (truncated)`
          : supportedFormats;

        await interaction.editReply({ content: `${header}${body}${footer}` });
      } else {
        await interaction.editReply({ content: `yt-dlp process failed with exit code ${res}\nError: ${errmsg}` });
      }
      return;
    }

    // ファイルサイズ確認
    const file = Bun.file(tempPath);
    const fileSizeMB = file.size / (1024 * 1024);
    console.log(`[/ytdlp] downloaded: ${fileSizeMB.toFixed(2)} MB`);

    // --- 3. Rename (Title based) ---
    // Windows/Linuxでファイル名に使えない文字を置換
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_'); 
    const finalFileName = `${safeTitle}.${format}`;
    finalPath = path.join(outputDir, finalFileName);

    // 一時ファイルを正式な名前にリネーム
    fs.renameSync(tempPath, finalPath);
    tempPath = null; // tempPathはもう無いのでnullへ

    await interaction.editReply({ content: `📥 Downloaded (${fileSizeMB.toFixed(2)}MB). Uploading to pCloud...` });

    // --- 4. Upload to pCloud ---
    const uploadDirID = pCloud.getUploadDirID(format);
    const result = await pCloud.uploadFile(finalPath, uploadDirID);

    if (result) {
      let content = `✅ **Saved to pCloud!**\nFile: \`${result.name}\`\nSize: ${(result.size / 1024 / 1024).toFixed(2)} MB`;
      const filesToSend = [];
      // 小さいファイルはDiscordにも添付しておく
      if (file.size < DIRECT_UPLOAD_LIMIT) {
          filesToSend.push(new AttachmentBuilder(finalPath, { name: finalFileName }));
          content += `\n(Preview attached below)`;
      }

      await interaction.editReply({
        content: content,
        files: filesToSend
      });
      
    } else {
      await interaction.editReply({ content: `❌ Failed to upload to pCloud.` });
    }

  } catch (error) {
    console.error('Error in ytdlp command:', error);
    const msg = `An error occurred: ${error}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg });
    } else {
      await interaction.reply({ content: msg, flags: [MessageFlags.Ephemeral] });
    }
  } finally {
    // --- Cleanup ---
    if (finalPath && fs.existsSync(finalPath)) {
      try { fs.unlinkSync(finalPath); console.log('Cleaned up final file.'); } catch(e) {}
    }
    if (tempPath && fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); console.log('Cleaned up temp file.'); } catch(e) {}
    }
  }
};

const ytdlpCmd: SlashCmd = { builder, execute };
export default ytdlpCmd;