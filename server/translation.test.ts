import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildSrt, formatSrtTime, TranscriptSegment } from "./translationHelpers";

// ── formatSrtTime ────────────────────────────────────────────────────────────

describe("formatSrtTime", () => {
  it("formats zero correctly", () => {
    expect(formatSrtTime(0)).toBe("00:00:00,000");
  });

  it("formats seconds with milliseconds", () => {
    expect(formatSrtTime(1.5)).toBe("00:00:01,500");
  });

  it("formats minutes and seconds", () => {
    expect(formatSrtTime(65.25)).toBe("00:01:05,250");
  });

  it("formats hours, minutes, seconds", () => {
    expect(formatSrtTime(3661.1)).toBe("01:01:01,100");
  });

  it("pads single-digit values with zeros", () => {
    expect(formatSrtTime(9)).toBe("00:00:09,000");
  });
});

// ── buildSrt ─────────────────────────────────────────────────────────────────

describe("buildSrt", () => {
  const segments: TranscriptSegment[] = [
    { id: 1, start: 0, end: 2.5, originalText: "Hello world", khmerText: "សួស្តី​ពិភព​លោក" },
    { id: 2, start: 3.0, end: 5.0, originalText: "How are you?", khmerText: "សុខសប្បាយទេ?" },
  ];

  it("generates valid SRT with correct block count", () => {
    const srt = buildSrt(segments);
    const blocks = srt.trim().split("\n\n");
    expect(blocks).toHaveLength(2);
  });

  it("starts each block with sequential number", () => {
    const srt = buildSrt(segments);
    const lines = srt.split("\n");
    expect(lines[0]).toBe("1");
    // second block starts after blank line
    const secondBlockStart = lines.indexOf("2");
    expect(secondBlockStart).toBeGreaterThan(0);
  });

  it("includes --> arrow in timestamp line", () => {
    const srt = buildSrt(segments);
    expect(srt).toContain("00:00:00,000 --> 00:00:02,500");
    expect(srt).toContain("00:00:03,000 --> 00:00:05,000");
  });

  it("includes Khmer text in output", () => {
    const srt = buildSrt(segments);
    expect(srt).toContain("សួស្តី​ពិភព​លោក");
    expect(srt).toContain("សុខសប្បាយទេ?");
  });

  it("handles empty segments array", () => {
    const srt = buildSrt([]);
    expect(srt.trim()).toBe("");
  });

  it("ends with newline", () => {
    const srt = buildSrt(segments);
    expect(srt.endsWith("\n")).toBe(true);
  });
});

// ── Translation router auth guard ────────────────────────────────────────────

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("translation router auth guard", () => {
  it("rejects unauthenticated list call", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.translation.list()).rejects.toThrow();
  });

  it("rejects unauthenticated getStatus call", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.translation.getStatus({ id: 1 })).rejects.toThrow();
  });

  it("rejects unauthenticated getById call", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.translation.getById({ id: 1 })).rejects.toThrow();
  });
});

