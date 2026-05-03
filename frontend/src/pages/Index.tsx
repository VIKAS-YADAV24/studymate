import { useRef, useState } from "react";
import { MessageSquare, FileText, Edit3, Workflow, FileUp, Loader2 } from "lucide-react";
import { AppShell, type StudyState } from "@/components/AppShell";
import { UploadPanel } from "@/components/UploadPanel";
import { SummaryPanel } from "@/components/SummaryPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { FlowchartView } from "@/components/FlowchartView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Index = () => {
  return (
    <AppShell>
      {(state) => <NotesContent state={state} />}
    </AppShell>
  );
};

function NotesContent({ state }: { state: StudyState }) {
  const activeNote = state.notes.find((n) => n.id === state.activeId) ?? null;

  if (!activeNote) {
    return (
      <div className="h-full overflow-y-auto scrollbar-thin">
        <UploadPanel isLoading={state.isLoading} onSubmit={state.createNote} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <NoteTabs state={state} />
    </div>
  );
}

type Tab = "summary" | "flowchart" | "chat" | "source";

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const version = (pdfjsLib as any).version ?? "4.4.168";
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    const t = c.items.map((x: any) => ("str" in x ? x.str : "")).join(" ").replace(/\s{2,}/g, " ").trim();
    if (t) pages.push(t);
  }
  return pages.join("\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return result.value;
}

function NoteTabs({ state }: { state: StudyState }) {
  const activeNote = state.notes.find((n) => n.id === state.activeId)!;
  const [tab, setTab] = useState<Tab>("summary");
  const [title, setTitle] = useState(activeNote.title);
  const [content, setContent] = useState(activeNote.content);
  const [fileReading, setFileReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = title !== activeNote.title || content !== activeNote.content;
  const hasSummary = !!activeNote.summary;

  const handleSourceFile = async (file: File) => {
    const ACCEPTED = /\.(pdf|docx|txt|md|csv|json)$/i;
    if (!ACCEPTED.test(file.name)) {
      toast.error("Unsupported file type.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large — max 20 MB.");
      return;
    }
    setFileReading(true);
    try {
      let text = "";
      if (/\.pdf$/i.test(file.name)) { toast.info("Extracting PDF…"); text = await extractPdfText(file); }
      else if (/\.docx$/i.test(file.name)) { toast.info("Reading DOCX…"); text = await extractDocxText(file); }
      else text = await file.text();
      if (!text.trim()) { toast.error("No text found in file."); return; }
      setContent(text);
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast.success(`"${file.name}" loaded.`);
    } catch { toast.error("Failed to read file."); }
    finally { setFileReading(false); }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-3 md:p-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 min-h-0 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/60 p-1 max-w-2xl">
          <TabsTrigger value="summary" className="rounded-lg gap-1.5 text-xs md:text-sm">
            <FileText className="h-3.5 w-3.5" /> Summary
          </TabsTrigger>
          <TabsTrigger value="flowchart" disabled={!hasSummary} className="rounded-lg gap-1.5 text-xs md:text-sm">
            <Workflow className="h-3.5 w-3.5" /> Flowchart
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-lg gap-1.5 text-xs md:text-sm">
            <MessageSquare className="h-3.5 w-3.5" /> Chat
          </TabsTrigger>
          <TabsTrigger value="source" className="rounded-lg gap-1.5 text-xs md:text-sm">
            <Edit3 className="h-3.5 w-3.5" /> Source
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="flex-1 min-h-0 mt-4 overflow-y-auto scrollbar-thin">
          {activeNote.summary && (
            <SummaryPanel
              title={activeNote.title}
              summary={activeNote.summary}
              onRegenerate={state.regenerate}
              isRegenerating={state.isLoading}
            />
          )}
        </TabsContent>

        <TabsContent value="flowchart" className="flex-1 min-h-0 mt-4 overflow-y-auto scrollbar-thin">
          <FlowchartView note={activeNote} onSave={state.updateFlowchart} />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 min-h-0 mt-4">
          <ChatPanel
            messages={activeNote.messages}
            sourceContent={activeNote.content}
            onMessagesChange={state.updateMessages}
          />
        </TabsContent>

        <TabsContent value="source" className="flex-1 min-h-0 mt-4 overflow-y-auto scrollbar-thin">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3 max-w-3xl">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-base font-semibold outline-none border-b border-border pb-2 focus:border-primary"
            />

            {/* File upload row */}
            <div className="flex items-center gap-2">
              <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors ${fileReading ? "opacity-50 pointer-events-none" : "hover:border-primary hover:text-primary border-border"}`}>
                {fileReading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                {fileReading ? "Reading…" : "Replace with file (PDF, DOCX, TXT, MD)"}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSourceFile(f); e.target.value = ""; }}
                />
              </label>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[300px] resize-y bg-transparent text-sm leading-relaxed outline-none scrollbar-thin"
            />
            <Button
              disabled={!dirty || state.isLoading}
              onClick={() => state.resummarize(title.trim() || "Untitled note", content.trim())}
              className="w-full rounded-xl bg-gradient-hero text-primary-foreground"
            >
              {state.isLoading ? "Updating…" : "Save & re-summarize"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Index;
