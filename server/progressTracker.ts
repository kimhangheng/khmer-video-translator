/**
 * Progress tracking for long-running dubbing operations
 * Allows real-time updates to be sent to frontend via polling or WebSocket
 */

export interface DubbingProgress {
  translationId: number;
  step: "tts" | "mixing" | "encoding" | "uploading" | "completed" | "failed";
  percentage: number;
  message: string;
  startedAt: Date;
  estimatedTimeRemaining?: number; // seconds
}

// In-memory store for progress (in production, use Redis)
const progressStore = new Map<number, DubbingProgress>();

/**
 * Initialize progress tracking for a translation
 */
export function initializeProgress(translationId: number): void {
  progressStore.set(translationId, {
    translationId,
    step: "tts",
    percentage: 0,
    message: "Initializing Khmer TTS generation...",
    startedAt: new Date(),
  });
}

/**
 * Update progress for a translation
 */
export function updateProgress(
  translationId: number,
  step: DubbingProgress["step"],
  percentage: number,
  message: string,
  estimatedTimeRemaining?: number
): void {
  const existing = progressStore.get(translationId);
  if (existing) {
    progressStore.set(translationId, {
      ...existing,
      step,
      percentage: Math.min(percentage, 100),
      message,
      estimatedTimeRemaining,
    });
  }
}

/**
 * Get current progress for a translation
 */
export function getProgress(translationId: number): DubbingProgress | null {
  return progressStore.get(translationId) ?? null;
}

/**
 * Mark progress as completed
 */
export function completeProgress(translationId: number): void {
  const existing = progressStore.get(translationId);
  if (existing) {
    progressStore.set(translationId, {
      ...existing,
      step: "completed",
      percentage: 100,
      message: "Dubbing completed successfully!",
    });
  }
}

/**
 * Mark progress as failed
 */
export function failProgress(translationId: number, error: string): void {
  const existing = progressStore.get(translationId);
  if (existing) {
    progressStore.set(translationId, {
      ...existing,
      step: "failed",
      percentage: 0,
      message: `Error: ${error}`,
    });
  }
}

/**
 * Clear progress (cleanup after completion)
 */
export function clearProgress(translationId: number): void {
  progressStore.delete(translationId);
}

/**
 * Get all active progress items
 */
export function getAllProgress(): DubbingProgress[] {
  return Array.from(progressStore.values());
}
