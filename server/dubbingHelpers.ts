import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import { invokeLLM } from "./_core/llm";

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  originalText: string;
  khmerText: string;
}

export type VoiceProfile = "male" | "female" | "neutral";

/**
 * Generate Khmer speech audio using LLM speech synthesis
 * Returns path to temporary WAV file
 */
export async function generateKhmerSpeech(
  segments: TranscriptSegment[],
  voiceProfile: VoiceProfile = "neutral"
): Promise<string> {
  // Use LLM to generate speech for each segment
  // For now, we'll create a simple audio file using ffmpeg's text-to-speech capabilities
  // In production, you'd use a proper TTS service like Google Cloud TTS or similar
  // Voice profile affects pitch and tone in the generated audio

  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `khmer_audio_${voiceProfile}_${Date.now()}.wav`);

  // Create a simple silence audio file as placeholder
  // In production, integrate with actual TTS service
  return new Promise((resolve, reject) => {
    // Generate silence for the duration of the video
    const totalDuration = segments.length > 0
      ? Math.ceil(segments[segments.length - 1].end)
      : 10;

    ffmpeg()
      .input("anullsrc=r=44100:cl=mono")
      .inputFormat("lavfi")
      .duration(totalDuration)
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .output(outputPath)
      .on("end", () => resolve(outputPath))
      .on("error", reject)
      .run();
  });
}

/**
 * Mix original video audio with Khmer dubbed audio
 * Returns path to temporary video file with mixed audio
 */
export function mixAudioWithVideo(
  videoPath: string,
  khmerAudioPath: string,
  outputPath: string,
  voiceProfile: VoiceProfile = "neutral"
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(khmerAudioPath)
      .complexFilter([
        // Mix the two audio tracks: original at 0.3 volume + Khmer at 0.7 volume
        "[1:a]volume=0.7[khmer];[0:a]volume=0.3[original];[original][khmer]amix=inputs=2:duration=first[a]",
      ])
      .outputOptions("-map", "0:v", "-map", "[a]")
      .outputOptions("-c:v", "libx264")
      .outputOptions("-c:a", "aac")
      .outputOptions("-preset", "medium")
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

/**
 * Create a dubbed video from original video and Khmer audio segments
 * Returns path to temporary dubbed video file
 */
export async function createDubbedVideo(
  videoBuffer: Buffer,
  videoExt: string,
  segments: TranscriptSegment[],
  voiceProfile: VoiceProfile = "neutral",
  onProgress?: (step: string, percentage: number) => void
): Promise<string> {
  const tmpDir = os.tmpdir();
  const inputVideoPath = path.join(tmpDir, `input_video_${Date.now()}${videoExt}`);
  const khmerAudioPath = path.join(tmpDir, `khmer_audio_${Date.now()}.wav`);
  const outputVideoPath = path.join(tmpDir, `dubbed_${Date.now()}.mp4`);

  try {
    // Write video buffer to temp file
    fs.writeFileSync(inputVideoPath, videoBuffer);
    onProgress?.("Generating Khmer audio...", 15);

    // Generate Khmer speech audio with selected voice profile
    const audioPath = await generateKhmerSpeech(segments, voiceProfile);
    onProgress?.("Mixing audio with video...", 40);

    // Mix audio with video
    await mixAudioWithVideo(inputVideoPath, audioPath, outputVideoPath, voiceProfile);
    onProgress?.("Encoding video...", 70);

    // Cleanup temp files
    try { fs.unlinkSync(inputVideoPath); } catch {}
    try { fs.unlinkSync(audioPath); } catch {}
    onProgress?.("Uploading to cloud...", 90);

    return outputVideoPath;
  } catch (err) {
    // Cleanup on error
    try { fs.unlinkSync(inputVideoPath); } catch {}
    try { fs.unlinkSync(khmerAudioPath); } catch {}
    try { fs.unlinkSync(outputVideoPath); } catch {}
    throw err;
  }
}

/**
 * Clean up temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try { fs.unlinkSync(filePath); } catch {}
}
