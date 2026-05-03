import { Download, RotateCcw, Sparkles, FileText, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";
import type { Quiz, QuizDifficulty } from "@/lib/study-types";

interface QuizPlayerProps {
  quiz: Quiz;
  onRestart: () => void;
  onNew: () => void;
}

const DIFF_LABEL: Record<QuizDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const DIFF_TONE: Record<QuizDifficulty, string> = {
  easy: "bg-success/15 text-success border-success/30",
  medium: "bg-secondary/20 text-secondary-foreground border-secondary/40",
  hard: "bg-destructive/15 text-destructive border-destructive/30",
};

const buildQuizText = (quiz: Quiz): string => {
  const lines: string[] = [];
  lines.push(quiz.title);
  lines.push("=".repeat(Math.max(10, quiz.title.length)));
  lines.push(`Difficulty: ${DIFF_LABEL[quiz.difficulty]}`);
  lines.push(`Total questions: ${quiz.questions.length}`);
  lines.push("");
  quiz.questions.forEach((q, i) => {
    lines.push(`Q${i + 1}. ${q.question}`);
    q.options.forEach((opt, j) => {
      lines.push(`   ${String.fromCharCode(65 + j)}. ${opt}`);
    });
    lines.push("");
  });
  lines.push("");
  lines.push("Answers");
  lines.push("=======");
  quiz.questions.forEach((q, i) => {
    const letter = String.fromCharCode(65 + q.correctIndex);
    const answerText = q.options[q.correctIndex] ?? "";
    lines.push(`Q${i + 1}. ${letter}. ${answerText}`);
    if (q.explanation) lines.push(`   Why: ${q.explanation}`);
    lines.push("");
  });
  return lines.join("\n");
};

const sanitizeFilename = (s: string) =>
  s.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-").toLowerCase() || "quiz";

export const QuizPlayer = ({ quiz, onRestart, onNew }: QuizPlayerProps) => {
  const total = quiz.questions.length;

  const downloadTxt = () => {
    const blob = new Blob([buildQuizText(quiz)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFilename(quiz.title)}-questions.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const allOptionsText = quiz.questions
    .map((q, i) =>
      `Question ${i + 1}. ${q.question}. Options: ${q.options
        .map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`)
        .join(". ")}`,
    )
    .join(". ");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 animate-fade-in-up">
      <div className="rounded-3xl border border-border bg-gradient-card shadow-lift p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  DIFF_TONE[quiz.difficulty],
                )}
              >
                {DIFF_LABEL[quiz.difficulty]}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {total} question{total === 1 ? "" : "s"}
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold leading-tight">
              {quiz.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Practice the questions first, then scroll down to review the answers.
            </p>
          </div>
          <SpeakButton text={allOptionsText} compact size="sm" />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={downloadTxt}
            className="rounded-xl bg-gradient-hero text-primary-foreground shadow-glow"
          >
            <Download className="mr-2 h-4 w-4" />
            Download questions (.txt)
          </Button>
          <Button variant="outline" onClick={onRestart} className="rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button variant="outline" onClick={onNew} className="rounded-xl">
            <Sparkles className="mr-2 h-4 w-4" />
            New quiz
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Questions
        </p>
        {quiz.questions.map((q, i) => {
          const optionsToRead = q.options
            .map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`)
            .join(". ");
          return (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card shadow-soft p-5 md:p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-display text-base md:text-lg font-bold leading-snug flex-1 min-w-0">
                  <span className="text-muted-foreground mr-1.5">Q{i + 1}.</span>
                  {q.question}
                </h3>
                <SpeakButton
                  text={`Question ${i + 1}. ${q.question}. Options. ${optionsToRead}`}
                  compact
                  size="sm"
                />
              </div>
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {String.fromCharCode(65 + j)}
                    </span>
                    <span className="flex-1 text-sm">{opt}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Answer key
          </p>
          <SpeakButton
            text={quiz.questions
              .map(
                (q, i) =>
                  `Question ${i + 1}. Answer: ${String.fromCharCode(65 + q.correctIndex)}. ${
                    q.options[q.correctIndex] ?? ""
                  }. ${q.explanation ? `Explanation: ${q.explanation}` : ""}`,
              )
              .join(". ")}
            compact
            size="sm"
          />
        </div>

        <div className="rounded-2xl border border-success/30 bg-success/5 shadow-soft overflow-hidden">
          <ol className="divide-y divide-success/15">
            {quiz.questions.map((q, i) => {
              const letter = String.fromCharCode(65 + q.correctIndex);
              const answerText = q.options[q.correctIndex] ?? "";
              return (
                <li key={i} className="p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-xs font-bold text-success">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium text-foreground/90 leading-snug">
                        {q.question}
                      </p>
                      <div className="flex items-start gap-2 rounded-xl bg-success/10 border border-success/25 px-3 py-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <p className="text-sm leading-snug">
                          <span className="font-bold text-success mr-1.5">{letter}.</span>
                          <span className="font-medium">{answerText}</span>
                        </p>
                      </div>
                      {q.explanation && (
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-1">
                          <span className="font-semibold text-foreground/80">Why: </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};
