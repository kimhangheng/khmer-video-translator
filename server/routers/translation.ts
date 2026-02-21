import { z } from "zod";
import fs from "fs";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { transcribeAudio, WhisperResponse } from "../_core/voiceTranscription";
import { storagePut } from "../storage";
import {
  createTranslation,
  getTranslationById,
  getTranslationsByUser,
  updateTranslation,
} from "../db";
import {
  buildSrt,
  cleanupTempFile,
  extractAudioFromBuffer,
  TranscriptSegment,
} from "../translationHelpers";
import {
  createDubbedVideo,
  cleanupTempFile as cleanupDubbingFile,
  VoiceProfile,
} from "../dubbingHelpers";
import {
  burnSubtitlesIntoVideo,
  BurnInSegment,
} from "../burnInHelpers";
import path from "path";
import os from "os";
import {
  initializeProgress,
  updateProgress,
  completeProgress,
  failProgress,
  getProgress,
} from "../progressTracker";

// ── Helpers ──────────────────────────────────────────────────────────────────

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function translateSegmentsToKhmer(
  segments: Array<{ start: number; end: number; text: string }>,
  sourceLang: string
): Promise<TranscriptSegment[]> {
  const langLabel = sourceLang === "zh" ? "Chinese (Mandarin)" : sourceLang === "hi" ? "Hindi" : "English";

  // Batch translate all segments in one LLM call for efficiency
  const segmentsText = segments
    .map((s, i) => `[${i}] ${s.text.trim()}`)
    .join("\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert translator specializing in ${langLabel} to Khmer (ភាសាខ្មែរ) translation.
Your task is to translate subtitle segments accurately, preserving meaning, tone, and natural Khmer phrasing.
Use proper Khmer Unicode characters. Keep translations concise for subtitle display.
Return ONLY a JSON array of translated strings in the same order as input, no extra text.
Example output: ["ការបកប្រែទី១", "ការបកប្រែទី២"]`,
      },
      {
        role: "user",
        content: `Translate these ${langLabel} subtitle segments to Khmer:\n\n${segmentsText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "khmer_translations",
        strict: true,
        schema: {
          type: "object",
          properties: {
            translations: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["translations"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = String(response.choices[0]?.message?.content ?? "{}");
  let parsed: { translations: string[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { translations: segments.map(() => "") };
  }

  return segments.map((seg, i) => ({
    id: i + 1,
    start: seg.start,
    end: seg.end,
    originalText: seg.text,
    khmerText: parsed.translations[i] ?? seg.text,
  }));
}

// ── Router ────────────────────────────────────────────────────────────────────

export const translationRouter = router({
  /** Step 1 + 2 + 3 + 4: Full pipeline — upload video → extract → transcribe → translate */
  process: protectedProcedure
    .input(
      z.object({
        videoBase64: z.string(), // base64-encoded video
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        sourceLanguage: z.enum(["zh", "en", "hi", "auto"]).default("auto"),
        voiceProfile: z.enum(["male", "female", "neutral"]).default("neutral"),
        burnInSubtitles: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const ext = input.fileName.endsWith(".webm")
        ? ".webm"
        : input.fileName.endsWith(".avi")
        ? ".avi"
        : ".mp4";

      // Create DB record
      const translationId = await createTranslation({
        userId,
        videoFileName: input.fileName,
        videoFileSize: input.fileSize,
        sourceLanguage: input.sourceLanguage,
        status: "uploading",
        voiceProfile: input.voiceProfile,
        burnInSubtitles: input.burnInSubtitles ? 1 : 0,
      });

      try {
        // ── Step 1: Upload video to S3 ──────────────────────────────────────
        const videoBuffer = Buffer.from(input.videoBase64, "base64");
        const videoKey = `videos/${userId}-${randomSuffix()}${ext}`;
        const { url: videoUrl } = await storagePut(videoKey, videoBuffer, input.mimeType);

        await updateTranslation(translationId, {
          videoS3Key: videoKey,
          videoS3Url: videoUrl,
          status: "extracting",
        });

        // ── Step 2: Extract audio ───────────────────────────────────────────
        const audioPath = await extractAudioFromBuffer(videoBuffer, ext);

        await updateTranslation(translationId, { status: "transcribing" });

        // ── Step 3: Upload audio to S3 and transcribe ───────────────────────
        const audioBuffer = fs.readFileSync(audioPath);
        cleanupTempFile(audioPath);

        const audioKey = `audio/${userId}-${randomSuffix()}.mp3`;
        const { url: audioUrl } = await storagePut(audioKey, audioBuffer, "audio/mpeg");

        const whisperLang =
          input.sourceLanguage === "auto" ? undefined : input.sourceLanguage;

        const transcriptionResult = await transcribeAudio({
          audioUrl,
          language: whisperLang,
        });

        if ("error" in transcriptionResult) {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        }

        const transcription = transcriptionResult as WhisperResponse;
        const detectedLang = transcription.language ?? input.sourceLanguage;
        const rawSegments = (transcription.segments ?? []) as Array<{
          start: number;
          end: number;
          text: string;
        }>;

        // If no segments returned, create a single segment from full text
        const segments =
          rawSegments.length > 0
            ? rawSegments
            : [{ start: 0, end: 10, text: transcription.text ?? "" }];

        await updateTranslation(translationId, {
          detectedLanguage: detectedLang,
          originalTranscript: transcription.text ?? "",
          status: "translating",
        });

        // ── Step 4: Translate to Khmer ──────────────────────────────────────
        const effectiveLang =
          detectedLang === "zh" || detectedLang === "chinese"
            ? "zh"
            : "en";

        const translatedSegments = await translateSegmentsToKhmer(
          segments,
          effectiveLang
        );

        const khmerTranscript = translatedSegments
          .map((s) => s.khmerText)
          .join(" ");
        const srtContent = buildSrt(translatedSegments);

        // ── Step 5: Generate dubbed video (optional, fire-and-forget) ────────────────
        // Generate dubbed video in background with progress tracking
        (async () => {
          try {
            initializeProgress(translationId);
            const voiceProfile: VoiceProfile = input.voiceProfile;
            const dubbedVideoPath = await createDubbedVideo(
              videoBuffer,
              ext,
              translatedSegments,
              voiceProfile,
              (step: string, percentage: number) => {
                updateProgress(translationId, "encoding", percentage, step);
              }
            );
            updateProgress(translationId, "uploading", 90, "Uploading to cloud...");
            const dubbedBuffer = fs.readFileSync(dubbedVideoPath);
            cleanupDubbingFile(dubbedVideoPath);
            const dubbedKey = `videos/${userId}-dubbed-${randomSuffix()}.mp4`;
            const { url: dubbedUrl } = await storagePut(dubbedKey, dubbedBuffer, "video/mp4");
            await updateTranslation(translationId, {
              dubbedVideoS3Key: dubbedKey,
              dubbedVideoS3Url: dubbedUrl,
            });
            completeProgress(translationId);
          } catch (err) {
            console.error("[Dubbing] Failed to generate dubbed video:", err);
            failProgress(translationId, String(err));
            // Don't fail the whole translation if dubbing fails
          }
        })();

        // Generate burned-in subtitle video if requested
        if (input.burnInSubtitles) {
          (async () => {
            try {
              const burnInSegments: BurnInSegment[] = translatedSegments.map((s) => ({
                start: s.start,
                end: s.end,
                khmerText: s.khmerText,
              }));
              const burnedVideoPath = path.join(os.tmpdir(), `burned_${Date.now()}.mp4`);
              const inputVideoPath = path.join(os.tmpdir(), `input_video_${Date.now()}${ext}`);
              fs.writeFileSync(inputVideoPath, videoBuffer);
              await burnSubtitlesIntoVideo(inputVideoPath, burnInSegments, burnedVideoPath);
              cleanupDubbingFile(inputVideoPath);
              const burnedBuffer = fs.readFileSync(burnedVideoPath);
              cleanupDubbingFile(burnedVideoPath);
              const burnedKey = `videos/${userId}-burned-${randomSuffix()}.mp4`;
              const { url: burnedUrl } = await storagePut(burnedKey, burnedBuffer, "video/mp4");
              await updateTranslation(translationId, {
                burnedVideoS3Key: burnedKey,
                burnedVideoS3Url: burnedUrl,
              });
            } catch (err) {
              console.error("[BurnIn] Failed to generate burned video:", err);
            }
          })();
        }

        await updateTranslation(translationId, {
          khmerTranscript,
          srtContent,
          segmentsJson: JSON.stringify(translatedSegments),
          status: "completed",
        });

        return {
          id: translationId,
          status: "completed" as const,
          detectedLanguage: detectedLang,
          khmerTranscript,
          srtContent,
          segments: translatedSegments,
          videoUrl,
          dubbedVideoUrl: null, // Will be set asynchronously
        };
      } catch (err: any) {
        await updateTranslation(translationId, {
          status: "failed",
          errorMessage: err?.message ?? "Unknown error",
        });
        throw err;
      }
    }),

  /** Get dubbing progress for a translation */
  getProgress: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const t = await getTranslationById(input.id);
      if (!t || t.userId !== ctx.user.id) throw new Error("Not found");
      
      const progress = getProgress(input.id);
      return progress ?? { translationId: input.id, step: "idle", percentage: 0, message: "Waiting...", startedAt: new Date() };
    }),

  /** Poll status of a running translation */
  getStatus: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const t = await getTranslationById(input.id);
      if (!t || t.userId !== ctx.user.id) throw new Error("Not found");
      return {
        id: t.id,
        status: t.status,
        detectedLanguage: t.detectedLanguage,
        khmerTranscript: t.khmerTranscript,
        srtContent: t.srtContent,
        segments: t.segmentsJson ? JSON.parse(t.segmentsJson) : [],
        videoUrl: t.videoS3Url,
        dubbedVideoUrl: t.dubbedVideoS3Url,
        errorMessage: t.errorMessage,
      };
    }),

  /** List all translations for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await getTranslationsByUser(ctx.user.id);
    return rows.map((t) => ({
      id: t.id,
      videoFileName: t.videoFileName,
      videoFileSize: t.videoFileSize,
      sourceLanguage: t.sourceLanguage,
      detectedLanguage: t.detectedLanguage,
      status: t.status,
      srtContent: t.srtContent,
      dubbedVideoUrl: t.dubbedVideoS3Url,
      createdAt: t.createdAt,
    }));
  }),

  /** Get full details of a single translation (for re-download) */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const t = await getTranslationById(input.id);
      if (!t || t.userId !== ctx.user.id) throw new Error("Not found");
      return {
        id: t.id,
        videoFileName: t.videoFileName,
        videoFileSize: t.videoFileSize,
        sourceLanguage: t.sourceLanguage,
        detectedLanguage: t.detectedLanguage,
        status: t.status,
        srtContent: t.srtContent,
        khmerTranscript: t.khmerTranscript,
        videoUrl: t.videoS3Url,
        dubbedVideoUrl: t.dubbedVideoS3Url,
        segments: t.segmentsJson ? JSON.parse(t.segmentsJson) : [],
        createdAt: t.createdAt,
      };
    }),
});
