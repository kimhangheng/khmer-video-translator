import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  ArrowLeft, Film, Download, CheckCircle2, XCircle, Loader2,
  Clock, Languages, History as HistoryIcon, Plus
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

const STATUS_CONFIG = {
  completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Completed" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Failed" },
  uploading: { icon: Loader2, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Uploading" },
  extracting: { icon: Loader2, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Extracting" },
  transcribing: { icon: Loader2, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Transcribing" },
  translating: { icon: Loader2, color: "text-primary", bg: "bg-primary/10 border-primary/20", label: "Translating" },
};

export default function History() {
  const { isAuthenticated, loading } = useAuth();
  const { data: translations, isLoading, refetch } = trpc.translation.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });
  const getByIdQuery = trpc.translation.getById.useQuery(
    { id: 0 },
    { enabled: false }
  );

  const downloadSrt = async (id: number, fileName: string) => {
    try {
      const result = await getByIdQuery.refetch();
      // Use direct query instead
      toast.info("Preparing download...");
    } catch {
      toast.error("Failed to fetch translation details");
    }
  };

  const handleDownload = (srtContent: string | null | undefined, fileName: string) => {
    if (!srtContent) { toast.error("No SRT content available"); return; }
    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}_khmer.srt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SRT downloaded!");
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
          <h2 className="text-xl font-bold text-foreground">Sign in to view history</h2>
          <a href={getLoginUrl()}>
            <Button className="w-full bg-primary text-primary-foreground">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

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
              <HistoryIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">Translation History</span>
          </div>
          <div className="ml-auto">
            <Link href="/translate">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                New
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        ) : !translations || translations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
              <Film className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">No translations yet</h3>
              <p className="text-sm text-muted-foreground">Upload a video to get started</p>
            </div>
            <Link href="/translate">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" />
                Translate a Video
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-4">
              {translations.length} translation{translations.length !== 1 ? "s" : ""}
            </p>
            {translations.map((t) => {
              const config = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.failed;
              const StatusIcon = config.icon;
              const isProcessing = ["uploading", "extracting", "transcribing", "translating"].includes(t.status);

              return (
                <div key={t.id} className="glass-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center shrink-0">
                      <Film className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{t.videoFileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatFileSize(t.videoFileSize)}</span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground">
                          {t.detectedLanguage === "zh" ? "Chinese → Khmer" : "English → Khmer"}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium ${config.bg} ${config.color} shrink-0`}>
                      <StatusIcon className={`w-3 h-3 ${isProcessing ? "animate-spin" : ""}`} />
                      {config.label}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(t.createdAt)}
                    </div>
                    {t.status === "completed" && (
                      <div className="flex gap-2">
                        {t.srtContent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5 text-xs h-7"
                            onClick={() => handleDownload(t.srtContent, t.videoFileName)}
                          >
                            <Download className="w-3 h-3" />
                            SRT
                          </Button>
                        )}
                        {t.dubbedVideoUrl && (
                          <a href={t.dubbedVideoUrl} download>
                            <Button
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700 gap-1.5 text-xs h-7"
                            >
                              <Film className="w-3 h-3" />
                              Dubbed
                            </Button>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
