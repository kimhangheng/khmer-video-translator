import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Upload, Film, Mic, Languages, CheckCircle2, AlertCircle,
  Download, ArrowLeft, Loader2, X, Play, Pause, Volume2
} from "lucide-react";
import { getLoginUrl } from "@/const";

type ProcessStep = "idle" | "uploading" | "extracting" | "transcribing" | "translating" | "completed" | "failed";
type SourceLang = "zh" | "en" | "hi" | "auto";
type VoiceProfile = "male" | "female" | "neutral";

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  originalText: string;
  khmerText: string;
}

interface TranslationResult {
  id: number;
  status: string;
  detectedLanguage?: string | null;
  khmerTranscript?: string | null;
  srtContent?: string | null;
  segments: TranscriptSegment[];
  videoUrl?: string | null;
  dubbedVideoUrl?: string | null;
}

const STEPS: { key: ProcessStep; label: string; icon: React.ElementType }[] = [
  { key: "uploading", label: "Upload", icon: Upload },
  { key: "extracting", label: "Extract", icon: Film },
  { key: "transcribing", label: "Transcribe", icon: Mic },
  { key: "translating", label: "Translate", icon: Languages },
];

const STEP_PROGRESS: Record<ProcessStep, number> = {
  idle: 0,
  uploading: 15,
  extracting: 35,
  transcribing: 65,
  translating: 85,
  completed: 100,
  failed: 0,
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export default function Translator() {
  const { user, isAuthenticated, loading } = useAuth();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceLang, setSourceLang] = useState<SourceLang>("auto");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>("neutral");
  const [burnInSubtitles, setBurnInSubtitles] = useState(false);
  const [step, setStep] = useState<ProcessStep>("idle");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [videoTime, setVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dubbingProgress, setDubbingProgress] = useState<{step: string; percentage: number; message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const processMutation = trpc.translation.process.useMutation({
    onSuccess: (data) => {
      setResult(data as TranslationResult);
      setStep("completed");
      toast.success("Translation completed!", { description: "Your Khmer subtitles are ready." });
    },
    onError: (err) => {
      setStep("failed");
      toast.error("Translation failed", { description: err.message });
    },
  });

  const validateFile = (file: File): string | null => {
    const validTypes = ["video/mp4", "video/webm", "video/avi", "video/x-msvideo"];
    const validExts = [".mp4", ".webm", ".avi"];
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      return "Invalid format. Please upload MP4, WebM, or AVI.";
    }
    if (file.size > 100 * 1024 * 1024) {
      return "File too large. Maximum size is 100MB.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }
    setSelectedFile(file);
    setResult(null);
    setStep("idle");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleProcess = async () => {
    if (!selectedFile) return;
    setStep("uploading");

    // Simulate step progression for UX
    const stepTimer = (delay: number, nextStep: ProcessStep) =>
      new Promise<void>((res) => setTimeout(() => { setStep(nextStep); res(); }, delay));

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];

      // Advance steps for UX feedback
      await stepTimer(800, "extracting");
      await stepTimer(1200, "transcribing");
      await stepTimer(1500, "translating");

      processMutation.mutate({
        videoBase64: base64,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "video/mp4",
        sourceLanguage: sourceLang,
        voiceProfile,
        burnInSubtitles,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  // Poll for dubbing progress
  useEffect(() => {
    if (!result?.id || result?.dubbedVideoUrl) return;
    const interval = setInterval(() => {
      if (result.id) {
        (async () => {
          try {
            const res = await fetch(`/api/trpc/translation.getProgress?input=${JSON.stringify({id: result.id})}`);
            const data = await res.json();
            if (data.result?.data) {
              setDubbingProgress({
                step: data.result.data.step,
                percentage: data.result.data.percentage,
                message: data.result.data.message,
              });
            }
          } catch (err) {
            console.error("Failed to fetch progress:", err);
          }
        })();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [result?.id, result?.dubbedVideoUrl]);

  // Sync video time to active segment
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      setVideoTime(video.currentTime);
      if (result?.segments) {
        const idx = result.segments.findIndex(
          (s) => video.currentTime >= s.start && video.currentTime <= s.end
        );
        setActiveSegmentIndex(idx);
        // Auto-scroll transcript
        if (idx >= 0 && transcriptRef.current) {
          const el = transcriptRef.current.querySelector(`[data-seg="${idx}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", () => setIsPlaying(true));
    video.addEventListener("pause", () => setIsPlaying(false));
    return () => { video.removeEventListener("timeupdate", onTimeUpdate); };
  }, [result]);

  const downloadSrt = () => {
    if (!result?.srtContent) return;
    const blob = new Blob([result.srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFile?.name?.replace(/\.[^.]+$/, "") ?? "translation"}_khmer.srt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SRT file downloaded!");
  };

  const downloadDubbedVideo = () => {
    if (!result?.dubbedVideoUrl) {
      toast.error("Dubbed video is not ready yet. Please check back in a moment.");
      return;
    }
    const a = document.createElement("a");
    a.href = result.dubbedVideoUrl;
    a.download = `${selectedFile?.name?.replace(/\.[^.]+$/, "") ?? "translation"}_dubbed_khmer.mp4`;
    a.click();
    toast.success("Dubbed video download started!");
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm w-full space-y-4">
          <Languages className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Sign in to continue</h2>
          <p className="text-muted-foreground text-sm">Please sign in to use the Khmer Video Translator.</p>
          <a href={getLoginUrl()}>
            <Button className="w-full bg-primary text-primary-foreground">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  const isProcessing = ["uploading", "extracting", "transcribing", "translating"].includes(step);
  const progress = STEP_PROGRESS[step];
  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Languages className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Translate Video</span>
          </div>
          <div className="ml-auto">
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground text-xs">
                History
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Upload Zone */}
        {!selectedFile && (
          <div
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
              dragOver
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-accent/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.avi,video/mp4,video/webm,video/avi,video/x-msvideo"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="py-14 px-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Drop your video here</p>
                <p className="text-sm text-muted-foreground">or tap to browse files</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {["MP4", "WebM", "AVI"].map((fmt) => (
                  <span key={fmt} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-mono">{fmt}</span>
                ))}
                <span className="text-muted-foreground text-xs">· Max 100MB</span>
              </div>
            </div>
          </div>
        )}

        {/* File Selected */}
        {selectedFile && step === "idle" && (
          <div className="glass-card rounded-2xl p-4 space-y-4">
            {/* Video Preview */}
            {previewUrl && (
              <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
                <video
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                />
              </div>
            )}

            {/* File info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Film className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Language selector */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Source Language</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "auto", label: "Auto Detect", sub: "Recommended" },
                  { value: "zh", label: "Chinese", sub: "普通话" },
                  { value: "en", label: "English", sub: "English" },
                  { value: "hi", label: "Hindi", sub: "हिंदी" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSourceLang(opt.value)}
                    className={`rounded-xl p-3 border text-left transition-all ${
                      sourceLang === opt.value
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Profile */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Voice Profile</p>
              <div className="grid grid-cols-3 gap-2">
                {([{value: "neutral", label: "Neutral"}, {value: "male", label: "Male"}, {value: "female", label: "Female"}] as const).map((opt) => (
                  <button key={opt.value} onClick={() => setVoiceProfile(opt.value)} className={`rounded-lg p-2 border text-xs font-medium transition-all ${voiceProfile === opt.value ? "border-primary bg-primary/15" : "border-border bg-muted/30 hover:border-primary/40"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Burn-in toggle */}
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/20">
              <input type="checkbox" id="burnIn" checked={burnInSubtitles} onChange={(e) => setBurnInSubtitles(e.target.checked)} className="w-4 h-4 rounded cursor-pointer accent-primary" />
              <label htmlFor="burnIn" className="text-xs font-medium text-foreground cursor-pointer">Burn-in Khmer subtitles into video</label>
            </div>

            <Button onClick={handleProcess} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 gap-2">
              <Languages className="w-4 h-4" />
              Translate to Khmer
            </Button>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="glass-card rounded-2xl p-6 space-y-6">
            {/* Steps */}
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isDone = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={s.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                        isDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                          ? "border-primary bg-primary/20 text-primary animate-pulse"
                          : "border-border bg-muted/30 text-muted-foreground"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isCurrent ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`h-px flex-1 max-w-8 transition-all ${i < currentStepIndex ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">
                  {step === "uploading" && "Uploading video..."}
                  {step === "extracting" && "Extracting audio track..."}
                  {step === "transcribing" && "Transcribing speech with Whisper AI..."}
                  {step === "translating" && "Translating to Khmer..."}
                </span>
                <span className="text-primary font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-muted" />
            </div>

            <p className="text-center text-xs text-muted-foreground">
              This may take a few minutes depending on video length
            </p>
          </div>
        )}

        {/* Failed */}
        {step === "failed" && (
          <div className="glass-card rounded-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Translation Failed</h3>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
            </div>
            <Button onClick={() => setStep("idle")} variant="outline" className="border-border text-foreground">
              Try Again
            </Button>
          </div>
        )}

        {/* Results */}
        {step === "completed" && result && (
          <div className="space-y-4">
            {/* Success header */}
            <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">Translation Complete</p>
                <p className="text-xs text-muted-foreground">
                  Detected: {result.detectedLanguage === "zh" ? "Chinese (中文)" : "English"} →{" "}
                  <span className="khmer-text">ភាសាខ្មែរ</span>
                </p>
              </div>
              <Button
                onClick={downloadSrt}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                SRT
              </Button>
            </div>

            {/* Video player with subtitle overlay */}
            {previewUrl && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative bg-black aspect-video">
                  <video
                    ref={videoRef}
                    src={previewUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {}}
                  />
                  {/* Subtitle overlay */}
                  {activeSegmentIndex >= 0 && result.segments[activeSegmentIndex] && (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4 pointer-events-none">
                      <div className="bg-black/75 backdrop-blur-sm rounded-lg px-3 py-1.5 max-w-xs text-center">
                        <p className="khmer-text text-white text-sm leading-relaxed">
                          {result.segments[activeSegmentIndex].khmerText}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Video controls */}
                <div className="p-3 flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-foreground"
                    onClick={() => {
                      if (videoRef.current) {
                        isPlaying ? videoRef.current.pause() : videoRef.current.play();
                      }
                    }}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <span className="text-xs text-muted-foreground font-mono">{formatTime(videoTime)}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: videoRef.current?.duration
                          ? `${(videoTime / videoRef.current.duration) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Khmer Transcript */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span className="khmer-text text-primary text-base">ខ្មែរ</span>
                  Khmer Transcript
                </h3>
                <span className="text-xs text-muted-foreground">{result.segments.length} segments</span>
              </div>
              <div ref={transcriptRef} className="max-h-72 overflow-y-auto p-3 space-y-2">
                {result.segments.map((seg, i) => (
                  <div
                    key={seg.id}
                    data-seg={i}
                    className={`flex gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
                      activeSegmentIndex === i
                        ? "bg-primary/15 border border-primary/30"
                        : "hover:bg-accent/50"
                    }`}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = seg.start;
                        videoRef.current.play();
                      }
                    }}
                  >
                    <span className="text-[10px] text-muted-foreground font-mono mt-1 shrink-0 w-12">
                      {formatSrtTime(seg.start).slice(0, 8)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5 truncate">{seg.originalText}</p>
                      <p className="khmer-text text-sm text-foreground leading-relaxed">{seg.khmerText}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dubbing Progress */}
            {!result?.dubbedVideoUrl && (
              <div className="glass-card rounded-2xl p-4 space-y-3 border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">Generating Khmer Dubbed Video</p>
                </div>
                <div className="space-y-1.5">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                      style={{ width: `${dubbingProgress?.percentage ?? 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">{dubbingProgress?.message ?? "Initializing..."}</p>
                    <p className="text-xs font-semibold text-primary">{dubbingProgress?.percentage ?? 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button
                  onClick={downloadSrt}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Download SRT
                </Button>
                <Button
                  onClick={downloadDubbedVideo}
                  className="flex-1 bg-green-600 text-white hover:bg-green-700 gap-2 font-semibold"
                  disabled={!result?.dubbedVideoUrl}
                >
                  <Film className="w-4 h-4" />
                  {result?.dubbedVideoUrl ? "Dubbed Video" : "Generating..."}
                </Button>
              </div>
              <Button
                onClick={clearFile}
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent gap-2"
              >
                <Upload className="w-4 h-4" />
                New Video
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
