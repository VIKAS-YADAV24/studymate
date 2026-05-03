import { useRef, useState } from "react";
import { toast } from "sonner";
import { Stethoscope, Upload, Loader2, FileText, Image as ImageIcon, Sparkles, FileUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { MedicalReportView } from "@/components/MedicalReportView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { MedicalReport } from "@/lib/study-types";
import { getUserApiKey } from "@/hooks/use-api-key";
import { extractFileText } from "@/lib/file-utils";

const MedicalReportPage = () => {
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<MedicalReport | null>(null);
  const [docFileReading, setDocFileReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  const handleDocFile = async (file: File) => {
    if (!file) return;
    setDocFileReading(true);
    try {
      const extracted = await extractFileText(file);
      if (extracted) {
        setText(extracted);
        toast.success(`"${file.name}" loaded into text.`);
      }
    } finally {
      setDocFileReading(false);
      if (docFileRef.current) docFileRef.current.value = "";
    }
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Please upload an image under 8 MB.");
      return;
    }
    if (file.type === "application/pdf") {
      toast.error("PDFs aren't supported directly yet — open the PDF and paste its text, or upload a screenshot image.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only images (PNG, JPG, WebP) are supported.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!text.trim() && !imageDataUrl) {
      toast.error("Paste report text or upload an image first.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("medical-report", {
        body: {
          text: text.trim() || undefined,
          imageDataUrl: imageDataUrl || undefined,
        },
        headers: getUserApiKey() ? { "x-user-api-key": getUserApiKey()! } : {},
      });
      if (error) {
        toast.error((data as { error?: string } | undefined)?.error || error.message || "Failed to interpret");
        return;
      }
      if ((data as { error?: string } | undefined)?.error) {
        toast.error((data as { error?: string }).error!);
        return;
      }
      setReport(data as MedicalReport);
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      {() => (
        <div className="h-full overflow-y-auto scrollbar-thin">
          <div className="px-4 py-8 md:py-12">
            {report ? (
              <MedicalReportView
                report={report}
                onReset={() => {
                  setReport(null);
                  setText("");
                  setImageDataUrl(null);
                  setImageName(null);
                }}
              />
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-6 animate-fade-in-up">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-medium text-primary">
                    <Stethoscope className="h-3.5 w-3.5" />
                    Medical Report Interpreter
                  </div>
                  <h1 className="mt-4 font-display text-3xl md:text-5xl font-bold tracking-tight">
                    Make sense of your <span className="gradient-text">medical report</span>
                  </h1>
                  <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
                    Paste raw text from a report or upload an image. We'll explain it in plain English and flag what's out of range.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-gradient-card shadow-lift p-5 md:p-6">
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1 mb-4">
                      <TabsTrigger value="text" className="rounded-lg gap-1.5 text-sm">
                        <FileText className="h-4 w-4" /> Paste text
                      </TabsTrigger>
                      <TabsTrigger value="image" className="rounded-lg gap-1.5 text-sm">
                        <ImageIcon className="h-4 w-4" /> Upload image
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="mt-0 space-y-3">
                      <div className="flex items-center gap-2">
                        <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors ${docFileReading ? "opacity-50 pointer-events-none" : "hover:border-primary hover:text-primary border-border"}`}>
                          {docFileReading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                          {docFileReading ? "Reading…" : "Upload PDF or DOCX"}
                          <input
                            ref={docFileRef}
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleDocFile(e.target.files[0])}
                          />
                        </label>
                        <span className="text-xs text-muted-foreground">or paste text below</span>
                      </div>
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste the contents of your medical report here. e.g. blood test results, lab panels, radiology notes…"
                        className="min-h-[220px] rounded-xl border-border bg-background/60 text-sm leading-relaxed resize-y scrollbar-thin"
                      />
                    </TabsContent>

                    <TabsContent value="image" className="mt-0 space-y-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-full rounded-xl border-2 border-dashed border-border bg-background/60 px-4 py-10 text-center hover:border-primary hover:bg-primary-soft/40 transition-colors"
                      >
                        <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-sm font-semibold">
                          {imageName ? imageName : "Click to upload a report image"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 8 MB · For PDFs, paste the text instead
                        </p>
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      />
                      {imageDataUrl && (
                        <img
                          src={imageDataUrl}
                          alt="Report preview"
                          className="max-h-64 rounded-xl border border-border mx-auto"
                        />
                      )}
                    </TabsContent>
                  </Tabs>

                  <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground max-w-md">
                      Your report stays in your browser. Only the contents are sent to the AI to generate the summary.
                    </p>
                    <Button
                      onClick={submit}
                      disabled={isLoading}
                      size="lg"
                      className="rounded-xl bg-gradient-hero text-primary-foreground shadow-glow"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Interpreting…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Interpret report
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Disclaimer:</strong> This is for informational purposes only. Consult a licensed doctor for medical advice.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default MedicalReportPage;
