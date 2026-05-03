import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Brain, Zap, Flame, Upload, FileText, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addNote, loadNotes } from "@/lib/study-storage";
import type { Note, QuizDifficulty } from "@/lib/study-types";

interface QuizSetupProps {
  isLoading: boolean;
  onGenerate: (topic: string, difficulty: QuizDifficulty, numQuestions: number) => void;
}

const LEVELS: Array<{
  key: QuizDifficulty;
  label: string;
  desc: string;
  icon: typeof Brain;
  tone: string;
}> = [
  { key: "easy", label: "Easy", desc: "Definitions & recall", icon: Sparkles, tone: "from-success/30 to-success/5 border-success/40" },
  { key: "medium", label: "Medium", desc: "Apply & compare", icon: Brain, tone: "from-primary/30 to-primary/5 border-primary/40" },
  { key: "hard", label: "Hard", desc: "Analyze & synthesize", icon: Flame, tone: "from-destructive/30 to-destructive/5 border-destructive/40" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export const QuizSetup = ({ isLoading, onGenerate }: QuizSetupProps) => {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("medium");
  const [num, setNum] = useState(10);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const noteOptions = useMemo(
    () => notes.filter((n) => (n.content || "").trim().length > 20),
    [notes],
  );

  const handleNoteSelect = (id: string) => {
    setSelectedNoteId(id);
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    setTopic(n.content);
    toast.success(`Loaded note: ${n.title}`);
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please upload a file under 2 MB.");
      return;
    }
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) {
      toast.error("Only .txt, .md, .csv, .json are supported. For PDFs, paste the text.");
      return;
    }
    const text = await file.text();
    setTopic(text);
    setSelectedNoteId("");
    const title = file.name.replace(/\.[^/.]+$/, "") || "Uploaded note";
    if (text.trim().length >= 20) {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title,
        content: text,
        summary: null,
        messages: [],
        createdAt: Date.now(),
      };
      addNote(newNote);
      setNotes(loadNotes());
      toast.success(`Saved "${title}" to your notes`);
    } else {
      toast.success(`Loaded ${file.name}`);
    }
  };

  const handle = () => {
    if (topic.trim().length < 3) return;
    onGenerate(topic.trim(), difficulty, num);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-medium text-primary">
          <Brain className="h-3.5 w-3.5" />
          Quiz Generator
        </div>
        <h1 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
          Test yourself on <span className="gradient-text">any topic</span>
        </h1>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          Type a topic, paste study text, upload a file, or pull from your saved notes.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card shadow-lift p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              From your notes
            </label>
            <Select value={selectedNoteId} onValueChange={handleNoteSelect}>
              <SelectTrigger className="mt-2 h-11 rounded-xl border-border bg-background/60">
                <SelectValue
                  placeholder={
                    noteOptions.length === 0
                      ? "No saved notes yet"
                      : `Pick from ${noteOptions.length} note${noteOptions.length === 1 ? "" : "s"}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {noteOptions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Create a note in the Notes area first.
                  </div>
                ) : (
                  noteOptions.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[18rem]">{n.title || "Untitled note"}</span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload a file
            </label>
            <label className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Upload className="h-4 w-4" />
              <span>.txt / .md / .csv / .json</span>
              <Input
                type="file"
                accept=".txt,.md,.csv,.json,text/plain"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Topic or study text
          </label>
          <Textarea
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (selectedNoteId) setSelectedNoteId("");
            }}
            placeholder={"e.g. \"Photosynthesis in plants\" — or paste a paragraph from your notes."}
            className="mt-2 min-h-[140px] rounded-xl border-border bg-background/60 text-sm leading-relaxed resize-y scrollbar-thin"
          />
          <div className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
            {topic.length.toLocaleString()} chars
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Difficulty
          </label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LEVELS.map((lvl) => {
              const Icon = lvl.icon;
              const active = difficulty === lvl.key;
              return (
                <button
                  key={lvl.key}
                  type="button"
                  onClick={() => setDifficulty(lvl.key)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all bg-gradient-to-br",
                    active ? `${lvl.tone} shadow-glow scale-[1.02]` : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <Icon className={cn("h-5 w-5 mb-2", active ? "text-primary" : "text-muted-foreground")} />
                  <p className="font-display text-base font-semibold">{lvl.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{lvl.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Number of questions
            </label>
            <div className="mt-2 flex gap-1.5">
              {QUESTION_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNum(n)}
                  className={cn(
                    "h-9 min-w-11 rounded-lg px-3 text-sm font-semibold border transition-colors",
                    num === n
                      ? "bg-primary text-primary-foreground border-primary shadow-soft"
                      : "bg-background border-border text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handle}
            disabled={isLoading || topic.trim().length < 3}
            size="lg"
            className="rounded-xl bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-lift transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating quiz…
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate quiz
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
