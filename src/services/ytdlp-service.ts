import { Format, getSupportedFormatsCmdBuilder, supportedFormats, updateYtdlpCmdBuilder, ytdlpCmdBuilder } from '../lib/ytdlp/ytdlp-cmd-builder';
import { fetchTitle } from '../lib/ytdlp/fetchTitle';
import { PCloudService } from '../lib/pcloud';
import fs from 'fs';
import path from 'path';

export interface DownloadResult {
    success: boolean;
    errorMsg?: string;
    finalPath?: string;
    fileName?: string;
    fileSizeMB?: number;
    pCloudUrl?: string;
    isSupportedFormatError?: boolean;
    supportedFormatsMsg?: string;
}

export class YtdlpService {
    private pCloud: PCloudService;
    private outputDir = 'outputs';
    private DIRECT_UPLOAD_LIMIT = 8 * 1024 * 1024; // 8MB

    constructor() {
        this.pCloud = new PCloudService();
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    public async update(): Promise<{ success: boolean; msg: string }> {
        console.log(`[YtdlpService] updating yt-dlp binary`);
        const proc = Bun.spawn({ cmd: updateYtdlpCmdBuilder(), stdout: 'inherit', stderr: 'inherit' });
        const res = await proc.exited;
        return {
            success: res === 0,
            msg: res !== 0 ? `Update failed: code ${res}` : `yt-dlp updated successfully!`
        };
    }

    public isSupportedFormat(format: string): boolean {
        return (supportedFormats as string[]).includes(format);
    }

    public async download(url: string, format: string, onProgress?: (msg: string) => Promise<void>): Promise<DownloadResult> {
        let finalPath: string | null = null;
        let tempPath: string | null = null;

        try {
            console.log(`[YtdlpService] fetching title for: ${url}`);
            let title = await fetchTitle(url);
            if (!title) {
                title = `video_${Date.now()}`;
                console.log(`[YtdlpService] failed to fetch title, using fallback: ${title}`);
            }

            tempPath = `${this.outputDir}/${Date.now()}_temp.${format}`;

            const cmd = ytdlpCmdBuilder(url, { 
                format: format as Format, 
                outputPath: tempPath,
                embedThumbnail: true 
            });

            console.log(`[YtdlpService] executing yt-dlp...`);
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
                        return { success: false, errorMsg: `Failed to get supported formats. Error: ${formatStderr || formatStdout}` };
                    }

                    const supportedFormatsMsg = (formatStdout || formatStderr).trim();
                    return { success: false, isSupportedFormatError: true, supportedFormatsMsg };
                } else {
                    return { success: false, errorMsg: `yt-dlp process failed with exit code ${res}\nError: ${errmsg}` };
                }
            }

            const file = Bun.file(tempPath);
            const fileSizeMB = file.size / (1024 * 1024);
            console.log(`[YtdlpService] downloaded: ${fileSizeMB.toFixed(2)} MB`);

            const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '_'); 
            const finalFileName = `${safeTitle}.${format}`;
            finalPath = path.join(this.outputDir, finalFileName);

            fs.renameSync(tempPath, finalPath);
            tempPath = null;

            if (onProgress) {
                await onProgress(`📥 Downloaded (${fileSizeMB.toFixed(2)}MB). Uploading to pCloud...`);
            }

            const uploadDirID = this.pCloud.getUploadDirID(format);
            const uploadResult = await this.pCloud.uploadFile(finalPath, uploadDirID);

            if (!uploadResult) {
                return { success: false, errorMsg: `Failed to upload to pCloud.` };
            }

            return {
                success: true,
                finalPath,
                fileName: finalFileName,
                fileSizeMB,
                pCloudUrl: uploadResult.name // just returning the name based on the previous implementation
            };
        } catch (error) {
            console.error('[YtdlpService] Error:', error);
            return { success: false, errorMsg: `An error occurred: ${error}` };
        } finally {
            if (tempPath && fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch(e) {}
            }
            // Cleanup of finalPath will be handled by the caller since they need it to upload/attach to discord
        }
    }

    public cleanup(filePath: string) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); console.log(`[YtdlpService] Cleaned up ${filePath}.`); } catch(e) {}
        }
    }
}
