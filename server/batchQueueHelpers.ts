import { getDb } from "./db";
import { batchQueue } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export interface QueueItem {
  id: number;
  userId: number;
  translationId: number;
  position: number;
  status: "queued" | "processing" | "completed" | "failed" | "paused" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add a translation to the batch queue
 */
export async function addToQueue(
  userId: number,
  translationId: number
): Promise<QueueItem | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get current queue length to set position
    const existing = await db
      .select()
      .from(batchQueue)
      .where(eq(batchQueue.userId, userId));

    const position = existing.length + 1;

    await db.insert(batchQueue).values({
      userId,
      translationId,
      position,
      status: "queued",
    });

    const result = await db
      .select()
      .from(batchQueue)
      .where(
        and(
          eq(batchQueue.userId, userId),
          eq(batchQueue.translationId, translationId)
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Queue] Failed to add to queue:", error);
    return null;
  }
}

/**
 * Get user's queue items
 */
export async function getUserQueue(userId: number): Promise<QueueItem[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const items = await db
      .select()
      .from(batchQueue)
      .where(eq(batchQueue.userId, userId));

    return items;
  } catch (error) {
    console.error("[Queue] Failed to get user queue:", error);
    return [];
  }
}

/**
 * Update queue item status
 */
export async function updateQueueStatus(
  queueId: number,
  status: "queued" | "processing" | "completed" | "failed" | "paused" | "cancelled"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(batchQueue)
      .set({ status, updatedAt: new Date() })
      .where(eq(batchQueue.id, queueId));
    return true;
  } catch (error) {
    console.error("[Queue] Failed to update queue status:", error);
    return false;
  }
}

/**
 * Get next item to process from queue
 */
export async function getNextQueueItem(userId: number): Promise<QueueItem | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const items = await db
      .select()
      .from(batchQueue)
      .where(
        and(
          eq(batchQueue.userId, userId),
          eq(batchQueue.status, "queued")
        )
      )
      .orderBy(batchQueue.position);

    return items.length > 0 ? items[0] : null;
  } catch (error) {
    console.error("[Queue] Failed to get next queue item:", error);
    return null;
  }
}

/**
 * Remove item from queue
 */
export async function removeFromQueue(queueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(batchQueue).where(eq(batchQueue.id, queueId));
    return true;
  } catch (error) {
    console.error("[Queue] Failed to remove from queue:", error);
    return false;
  }
}
