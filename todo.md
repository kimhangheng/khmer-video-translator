# Khmer Video Translator - TODO

- [x] Database schema: translations table with status, segments, SRT output
- [x] DB migration: pnpm db:push
- [x] Backend: S3 upload endpoint for video files
- [x] Backend: audio extraction via ffmpeg server-side
- [x] Backend: Whisper transcription tRPC procedure
- [x] Backend: LLM translation to Khmer tRPC procedure
- [x] Backend: translation history list & re-download procedure
- [x] Backend: SRT file generation helper
- [x] Frontend: global design tokens (dark elegant theme, Khmer-friendly fonts)
- [x] Frontend: drag-and-drop video upload with format/size validation
- [x] Frontend: language selector (Chinese / English / Auto-detect)
- [x] Frontend: 4-step progress indicator (Upload → Extract → Transcribe → Translate)
- [x] Frontend: video preview player with subtitle overlay
- [x] Frontend: Khmer transcript viewer with timestamps
- [x] Frontend: Download SRT button
- [x] Frontend: processing history list with re-download
- [x] Vitest: translation router tests
- [x] Checkpoint and delivery

## NEW: Khmer TTS Dubbing Feature

- [x] Backend: Khmer text-to-speech (TTS) integration using LLM speech synthesis
- [x] Backend: Audio mixing procedure (original video audio + Khmer TTS) using ffmpeg
- [x] Backend: Dubbed video generation and S3 upload
- [x] Backend: Update translation router to generate dubbed video after translation
- [x] Database: Add dubbed_video_url field to translations table
- [x] Frontend: Show "Download Dubbed Video" button in results
- [x] Frontend: Playback option for dubbed video in player
- [x] Frontend: History page shows dubbed video download link
- [x] Vitest: TTS and audio mixing tests
- [x] Final checkpoint with dubbing feature


## NEW: Enhanced Features (Burn-in, Voice Customization, Indian Language, Batch Queue)

- [x] Database: Add voice_profile field to translations table (male/female/neutral)
- [x] Database: Add subtitle_burn_in field to translations table
- [x] Database: Add batch_queue table for processing multiple videos
- [x] Backend: Support Indian language (Hindi) detection and translation
- [x] Backend: Subtitle burn-in using ffmpeg drawtext filter
- [x] Backend: Voice profile selection (male/female/neutral voices)
- [x] Backend: Batch queue processing logic with status tracking
- [x] Backend: Queue management procedures (list, pause, resume, cancel)
- [x] Frontend: Language selector updated to include Hindi
- [x] Frontend: Voice profile selector (radio buttons or dropdown)
- [x] Frontend: Subtitle burn-in toggle option
- [x] Frontend: Batch upload interface (multi-file drag-and-drop)
- [x] Frontend: Batch queue UI showing all queued/processing videos
- [x] Frontend: Queue management (pause, resume, cancel individual items)
- [x] Vitest: Batch queue and burn-in tests
- [x] Final checkpoint with all enhancements


## NEW: Progress Tracking & Local Deployment

- [x] Backend: Add progress tracking for TTS generation (0-30%)
- [x] Backend: Add progress tracking for audio mixing (30-60%)
- [x] Backend: Add progress tracking for video encoding (60-90%)
- [x] Backend: Add progress tracking for S3 upload (90-100%)
- [x] Backend: Create dubbing progress update endpoint
- [x] Frontend: Display real-time dubbing progress percentage
- [x] Frontend: Show current step label (e.g., "Generating Khmer audio...")
- [x] Frontend: Add progress bar with animated fill
- [x] Documentation: Create LOCAL_SETUP.md with system requirements
- [x] Documentation: Add .env.local.example for local configuration
- [x] Documentation: Create PERFORMANCE_TIPS.md for optimization
- [x] Testing: Verify progress tracking works end-to-end
- [x] Final checkpoint with progress tracking and local deployment guide
