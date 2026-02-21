# Local Machine Setup Guide

This guide will help you run the Khmer Video Translator on your local machine for improved performance and faster processing.

## System Requirements

- **Node.js**: v18 or higher
- **npm/pnpm**: Package manager
- **FFmpeg**: For audio/video processing
- **Python 3.8+**: For some processing tasks
- **RAM**: Minimum 4GB (8GB recommended for video processing)
- **Storage**: At least 20GB free space for temporary files

## Installation Steps

### 1. Install Node.js

Download and install from [nodejs.org](https://nodejs.org/). Choose the LTS version.

Verify installation:
```bash
node --version
npm --version
```

### 2. Install FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### 3. Clone and Setup Project

```bash
# Navigate to your desired directory
cd ~/projects

# Clone or extract the project
git clone <repository-url>
cd khmer-video-translator

# Install dependencies
pnpm install
# or
npm install
```

### 4. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Database
DATABASE_URL="mysql://user:password@localhost:3306/khmer_translator"

# OAuth (optional for local testing)
VITE_APP_ID="your-app-id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# JWT Secret
JWT_SECRET="your-secret-key-min-32-chars-long"

# File Storage (S3 - optional, uses local temp files if not configured)
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket"

# LLM API (for translation)
BUILT_IN_FORGE_API_URL="https://api.manus.im"
BUILT_IN_FORGE_API_KEY="your-api-key"

# Frontend
VITE_APP_TITLE="KhmerVoice"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-key"
```

### 5. Database Setup

**Option A: Using MySQL locally**

```bash
# Install MySQL
# Windows: Download from mysql.com
# macOS: brew install mysql
# Linux: sudo apt-get install mysql-server

# Start MySQL service
mysql.server start  # macOS
# or
sudo systemctl start mysql  # Linux

# Create database
mysql -u root -p
> CREATE DATABASE khmer_translator;
> EXIT;

# Run migrations
pnpm db:push
```

**Option B: Using SQLite (simpler for local testing)**

Modify `.env.local`:
```
DATABASE_URL="file:./khmer_translator.db"
```

Then run:
```bash
pnpm db:push
```

### 6. Start Development Server

```bash
# Terminal 1: Start backend server
pnpm dev

# Terminal 2: Start frontend (if separate)
cd client
pnpm dev
```

The app will be available at `http://localhost:3000`

## Performance Optimization Tips

### 1. Video Processing

- **Reduce video resolution**: Process videos at 720p instead of 4K for faster encoding
- **Shorter videos**: Test with videos under 5 minutes first
- **Hardware acceleration**: Enable GPU acceleration in FFmpeg if available

### 2. Memory Management

- Close unnecessary applications to free up RAM
- Increase Node.js heap size if needed:
  ```bash
  NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
  ```

### 3. Parallel Processing

- Process multiple videos sequentially rather than simultaneously
- Monitor system resources with `top` (Linux/macOS) or Task Manager (Windows)

### 4. Caching

- Enable browser caching for faster UI loads
- Cache transcription results to avoid re-processing

## Troubleshooting

### FFmpeg not found
```bash
# Verify FFmpeg is installed
ffmpeg -version

# Add to PATH if needed
# Windows: Add FFmpeg bin folder to System Environment Variables
# macOS/Linux: Usually auto-added during installation
```

### Database connection error
```bash
# Check MySQL is running
mysql -u root -p  # Should connect successfully

# Verify DATABASE_URL in .env.local
# Format: mysql://username:password@host:port/database
```

### Out of memory errors
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=8192" pnpm dev

# Or process smaller videos
```

### Port 3000 already in use
```bash
# Kill the process using port 3000
# Windows: netstat -ano | findstr :3000
# macOS/Linux: lsof -i :3000 | grep LISTEN

# Or use a different port
PORT=3001 pnpm dev
```

## Local vs Cloud Processing

| Aspect | Local | Cloud |
|--------|-------|-------|
| Speed | Faster (no network latency) | Slower (network overhead) |
| Cost | Free (your hardware) | Paid (API calls) |
| Scalability | Limited by local hardware | Unlimited |
| Maintenance | You manage | Service manages |
| Privacy | Data stays local | Data sent to servers |

## Next Steps

1. **Test with sample videos**: Try with a short 30-second test video first
2. **Monitor performance**: Use system monitoring tools to optimize
3. **Batch processing**: Once stable, process multiple videos
4. **Deploy to production**: Use the Manus platform for production deployment

## Support

For issues:
1. Check the troubleshooting section above
2. Review FFmpeg documentation: https://ffmpeg.org/
3. Check Node.js logs for errors
4. Enable debug mode: `DEBUG=* pnpm dev`

---

**Last Updated**: February 2026
**Version**: 1.0.0
