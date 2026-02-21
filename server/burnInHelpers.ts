import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

export interface BurnInSegment {
  start: number;
  end: number;
  khmerText: string;
}

/**
 * Escape special characters for ffmpeg drawtext filter
 */
function escapeDrawtextText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/\n/g, "\\n");
}

/**
 * Create ffmpeg drawtext filter string for subtitle overlay
 */
function createDrawtextFilter(segments: BurnInSegment[]): string {
  const filterSegments = segments.map((seg) => {
    const escapedText = escapeDrawtextText(seg.khmerText);
    const startTime = seg.start.toFixed(2);
    const endTime = seg.end.toFixed(2);
    return `enable='between(t,${startTime},${endTime})',text='${escapedText}'`;
  });

  // Combine all segments with drawtext filter
  return filterSegments
    .map(
      (filter, i) =>
        `drawtext=fontfile=/usr/share/fonts/opentype/noto/NotoSansKhmer-Regular.ttf:fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-50:${filter}`
    )
    .join(",");
}

/**
 * Burn subtitles into video using ffmpeg drawtext filter
 * Returns path to temporary video file with burned subtitles
 */
export function burnSubtitlesIntoVideo(
  videoPath: string,
  segments: BurnInSegment[],
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (segments.length === 0) {
      // No subtitles to burn, just copy the video
      fs.copyFileSync(videoPath, outputPath);
      resolve();
      return;
    }

    const filterString = createDrawtextFilter(segments);

    ffmpeg(videoPath)
      .complexFilter(filterString)
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
 * Clean up temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {}
}
