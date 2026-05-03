import { useRef, useState, useCallback } from "react";
import { Sparkles, Upload, FileText, Loader2, FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadPanelProps {
  initialTitle?: string;
  initialContent?: string;
  isLoading: boolean;
  onSubmit: (title: string, content: string) => void;
}

type FileStatus = "idle" | "reading" | "done" | "error";

interface LoadedFile {
  name: string;
  size: number;
  charCount: number;
}

// ── PDF extraction via pdfjs-dist ──────────────────────────────────────────
async function extractPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const version = (pdfjsLib as any).version ?? "4.4.168";
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (pageText) pages.push(pageText);
  }
  return pages.join("\n\n");
}

// ── DOCX extraction via mammoth ────────────────────────────────────────────
async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return result.value;
}

const MAX_SIZE_MB = 20;
const ACCEPTED_EXT = /\.(pdf|docx|txt|md|csv|json)$/i;

function fileIcon(name: string) {
  if (/\.pdf$/i.test(name))
    return <span className="text-[11px] font-bold text-red-500 border border-red-300 rounded px-1 dark:border-red-700">PDF</span>;
  if (/\.docx$/i.test(name))
    return <span className="text-[11px] font-bold text-blue-500 border border-blue-300 rounded px-1 dark:border-blue-700">DOC</span>;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const UploadPanel = ({
  initialTitle = "",
  initialContent = "",
  isLoading,
  onSubmit,
}: UploadPanelProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_EXT.test(file.name)) {
        toast.error("Unsupported file. Please upload a PDF, DOCX, TXT, or MD file.");
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`File too large — maximum is ${MAX_SIZE_MB} MB.`);
        return;
      }

      setFileStatus("reading");
      setLoadedFile(null);

      try {
        let text = "";
        if (/\.pdf$/i.test(file.name)) {
          toast.info("Extracting text from PDF…");
          text = await extractPdf(file);
        } else if (/\.docx$/i.test(file.name)) {
          toast.info("Reading Word document…");
          text = await extractDocx(file);
        } else {
          text = await file.text();
        }

        if (!text.trim()) {
          toast.error(
            "No text found. The file may be scanned or image-only. Try copy-pasting instead."
          );
          setFileStatus("error");
          return;
        }

        setContent(text);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
        setLoadedFile({ name: file.name, size: file.size, charCount: text.length });
        setFileStatus("done");
        toast.success(`"${file.name}" loaded — ${text.length.toLocaleString()} characters extracted.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to read the file. Try copy-pasting the text instead.");
        setFileStatus("error");
      }
    },
    [title]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const clearFile = () => {
    setLoadedFile(null);
    setFileStatus("idle");
    setContent("");
  };

  const handleSubmit = () => {
    if (content.trim().length < 20) {
      toast.error("Please add at least 20 characters of study material.");
      return;
    }
    onSubmit(title.trim() || "Untitled note", content.trim());
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 md:py-20 animate-fade-in-up">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered study buddy
        </div>
        <h2 className="mt-5 font-display text-3xl md:text-5xl font-bold tracking-tight">
          Turn notes into <span className="gradient-text">instant clarity</span>
        </h2>
        <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
          Upload a PDF, Word doc, or text file — or paste your study material directly.
          StudyMate summarizes, highlights keywords, builds flowcharts, and chats with you about it.
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-card border border-border shadow-lift p-5 md:p-7 space-y-4">
        <Input
          placeholder="Note title (e.g. Photosynthesis chapter)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-11 rounded-xl border-border bg-background/60 text-base font-medium"
        />

        {/* ── Drop zone ──────────────────────────────────────────────────── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileStatus !== "reading" && !loadedFile && fileInputRef.current?.click()}
          className={cn(
            "relative rounded-xl border-2 border-dashed transition-all",
            fileStatus === "reading"
              ? "cursor-wait border-primary/40 bg-primary/5"
              : loadedFile
              ? "cursor-default border-green-500/40 bg-green-500/5"
              : "cursor-pointer hover:border-primary/50 hover:bg-muted/30",
            isDragging && "border-primary bg-primary/5 scale-[1.01]",
            !loadedFile && !isDragging && "border-border"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.csv,.json"
            className="hidden"
            onChange={handleFileChange}
          />

          {fileStatus === "reading" ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Extracting text from file…</p>
            </div>
          ) : loadedFile ? (
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                {fileIcon(loadedFile.name)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{loadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(loadedFile.size)} · {loadedFile.charCount.toLocaleString()} chars extracted ✓
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="shrink-0 rounded-lg p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
              <div className="rounded-xl bg-muted p-3">
                <FileUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Drop a file here, or{" "}
                  <span className="text-primary underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports PDF, DOCX, TXT, MD — up to {MAX_SIZE_MB} MB
                </p>
              </div>
              {/* Format pills */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-0.5">
                {[
                  { label: "PDF",  cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/50" },
                  { label: "DOCX", cls: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/50" },
                  { label: "TXT",  cls: "bg-muted text-muted-foreground border-border" },
                  { label: "MD",   cls: "bg-muted text-muted-foreground border-border" },
                  { label: "CSV",  cls: "bg-muted text-muted-foreground border-border" },
                ].map(({ label, cls }) => (
                  <span
                    key={label}
                    className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold", cls)}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or paste text directly</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* ── Textarea ────────────────────────────────────────────────────── */}
        <div className="relative">
          <Textarea
            placeholder={"Paste your study material here…\n\nTip: works with notes, textbook excerpts, articles, or lecture transcripts."}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (loadedFile) { setLoadedFile(null); setFileStatus("idle"); }
            }}
            className="min-h-[180px] rounded-xl border-border bg-background/60 text-sm leading-relaxed resize-y scrollbar-thin"
          />
          <div className="absolute bottom-3 right-3 text-[11px] text-muted-foreground tabular-nums">
            {content.length.toLocaleString()} chars
          </div>
        </div>

        {/* ── Submit ──────────────────────────────────────────────────────── */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || fileStatus === "reading"}
          size="lg"
          className="w-full rounded-xl bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-lift transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Summarizing…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate summary
            </>
          )}
        </Button>
      </div>

      {/* Feature chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: FileText, label: "Smart summary", desc: "Key points, distilled" },
          { icon: Sparkles, label: "Highlights & keywords", desc: "Spot what matters" },
          { icon: Upload, label: "Chat with notes", desc: "Ask anything" },
        ].map((f) => (
          <div
            key={f.label}
            className="rounded-xl border border-border bg-card/50 px-4 py-3 backdrop-blur-sm"
          >
            <f.icon className="h-4 w-4 text-primary mb-2" />
            <p className="text-sm font-semibold">{f.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
