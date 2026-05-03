import { useEffect, useRef, useState } from "react";
import { Volume2, Pause, Square, Globe, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadTtsLang, loadTtsRate, saveTtsLang, saveTtsRate, type TtsLang } from "@/lib/study-storage";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SpeakButtonProps {
  text: string;
  size?: "sm" | "md";
  showLanguageToggle?: boolean;
  className?: string;
  compact?: boolean;
}

const RATE_PRESETS = [0.75, 1, 1.25, 1.5, 2];

const pickVoice = (lang: TtsLang): SpeechSynthesisVoice | undefined => {
  if (typeof window === "undefined" || !window.speechSynthesis) return undefined;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;

  if (lang === "hi-IN") {
    return (
      voices.find((v) => v.lang === "hi-IN") ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("hi")) ||
      voices.find((v) => /hindi|हिन्दी|हिंदी/i.test(v.name)) ||
      voices.find((v) => /Lekha|Veena|Rishi|Kiran|Heera|Hemant|Kalpana/i.test(v.name)) ||
      voices.find((v) => /Google.*हिन्दी|Google.*Hindi/i.test(v.name))
    );
  }
  return (
    voices.find((v) => /Google.*US English|Samantha|Microsoft Aria|Natural/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en"))
  );
};

const waitForVoices = (timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener?.("voiceschanged", handler);
      resolve(synth.getVoices());
    };
    const handler = () => finish();
    synth.addEventListener?.("voiceschanged", handler);
    setTimeout(finish, timeoutMs);
  });
};

export const SpeakButton = ({
  text,
  size = "md",
  showLanguageToggle = true,
  className,
  compact = false,
}: SpeakButtonProps) => {
  const [lang, setLang] = useState<TtsLang>(() => loadTtsLang());
  const [rate, setRate] = useState<number>(() => loadTtsRate());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, [text]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handler = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
  }, []);

  const speak = async () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Your browser doesn't support speech synthesis.");
      return;
    }
    if (!text.trim()) return;

    if (isPaused && utterRef.current) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    await waitForVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang);

    if (lang === "hi-IN") {
      u.lang = v?.lang?.toLowerCase().startsWith("hi") ? v.lang : "hi-IN";
    } else {
      u.lang = v?.lang || lang;
    }
    if (v) u.voice = v;

    const base = lang === "hi-IN" ? 0.92 : 1;
    u.rate = Math.max(0.5, Math.min(2, base * rate));
    u.pitch = 1;
    u.volume = 1;

    if (lang === "hi-IN" && !v) {
      toast.message("No Hindi voice installed", {
        description:
          "Install a Hindi system voice for best results. macOS: Accessibility → Spoken Content → Manage Voices → Hindi (Lekha). Windows: Time & Language → Speech → Add voices → Hindi.",
        duration: 8000,
      });
    }

    u.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    u.onerror = (e) => {
      setIsPlaying(false);
      setIsPaused(false);
      const err = (e as SpeechSynthesisErrorEvent).error;
      if (err && err !== "canceled" && err !== "interrupted") {
        toast.error(`Speech error: ${err}`);
      }
    };
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pause = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const stop = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const toggleLang = () => {
    const next: TtsLang = lang === "en-US" ? "hi-IN" : "en-US";
    setLang(next);
    saveTtsLang(next);
    if (isPlaying || isPaused) stop();
  };

  const setRateAndPersist = (r: number) => {
    setRate(r);
    saveTtsRate(r);
    if (isPlaying || isPaused) {
      stop();
      setTimeout(() => speak(), 50);
    }
  };

  const btnSize = size === "sm" ? "h-8" : "h-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (compact) {
    return (
      <button
        type="button"
        aria-label={isPlaying ? "Stop reading" : "Read aloud"}
        onClick={isPlaying ? stop : speak}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground hover:text-primary hover:bg-primary-soft transition-colors",
          isPlaying && "text-primary bg-primary-soft animate-speak",
          className,
        )}
      >
        <Volume2 className={iconSize} />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card/70 backdrop-blur-sm p-1 shadow-soft",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={isPaused ? speak : isPlaying ? pause : speak}
        className={cn(
          "rounded-full px-3 gap-1.5",
          btnSize,
          isPlaying && !isPaused && "text-primary",
          isPlaying && !isPaused && "animate-speak",
        )}
        aria-label={isPlaying && !isPaused ? "Pause" : "Play"}
      >
        {isPlaying && !isPaused ? <Pause className={iconSize} /> : <Volume2 className={iconSize} />}
        <span className="text-xs font-medium">
          {isPlaying && !isPaused ? "Pause" : isPaused ? "Resume" : "Listen"}
        </span>
      </Button>
      {(isPlaying || isPaused) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={stop}
          className={cn("rounded-full px-2", btnSize)}
          aria-label="Stop"
        >
          <Square className={iconSize} />
        </Button>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Playback speed"
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tabular-nums bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary transition-colors",
              btnSize,
            )}
            title="Playback speed"
          >
            <Gauge className="h-3 w-3" />
            {rate}×
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Playback speed
          </p>
          <div className="flex gap-1">
            {RATE_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRateAndPersist(r)}
                className={cn(
                  "h-8 min-w-12 rounded-md px-2 text-xs font-semibold tabular-nums border transition-colors",
                  rate === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                {r}×
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {showLanguageToggle && (
        <button
          type="button"
          onClick={toggleLang}
          aria-label="Toggle language"
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground hover:bg-primary-soft hover:text-primary transition-colors",
            btnSize,
          )}
          title={lang === "en-US" ? "English (switch to Hindi)" : "हिन्दी (switch to English)"}
        >
          <Globe className="h-3 w-3" />
          {lang === "en-US" ? "EN" : "हिं"}
        </button>
      )}
    </div>
  );
};
