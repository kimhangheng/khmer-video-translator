import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Film, Languages, Subtitles, History, ArrowRight, Sparkles, Mic, FileText } from "lucide-react";

const features = [
  {
    icon: Film,
    title: "Video Upload",
    desc: "Drag & drop MP4, WebM, or AVI files up to 100MB",
  },
  {
    icon: Mic,
    title: "AI Transcription",
    desc: "Whisper-powered speech recognition for Chinese & English",
  },
  {
    icon: Languages,
    title: "Khmer Translation",
    desc: "LLM-based translation with specialized Khmer linguistic prompts",
  },
  {
    icon: Subtitles,
    title: "SRT Export",
    desc: "Download timestamped Khmer subtitle files instantly",
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
              <Languages className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm tracking-wide text-foreground">KhmerVoice</span>
          </div>
          {!loading && (
            isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/history">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <History className="w-4 h-4 mr-1" />
                    History
                  </Button>
                </Link>
                <Link href="/translate">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    Translate
                  </Button>
                </Link>
              </div>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                  Sign In
                </Button>
              </a>
            )
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="relative overflow-hidden px-4 pt-16 pb-12 max-w-2xl mx-auto w-full">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute top-20 left-0 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

          <div className="relative text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered · Whisper + LLM
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight leading-tight">
                <span className="text-foreground">Translate Video</span>
                <br />
                <span className="gold-gradient">Vocals to Khmer</span>
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
                Upload any video in Chinese or English and receive accurate Khmer subtitles powered by Whisper AI and advanced language models.
              </p>
            </div>

            {/* CTA */}
            {!loading && (
              isAuthenticated ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/translate">
                    <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 gap-2 w-full sm:w-auto">
                      Start Translating
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-accent gap-2 w-full sm:w-auto">
                      <History className="w-4 h-4" />
                      View History
                    </Button>
                  </Link>
                </div>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-8 gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              )
            )}

            {/* Khmer sample */}
            <div className="glass-card rounded-2xl p-4 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-muted-foreground">Sample output</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0 font-mono">00:00:02</span>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">你好，欢迎来到我们的频道</p>
                    <p className="khmer-text text-sm text-foreground">សួស្តី ស្វាគមន៍មកកាន់채널របស់យើង</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0 font-mono">00:00:05</span>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Today we'll learn something new</p>
                    <p className="khmer-text text-sm text-foreground">ថ្ងៃនេះ យើងនឹងរៀនអ្វីថ្មីមួយ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 pb-16 max-w-2xl mx-auto w-full">
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-card rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline steps */}
        <section className="px-4 pb-20 max-w-2xl mx-auto w-full">
          <h2 className="text-center text-sm font-medium text-muted-foreground mb-6 uppercase tracking-widest">How it works</h2>
          <div className="flex items-center justify-between gap-1">
            {[
              { num: "01", label: "Upload", sub: "Video file" },
              { num: "02", label: "Extract", sub: "Audio track" },
              { num: "03", label: "Transcribe", sub: "Whisper AI" },
              { num: "04", label: "Translate", sub: "To Khmer" },
            ].map((step, i, arr) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-xs font-bold">{step.num}</span>
                  </div>
                  <span className="text-xs font-medium text-foreground">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.sub}</span>
                </div>
                {i < arr.length - 1 && (
                  <div className="h-px flex-1 max-w-6 bg-gradient-to-r from-primary/40 to-border" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 text-center">
        <p className="text-xs text-muted-foreground">KhmerVoice · AI Video Translation · <span className="khmer-text">ប្រែភាសាខ្មែរ</span></p>
      </footer>
    </div>
  );
}
