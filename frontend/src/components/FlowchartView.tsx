import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { toast } from "sonner";
import {
  Sparkles, RefreshCw, Download, Copy, ZoomIn, ZoomOut, Workflow,
  Loader2, ExternalLink, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Note } from "@/lib/study-types";
import { getUserApiKey } from "@/hooks/use-api-key";

interface FlowchartViewProps {
  note: Note;
  onSave: (code: string | undefined) => void;
}

const initMermaid = () => {
  const isDark = document.documentElement.classList.contains("dark");
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? "dark" : "default",
    securityLevel: "loose",
    flowchart: { curve: "basis", padding: 20 },
    themeVariables: {
      primaryColor: "#6366f1",
      primaryTextColor: "#fff",
      primaryBorderColor: "#4f46e5",
      lineColor: "#94a3b8",
      secondaryColor: "#f1f5f9",
      tertiaryColor: "#e0e7ff",
    },
  });
};

export const FlowchartView = ({ note, onSave }: FlowchartViewProps) => {
  const [code, setCode] = useState<string | undefined>(note.flowchartCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const renderIdRef = useRef(0);

  // Re-init mermaid when theme changes (observe class on <html>)
  useEffect(() => {
    initMermaid();
    const obs = new MutationObserver(() => {
      initMermaid();
      // Force a re-render of current diagram
      if (code) renderDiagram(code);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync incoming note change (switching notes)
  useEffect(() => {
    setCode(note.flowchartCode);
    setError(null);
    setSvg("");
    if (note.flowchartCode) renderDiagram(note.flowchartCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const renderDiagram = async (mermaidCode: string) => {
    setError(null);
    try {
      renderIdRef.current += 1;
      const id = `mermaid-${note.id}-${renderIdRef.current}-${Date.now()}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      setSvg(svg);
    } catch (e) {
      console.error("Mermaid render error:", e, "\nRaw code:\n", mermaidCode);
      setError("Couldn't render diagram — try regenerating.");
      setSvg("");
    }
  };

  const generate = async () => {
    if (!note.summary) {
      toast.error("Generate a summary first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flowchart", {
        body: {
          content: note.summary.summary,
          keyPoints: note.summary.keyPoints,
          title: note.title,
        },
        headers: getUserApiKey() ? { "x-user-api-key": getUserApiKey()! } : {},
      });
      if (error) {
        toast.error((data as { error?: string } | undefined)?.error || error.message || "Failed to generate flowchart");
        return;
      }
      const payload = data as { mermaidCode?: string; error?: string };
      if (payload?.error) {
        toast.error(payload.error);
        return;
      }
      const newCode = payload?.mermaidCode?.trim();
      if (!newCode) {
        toast.error("AI didn't return a diagram.");
        return;
      }
      setCode(newCode);
      onSave(newCode);
      await renderDiagram(newCode);
      toast.success("Flowchart ready!");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(note.title || "flowchart").replace(/[^a-z0-9]+/gi, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Mermaid code copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  // mermaid.live edit URL — base64 (URL-safe) JSON in hash
  const mermaidLiveUrl = (() => {
    if (!code) return "https://mermaid.live/edit";
    try {
      const payload = { code, mermaid: { theme: "default" }, autoSync: true, updateDiagram: true };
      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `https://mermaid.live/edit#base64:${b64}`;
    } catch {
      return "https://mermaid.live/edit";
    }
  })();

  // ─── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft animate-fade-in-up">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-5">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Building your diagram…
        </div>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-44 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="flex justify-center">
            <div className="h-6 w-px bg-border" />
          </div>
          <div className="flex justify-center gap-6">
            <div className="h-12 w-36 rounded-xl bg-muted animate-pulse" />
            <div className="h-12 w-36 rounded-xl bg-muted animate-pulse" />
            <div className="h-12 w-36 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="flex justify-center">
            <div className="h-6 w-px bg-border" />
          </div>
          <div className="flex justify-center gap-4">
            <div className="h-12 w-40 rounded-xl bg-muted animate-pulse" />
            <div className="h-12 w-40 rounded-xl bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────
  if (!code) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-card p-8 shadow-soft animate-fade-in-up">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Workflow className="h-7 w-7" />
          </div>
          <h3 className="font-display text-xl font-bold">Visualize this topic as a diagram</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Turn your summary into an interactive flowchart that shows how concepts connect.
          </p>
          <Button
            onClick={generate}
            disabled={!note.summary}
            size="lg"
            className="mt-6 rounded-xl bg-gradient-hero text-primary-foreground shadow-glow hover:shadow-lift transition-all"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Flowchart
          </Button>
          {!note.summary && (
            <p className="mt-3 text-xs text-muted-foreground">Generate a summary first to enable this.</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Generated state (with possible render error) ────────
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-soft">
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={generate} className="rounded-lg" disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={downloadSvg} disabled={!svg} className="rounded-lg">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download SVG
          </Button>
          <Button variant="outline" size="sm" onClick={copyCode} className="rounded-lg">
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy Mermaid Code
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-auto scrollbar-thin">
        {error ? (
          <div className="p-10 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm font-semibold">{error}</p>
            <Button onClick={generate} size="sm" variant="outline" className="mt-4 rounded-lg">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        ) : (
          <div className="min-w-fit p-6 flex justify-center">
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s" }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        )}
      </div>

      <a
        href={mermaidLiveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary hover:border-primary transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        Mermaid diagram · Edit in mermaid.live
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};
