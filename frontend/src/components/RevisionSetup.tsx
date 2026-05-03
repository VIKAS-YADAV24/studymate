import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Zap, Upload, BookOpen } from "lucide-react";
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
import { toast } from "sonner";
import { addNote, loadNotes } from "@/lib/study-storage";
import type { Note } from "@/lib/study-types";

interface RevisionSetupProps {
  isLoading: boolean;
  onGenerate: (title: string, content: string) => void;
}

export const RevisionSetup = ({ isLoading, onGenerate }: RevisionSetupProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
    setTitle(n.title);
    setContent(n.content);
    toast.success(`Loaded note: ${n.title}`);
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Please upload a file under 2 MB.");
      return;
    }
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) {
      toast.error("Only .txt, .md, .csv, .json supported. For PDFs, paste the text.");
      return;
    }
    const text = await file.text();
    const baseTitle = file.name.replace(/\.[^/.]+$/, "");
    setContent(text);
    if (!title) setTitle(baseTitle);

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: baseTitle,
      content: text,
      summary: null,
      messages: [],
      createdAt: Date.now(),
    };
    addNote(newNote);
    setNotes(loadNotes());
    toast.success("File loaded & saved to notes");
  };

  const handleSubmit = () => {
    if (content.trim().length < 20) {
      toast.error("Please add at least 20 characters of study material.");
      return;
    }
    onGenerate(title.trim() || "Untitled revision", content.trim());
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 md:py-16 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-medium text-primary">
          <Zap className="h-3.5 w-3.5" />
          Last Minute Revision AI
        </div>
        <h2 className="mt-5 font-display text-3xl md:text-5xl font-bold tracking-tight">
          Revise <span className="gradient-text">faster</span> before exams
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          Paste, upload, or pick a saved note. We'll compress it into 30 second, 2 minute, and 5 minute
          revisions — with memory hooks and audio playback.
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-border shadow-lift p-5 md:p-7 space-y-4">
        {noteOptions.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              Use a saved note
            </label>
            <Select value={selectedNoteId} onValueChange={handleNoteSelect}>
              <SelectTrigger className="h-11 rounded-xl bg-background/60">
                <SelectValue placeholder="Pick from your notes…" />
              </SelectTrigger>
              <SelectContent>
                {noteOptions.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Input
          placeholder="Title (e.g. Photosynthesis quick recap)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-background/60 text-base font-medium"
        />
        <div className="relative">
          <Textarea
            placeholder="Paste your study material here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] rounded-xl border-border bg-background/60 text-sm leading-relaxed resize-y scrollbar-thin"
          />
          <div className="absolute bottom-3 right-3 text-[11px] text-muted-foreground tabular-nums">
            {content.length.toLocaleString()} chars
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Upload className="h-4 w-4" />
            <span>Upload file (.txt / .md)</span>
            <input
              type="file"
              accept=".txt,.md,.csv,.json,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>

          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="rounded-xl bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-lift transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compressing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate revision
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
