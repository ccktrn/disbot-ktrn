import { ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { YtdlpService } from '../../services/ytdlp-service';

const DIRECT_UPLOAD_LIMIT = 8 * 1024 * 1024; // 8MB
const DISCORD_MSG_LIMIT = 2000;

export const handleDownload = async (interaction: ChatInputCommandInteraction, ytdlpService: YtdlpService) => {
    const url = interaction.options.getString('url', true);
    const format = interaction.options.getString('format') || 'm4a';

    if (!ytdlpService.isSupportedFormat(format)) {
        await interaction.editReply({ content: `Unsupported format: ${format}` });
        return;
    }

    const result = await ytdlpService.download(url, format, async (msg: string) => {
        await interaction.editReply({ content: msg });
    });

    if (!result.success) {
        if (result.isSupportedFormatError) {
            const header = 'Requested format is not available. Supported formats:\n```';
            const footer = '```';
            const maxBodyLen = DISCORD_MSG_LIMIT - header.length - footer.length;
            const body = (result.supportedFormatsMsg || '').length > maxBodyLen
                ? `${result.supportedFormatsMsg?.slice(0, Math.max(0, maxBodyLen - 18))}\n... (truncated)`
                : result.supportedFormatsMsg;
            await interaction.editReply({ content: `${header}${body}${footer}` });
        } else {
            await interaction.editReply({ content: result.errorMsg || 'Unknown error occurred during download.' });
        }
        return;
    }

    // Success branch
    let content = `✅ **Saved to pCloud!**\nFile: \`${result.pCloudUrl}\`\nSize: ${result.fileSizeMB?.toFixed(2)} MB`;
    const filesToSend = [];

    // If the file is small enough, attach it to Discord message
    if (result.fileSizeMB !== undefined && (result.fileSizeMB * 1024 * 1024) < DIRECT_UPLOAD_LIMIT && result.finalPath) {
        filesToSend.push(new AttachmentBuilder(result.finalPath, { name: result.fileName }));
        content += `\n(Preview attached below)`;
    }

    await interaction.editReply({
        content: content,
        files: filesToSend
    });

    // Finally, clean up the locally saved file
    if (result.finalPath) {
        ytdlpService.cleanup(result.finalPath);
    }
};
