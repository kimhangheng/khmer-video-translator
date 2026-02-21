CREATE TABLE `batchQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`translationId` int NOT NULL,
	`position` int NOT NULL,
	`status` enum('queued','processing','completed','failed','paused','cancelled') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batchQueue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `translations` MODIFY COLUMN `videoFileName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `translations` MODIFY COLUMN `videoFileSize` int NOT NULL;--> statement-breakpoint
ALTER TABLE `translations` MODIFY COLUMN `sourceLanguage` enum('zh','en','hi','auto') NOT NULL DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE `translations` MODIFY COLUMN `detectedLanguage` varchar(10);--> statement-breakpoint
ALTER TABLE `translations` ADD `voiceProfile` enum('male','female','neutral') DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE `translations` ADD `burnInSubtitles` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `translations` ADD `burnedVideoS3Key` varchar(1024);--> statement-breakpoint
ALTER TABLE `translations` ADD `burnedVideoS3Url` varchar(2048);