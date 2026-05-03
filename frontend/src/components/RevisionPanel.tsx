import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import {
  Zap,
  Timer,
  Clock,
  BookOpen,
  Lightbulb,
  Tag,
  RefreshCw,
  Download,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "./SpeakButton";
import { cn } from "@/lib/utils";
import type { Revision, RevisionMode } from "@/lib/study-types";

interface RevisionPanelProps {
  title: string;
  revision: Revision;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const MODES: Array<{ key: RevisionMode; label: string; sub: string; icon: typeof Zap }> = [
  { key: "30s", label: "30 sec", sub: "Crash recap", icon: Zap },
  { key: "2min", label: "2 min", sub: "Quick review", icon: Timer },
  { key: "5min", label: "5 min", sub: "Full skim", icon: Clock },
];

const highlight = (text: string, terms: string[]) => {
  if (!terms.length) return text;
  const escaped = terms
    .filter((t) => t.trim().length > 1)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .sort((a, b) => b.length - a.length);
  if (!escaped.length) return text;
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark
        key={i}
        className="rounded bg-highlight/70 px-1 py-0.5 text-highlight-foreground font-medium"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
};

const buildNarration = (revision: Revision, mode: RevisionMode): string => {
  if (mode === "30s") return "Thirty second revision. " + revision.thirtySecond.join(". ");
  if (mode === "2min") return "Two minute revision. " + revision.twoMinute.join(". ");
  return (
    "Five minute revision. " +
    revision.fiveMinute.map((s) => `${s.heading}. ${s.bullets.join(". ")}`).join(". ")
  );
};

export const RevisionPanel = ({
  title,
  revision,
  isRegenerating,
  onRegenerate,
}: RevisionPanelProps) => {
  const [mode, setMode] = useState<RevisionMode>("30s");

  const allTerms = useMemo(
    () => [...revision.keywords, ...revision.definitions.map((d) => d.term)],
    [revision],
  );

  const narration = useMemo(() => buildNarration(revision, mode), [revision, mode]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;
    const wrap = (text: string, fontSize: number, lineHeight = 1.4) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      return { lines, height: lines.length * fontSize * lineHeight };
    };
    const ensureSpace = (h: number) => {
      if (y + h > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };
    const section = (label: string, items: string[] | string) => {
      doc.setFont("helvetica", "bold");
      const head = wrap(label, 13);
      ensureSpace(head.height + 8);
      doc.text(head.lines, margin, y + 12);
      y += head.height + 8;
      doc.setFont("helvetica", "normal");
      const body = Array.isArray(items) ? items.map((s) => `\u2022 ${s}`).join("\n") : items;
      const w = wrap(body, 11);
      ensureSpace(w.height);
      doc.text(w.lines, margin, y + 10);
      y += w.height + 18;
    };
    doc.setFont("helvetica", "bold");
    const t = wrap(`${title} — Last Minute Revision`, 20);
    ensureSpace(t.height);
    doc.text(t.lines, margin, y + 18);
    y += t.height + 16;

    section("30 second revision", revision.thirtySecond);
    section("2 minute revision", revision.twoMinute);
    revision.fiveMinute.forEach((s) => section(`5 min · ${s.heading}`, s.bullets));
    section("Memory hooks", revision.memoryHooks);
    section("Keywords", revision.keywords.join(", "));
    if (revision.definitions.length) {
      section(
        "Definitions",
        revision.definitions.map((d) => `${d.term}: ${d.definition}`),
      );
    }

    doc.save(`${title.replace(/[^a-z0-9]+/gi, "_") || "revision"}_revision.pdf`);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Zap className="h-3 w-3" />
            Last Minute Revision
          </div>
          <h2 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <SpeakButton text={narration} size="sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-lg"
          >
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRegenerating && "animate-spin")} />
            Revise again
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="rounded-lg">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-3 text-center transition-all",
                active
                  ? "bg-gradient-hero text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-1.5 text-sm font-bold">
                <Icon className="h-4 w-4" />
                {m.label}
              </div>
              <span className={cn("text-[11px]", active ? "text-primary-foreground/85" : "")}>
                {m.sub}
              </span>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">
                {mode === "30s" && "30-second revision"}
                {mode === "2min" && "2-minute revision"}
                {mode === "5min" && "5-minute revision"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {mode === "30s" && "Just the must-knows."}
                {mode === "2min" && "Concepts + 1-line explanations."}
                {mode === "5min" && "All major ideas, structured."}
              </p>
            </div>
          </div>
          <SpeakButton text={narration} compact size="sm" />
        </div>

        {mode === "30s" && (
          <ul className="space-y-2.5">
            {revision.thirtySecond.map((b, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-foreground/90">{highlight(b, allTerms)}</span>
              </li>
            ))}
          </ul>
        )}

        {mode === "2min" && (
          <ul className="space-y-3">
            {revision.twoMinute.map((b, i) => (
              <li
                key={i}
                className="rounded-xl border-l-2 border-accent bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90"
              >
                {highlight(b, allTerms)}
              </li>
            ))}
          </ul>
        )}

        {mode === "5min" && (
          <div className="space-y-5">
            {revision.fiveMinute.map((s, i) => (
              <div key={i} className="rounded-xl bg-muted/30 p-4 border border-border/60">
                <h4 className="font-display text-sm font-bold text-primary mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground text-[11px]">
                    {i + 1}
                  </span>
                  {s.heading}
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      <span>{highlight(b, allTerms)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
              <Lightbulb className="h-4 w-4" />
            </div>
            <h3 className="font-display text-base font-semibold">One-line memory hooks</h3>
          </div>
          <SpeakButton text={revision.memoryHooks.join(". ")} compact size="sm" />
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {revision.memoryHooks.map((h, i) => (
            <li
              key={i}
              className="rounded-xl bg-gradient-warm/10 border border-secondary/30 px-3 py-2.5 text-sm font-medium text-foreground/90"
            >
              <span className="text-secondary-foreground/70 mr-1.5">⚡</span>
              {h}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
              <Tag className="h-4 w-4" />
            </div>
            <h3 className="font-display text-base font-semibold">Keywords</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {revision.keywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-highlight/70 text-highlight-foreground px-3 py-1 text-xs font-semibold"
              >
                {k}
              </span>
            ))}
          </div>
        </section>

        {revision.definitions.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold">Definitions</h3>
            </div>
            <dl className="space-y-2.5">
              {revision.definitions.map((d) => (
                <div key={d.term} className="rounded-lg border border-border bg-muted/30 p-3">
                  <dt className="text-sm font-bold text-primary flex items-center justify-between">
                    {d.term}
                    <SpeakButton text={`${d.term}. ${d.definition}`} compact size="sm" />
                  </dt>
                  <dd className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {d.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
};
