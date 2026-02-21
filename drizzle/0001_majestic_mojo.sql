CREATE TABLE `translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`videoFileName` varchar(512) NOT NULL,
	`videoFileSize` bigint NOT NULL,
	`videoS3Key` varchar(1024),
	`videoS3Url` varchar(2048),
	`sourceLanguage` enum('zh','en','auto') NOT NULL DEFAULT 'auto',
	`detectedLanguage` varchar(16),
	`status` enum('uploading','extracting','transcribing','translating','completed','failed') NOT NULL DEFAULT 'uploading',
	`errorMessage` text,
	`originalTranscript` text,
	`khmerTranscript` text,
	`srtContent` text,
	`segmentsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
