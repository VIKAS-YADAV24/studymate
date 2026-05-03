import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import { Sparkles, Lightbulb, Tag, Target, BookMarked, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeakButton } from "./SpeakButton";
import type { Summary } from "@/lib/study-types";

interface SummaryPanelProps {
  title: string;
  summary: Summary;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const SummaryPanel = ({ title, summary, onRegenerate, isRegenerating }: SummaryPanelProps) => {
  const narrationText = [
    summary.summary,
    "Key points: " + summary.keyPoints.join(". "),
    "Quick revision: " + summary.revisionBullets.join(". "),
  ].join(". ");

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const wrap = (text: string, fontSize: number, lineHeight = 1.4) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
      return { lines, height: lines.length * fontSize * lineHeight };
    };
    let y = margin;
    const ensureSpace = (h: number) => {
      if (y + h > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };
    doc.setFont("helvetica", "bold");
    const t = wrap(title, 22);
    ensureSpace(t.height);
    doc.text(t.lines, margin, y + 18);
    y += t.height + 16;

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

    section("Summary", summary.summary);
    section("Key points", summary.keyPoints);
    section("Keywords", summary.keywords.join(", "));
    section("Revision bullets", summary.revisionBullets);
    if (summary.difficultWords.length) {
      section(
        "Difficult words",
        summary.difficultWords.map((d) => `${d.word}: ${d.meaning}`),
      );
    }

    doc.save(`${title.replace(/[^a-z0-9]+/gi, "_") || "summary"}.pdf`);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-generated summary · for revision use only
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SpeakButton text={narrationText} size="sm" />
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isRegenerating} className="rounded-lg">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="rounded-lg">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <BookMarked className="h-4 w-4" />
            </div>
            <h3 className="font-display text-base font-semibold">Summary</h3>
          </div>
          <SpeakButton text={summary.summary} compact size="sm" />
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert text-foreground/90 leading-relaxed">
          <ReactMarkdown>{summary.summary}</ReactMarkdown>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/20 text-secondary-foreground">
                <Lightbulb className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold">Key points</h3>
            </div>
            <SpeakButton text={summary.keyPoints.join(". ")} compact size="sm" />
          </div>
          <ul className="space-y-2.5">
            {summary.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-soft text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-foreground/85 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
                <Target className="h-4 w-4" />
              </div>
              <h3 className="font-display text-base font-semibold">Quick revision</h3>
            </div>
            <SpeakButton text={summary.revisionBullets.join(". ")} compact size="sm" />
          </div>
          <ul className="space-y-2">
            {summary.revisionBullets.map((b, i) => (
              <li
                key={i}
                className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground/85 border-l-2 border-accent"
              >
                {b}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-highlight text-highlight-foreground">
            <Tag className="h-4 w-4" />
          </div>
          <h3 className="font-display text-base font-semibold">Keywords</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {summary.keywords.map((k) => (
            <span
              key={k}
              className="rounded-full bg-highlight/70 text-highlight-foreground px-3 py-1 text-xs font-medium"
            >
              {k}
            </span>
          ))}
        </div>
      </section>

      {summary.difficultWords.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="font-display text-base font-semibold">Tough words, explained</h3>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.difficultWords.map((d) => (
              <div key={d.word} className="rounded-xl border border-border bg-muted/30 p-3">
                <dt className="text-sm font-semibold text-primary flex items-center justify-between">
                  {d.word}
                  <SpeakButton text={`${d.word}. ${d.meaning}`} compact size="sm" />
                </dt>
                <dd className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
};
