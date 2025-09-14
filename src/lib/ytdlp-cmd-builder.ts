

export const supportedAudioFormats = ['mp3', 'm4a'] as const;
export const supportedVideoFormats = ['mp4'] as const;
export const supportedFormats = [...supportedAudioFormats, ...supportedVideoFormats];
export type FormatAudio = (typeof supportedAudioFormats)[number];
export type FormatVideo = (typeof supportedVideoFormats)[number];
export type Format = FormatAudio | FormatVideo;

const ytdlpPath = './bin/yt-dlp'; // assume in PATH
const ffmpegPath = './bin'; // assume in PATH

interface Options {
  format: Format; 
  outputPath: string; // with ext
  embedThumbnail: boolean;
}

export function ytdlpCmdBuilder(url: string, options: Options): string[] {
  const cmd = [ytdlpPath, url];
  cmd.push("--quiet");
  cmd.push("--force-overwrites")
  cmd.push("--ffmpeg-location", ffmpegPath);
  if (options.format) {
    cmd.push(...getFormatOption(options.format));
  }
  if (options.embedThumbnail) {
    cmd.push("--write-thumbnail", "--embed-thumbnail");
    // 正方形にクロップ
    cmd.push("--postprocessor-args", `EmbedThumbnail+ffmpeg_o:-c:v mjpeg -vf crop=\"'if(gt(ih,iw),iw,ih)':'if(gt(iw,ih),ih,iw)'\"`);
  }
  if (options.outputPath) {
    cmd.push("--output", options.outputPath);
  } else {
    cmd.push("--output", `output.%(ext)s`);
  }
  return cmd;
}

function getFormatOption(format: Format): string[] {
  const opt: string[] = [];
  switch (format) {
    case "m4a":
      opt.push('--format', 'm4a');
      break;
    case "mp3":
      opt.push("--format", "bestaudio");
      opt.push("--extract-audio");
      opt.push("--audio-format", "mp3");
      opt.push("--audio-quality", "3");
      break;
    case "mp4":
      opt.push('-t', 'mp4');
      break;
    default:
      opt.push('--format', format);
  }
  return opt;
}

// https://zenn.dev/methane/scraps/76167c35d812e7

// sample:
// --format [FORMAT] : 
//    bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4
//    bestvideo+bestaudio
//    (3gp, aac, flv, m4a, mp3, mp4, ogg, wav, webm)


// --extract-audio : 
//    only audio
// --audio-format [FORMAT] : 
//    convert to FORMAT(aac, alac, flac, m4a, mp3, opus, vorbis, wav), default is best available