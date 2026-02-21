import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

export interface TranscriptSegment {
  id: number;
  start: number; // seconds
  end: number;   // seconds
  originalText: string;
  khmerText: string;
}

/** Format seconds → SRT timestamp  00:01:23,456 */
export function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/** Build SRT file content from segments */
export function buildSrt(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => `${i + 1}\n${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n${seg.khmerText}`)
    .join("\n\n") + "\n";
}

/** Extract audio from a video buffer, return path to temp mp3 file */
export function extractAudioFromBuffer(videoBuffer: Buffer, ext: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `input_${Date.now()}${ext}`);
    const outputPath = path.join(tmpDir, `audio_${Date.now()}.mp3`);

    fs.writeFileSync(inputPath, videoBuffer);

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate(128)
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on("end", () => {
        fs.unlinkSync(inputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        try { fs.unlinkSync(inputPath); } catch {}
        reject(err);
      })
      .run();
  });
}

/** Clean up temp file */
export function cleanupTempFile(filePath: string): void {
  try { fs.unlinkSync(filePath); } catch {}
}
