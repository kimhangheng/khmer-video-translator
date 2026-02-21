import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const batchQueue = mysqlTable("batchQueue", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  translationId: int("translationId").notNull(),
  position: int("position").notNull(),
  status: mysqlEnum("status", ["queued", "processing", "completed", "failed", "paused", "cancelled"]).default("queued").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BatchQueueItem = typeof batchQueue.$inferSelect;
export type InsertBatchQueueItem = typeof batchQueue.$inferInsert;

export const translations = mysqlTable("translations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoFileName: varchar("videoFileName", { length: 255 }).notNull(),
  videoFileSize: int("videoFileSize").notNull(),
  sourceLanguage: mysqlEnum("sourceLanguage", ["zh", "en", "hi", "auto"]).default("auto").notNull(),
  detectedLanguage: varchar("detectedLanguage", { length: 10 }),
  status: mysqlEnum("status", ["uploading", "extracting", "transcribing", "translating", "completed", "failed"]).default("uploading").notNull(),
  videoS3Key: varchar("videoS3Key", { length: 1024 }),
  videoS3Url: varchar("videoS3Url", { length: 2048 }),
  errorMessage: text("errorMessage"),
  originalTranscript: text("originalTranscript"),
  khmerTranscript: text("khmerTranscript"),
  srtContent: text("srtContent"),
  segmentsJson: text("segmentsJson"),
  dubbedVideoS3Key: varchar("dubbedVideoS3Key", { length: 1024 }),
  dubbedVideoS3Url: varchar("dubbedVideoS3Url", { length: 2048 }),
  voiceProfile: mysqlEnum("voiceProfile", ["male", "female", "neutral"]).default("neutral").notNull(),
  burnInSubtitles: int("burnInSubtitles").default(0).notNull(),
  burnedVideoS3Key: varchar("burnedVideoS3Key", { length: 1024 }),
  burnedVideoS3Url: varchar("burnedVideoS3Url", { length: 2048 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;
