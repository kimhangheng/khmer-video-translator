# Performance Optimization Guide

This guide provides practical tips to optimize the Khmer Video Translator for faster processing on your local machine.

## Quick Start Optimization

Apply these settings immediately for best performance:

```bash
# Set Node.js heap size to 4GB
export NODE_OPTIONS="--max-old-space-size=4096"

# Start the app
pnpm dev
```

## 1. Video Processing Optimization

### Reduce Input Resolution
- **Current**: Process 4K videos (3840x2160)
- **Optimized**: Reduce to 1080p or 720p before uploading
- **Time saved**: 50-70% faster encoding

**How to reduce video resolution:**
```bash
# Using FFmpeg locally
ffmpeg -i input.mp4 -vf scale=1280:720 output_720p.mp4
```

### Adjust Video Bitrate
- **Current**: High bitrate (10-20 Mbps)
- **Optimized**: Medium bitrate (5-8 Mbps)
- **Time saved**: 30-40% faster

**How to adjust bitrate:**
```bash
ffmpeg -i input.mp4 -b:v 6000k output_optimized.mp4
```

### Video Duration
- **Recommended**: Process videos under 10 minutes
- **Maximum**: 30 minutes (will take 20-40 minutes)
- **Avoid**: Videos over 1 hour

## 2. Audio Processing Optimization

### Sample Rate
- **Current**: 48 kHz (high quality)
- **Optimized**: 16 kHz (sufficient for speech)
- **Time saved**: 40% faster Whisper transcription

### Audio Channels
- **Current**: Stereo (2 channels)
- **Optimized**: Mono (1 channel)
- **Time saved**: 20% faster processing

**How to optimize audio:**
```bash
ffmpeg -i input.mp4 -acodec libmp3lame -ab 128k -ac 1 -ar 16000 output_audio.mp3
```

## 3. Hardware Optimization

### Enable GPU Acceleration

**NVIDIA GPUs:**
```bash
# Install NVIDIA CUDA Toolkit
# Then FFmpeg will automatically use GPU for encoding

# Verify GPU usage
ffmpeg -encoders | grep cuda
```

**AMD GPUs:**
```bash
# Install AMD VCE support
# Use hevc_amf or h264_amf encoders
```

**Intel GPUs:**
```bash
# Use quicksync encoder
ffmpeg -encoders | grep qsv
```

### CPU Optimization
- Close unnecessary applications
- Disable background processes
- Use Task Manager (Windows) or Activity Monitor (macOS) to monitor

### RAM Optimization
```bash
# Monitor memory usage
# Windows: tasklist | findstr node
# macOS/Linux: top -p $(pgrep -f "node")

# If memory usage > 80%, reduce video size or restart server
```

## 4. Dubbing & TTS Optimization

### Voice Generation Speed
- **Current**: Full quality Khmer speech synthesis
- **Optimized**: Faster speech generation with acceptable quality
- **Time saved**: 30-50% faster

### Audio Mixing
- **Current**: Real-time mixing
- **Optimized**: Pre-generate and cache audio segments
- **Time saved**: 20-30% faster on repeated segments

## 5. Database Optimization

### Use SQLite for Local Development
```bash
# In .env.local
DATABASE_URL="file:./khmer_translator.db"
```

**Benefits:**
- No external database service needed
- Faster local queries
- Easier backup and migration

### Index Optimization
```sql
-- Add indexes for faster queries
CREATE INDEX idx_user_id ON translations(user_id);
CREATE INDEX idx_status ON translations(status);
CREATE INDEX idx_created_at ON translations(created_at);
```

## 6. Network Optimization

### Reduce API Calls
- Cache transcription results
- Reuse translation models
- Batch process multiple segments

### Optimize S3 Upload
- Use multipart upload for large files
- Compress before uploading
- Use local storage for temporary files

## 7. Batch Processing Strategy

### Sequential Processing (Recommended)
```
Video 1 → Complete → Video 2 → Complete → Video 3
Total time: Sum of all videos
```

### Parallel Processing (Advanced)
```
Video 1 ─┐
Video 2 ─┼→ Processing → Results
Video 3 ─┘
Total time: Longest video
```

**Parallel processing requirements:**
- 16GB+ RAM
- Quad-core CPU or better
- SSD storage

## 8. Monitoring & Diagnostics

### Enable Debug Logging
```bash
DEBUG=* pnpm dev
```

### Monitor System Resources
```bash
# Linux/macOS
watch -n 1 'ps aux | grep node'

# Windows
Get-Process node | Select-Object ProcessName, CPU, Memory
```

### Check FFmpeg Performance
```bash
# Verbose FFmpeg output
ffmpeg -v verbose -i input.mp4 -c:v libx264 output.mp4
```

## 9. Caching Strategy

### Transcription Caching
```javascript
// Cache Whisper results by file hash
const hash = crypto.createHash('sha256').update(audioBuffer).digest('hex');
const cacheKey = `whisper_${hash}`;
```

### Translation Caching
```javascript
// Cache LLM translations
const cacheKey = `translation_${sourceText}_${targetLang}`;
```

## 10. Expected Processing Times

### Local Machine (8GB RAM, i7 CPU)

| Video Length | Resolution | Estimated Time |
|--------------|------------|-----------------|
| 1 minute | 1080p | 3-5 minutes |
| 5 minutes | 1080p | 12-18 minutes |
| 10 minutes | 1080p | 25-35 minutes |
| 1 minute | 720p | 2-3 minutes |
| 5 minutes | 720p | 8-12 minutes |
| 10 minutes | 720p | 18-25 minutes |

### Breakdown by Step

| Step | Duration | % of Total |
|------|----------|-----------|
| Audio Extraction | 10-20% | 5-10% |
| Whisper Transcription | 30-60% | 20-30% |
| LLM Translation | 20-40% | 15-25% |
| TTS Generation | 20-40% | 15-25% |
| Audio Mixing | 10-20% | 5-10% |
| Video Encoding | 30-60% | 20-30% |
| S3 Upload | 5-15% | 5-10% |

## 11. Troubleshooting Performance

### Slow Transcription
- Reduce audio sample rate to 16kHz
- Use faster Whisper model (if available)
- Process shorter segments

### Slow Translation
- Use faster LLM model
- Batch translate segments
- Cache common phrases

### Slow Video Encoding
- Reduce resolution to 720p
- Lower bitrate to 5 Mbps
- Enable GPU acceleration
- Use faster preset (ultrafast, superfast)

### High Memory Usage
- Increase Node.js heap size
- Process smaller videos
- Close other applications
- Use SQLite instead of MySQL

## 12. Production Deployment Optimization

For deploying on a server:

```bash
# Use production build
pnpm build

# Start with optimized settings
NODE_ENV=production \
NODE_OPTIONS="--max-old-space-size=8192" \
pnpm start
```

## Recommended Settings for Different Scenarios

### Scenario 1: Fast Processing (< 5 minutes per video)
```
- Resolution: 720p
- Bitrate: 4 Mbps
- Audio: 16kHz mono
- GPU: Enabled
- Parallel: No
```

### Scenario 2: Balanced (10-15 minutes per video)
```
- Resolution: 1080p
- Bitrate: 6 Mbps
- Audio: 24kHz stereo
- GPU: Enabled if available
- Parallel: No
```

### Scenario 3: High Quality (20-30 minutes per video)
```
- Resolution: 1080p
- Bitrate: 8 Mbps
- Audio: 48kHz stereo
- GPU: Enabled
- Parallel: No
```

## Monitoring Checklist

- [ ] CPU usage < 90%
- [ ] Memory usage < 80%
- [ ] Disk I/O < 100 MB/s
- [ ] Network bandwidth < 50 Mbps (if using cloud)
- [ ] No error logs in console
- [ ] Processing time within expected range

---

**Last Updated**: February 2026
**Version**: 1.0.0

For more help, see [LOCAL_SETUP.md](./LOCAL_SETUP.md)
