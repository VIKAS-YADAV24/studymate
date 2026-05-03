import { AlertTriangle, CheckCircle2, Stethoscope, Activity, ArrowRight, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";
import type { MedicalReport, ReportValueStatus } from "@/lib/study-types";

interface MedicalReportViewProps {
  report: MedicalReport;
  onReset: () => void;
}

const STATUS_STYLE: Record<
  ReportValueStatus,
  { bg: string; border: string; text: string; chip: string; label: string }
> = {
  normal: {
    bg: "bg-success/10",
    border: "border-success/40",
    text: "text-success",
    chip: "bg-success/20 text-success",
    label: "Normal",
  },
  borderline: {
    bg: "bg-warning/15",
    border: "border-warning/50",
    text: "text-warning-foreground",
    chip: "bg-warning/30 text-warning-foreground",
    label: "Borderline",
  },
  abnormal: {
    bg: "bg-destructive/10",
    border: "border-destructive/40",
    text: "text-destructive",
    chip: "bg-destructive/20 text-destructive",
    label: "Abnormal",
  },
};

export const MedicalReportView = ({ report, onReset }: MedicalReportViewProps) => {
  const overview = `${report.reportType}. ${report.about}. Key findings: ${report.keyFindings.join(". ")}`;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 animate-fade-in-up">
      <div className="rounded-3xl border border-border bg-gradient-card shadow-lift p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Report interpretation
              </p>
              <h2 className="font-display text-xl md:text-2xl font-bold mt-0.5">{report.reportType}</h2>
              <p className="text-sm text-foreground/80 leading-relaxed mt-2">{report.about}</p>
            </div>
          </div>
          <SpeakButton text={overview} compact size="sm" />
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Key findings</h3>
          </div>
          <SpeakButton text={report.keyFindings.join(". ")} compact size="sm" />
        </div>
        <ul className="space-y-2">
          {report.keyFindings.map((f, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-soft text-[11px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/85 leading-relaxed">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      {report.values.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Test values</h3>
          </div>
          <ul className="space-y-3">
            {report.values.map((v, i) => {
              const s = STATUS_STYLE[v.status];
              return (
                <li
                  key={i}
                  className={cn("rounded-xl border-l-4 p-4", s.bg, s.border)}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{v.name}</p>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", s.chip)}>
                          {s.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        <span className="text-foreground">
                          Value: <span className={cn("font-semibold", s.text)}>{v.value}</span>
                        </span>
                        {v.referenceRange && (
                          <span className="text-muted-foreground">
                            Normal range: {v.referenceRange}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                        {v.plainExplanation}
                      </p>
                    </div>
                    <SpeakButton text={`${v.name}. Value ${v.value}. Status: ${s.label}. ${v.plainExplanation}`} compact size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {report.abnormalFlags.length > 0 && (
        <section className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h3 className="font-display text-base font-semibold text-destructive">Abnormal flags</h3>
          </div>
          <ul className="space-y-3">
            {report.abnormalFlags.map((f, i) => (
              <li key={i} className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-destructive">{f.label}</p>
                    <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{f.explanation}</p>
                  </div>
                  <SpeakButton text={`Abnormal flag: ${f.label}. ${f.explanation}`} compact size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.nextSteps.length > 0 && (
        <section className="rounded-2xl border border-accent/40 bg-accent/5 p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-accent" />
              <h3 className="font-display text-base font-semibold">What to do next</h3>
            </div>
            <SpeakButton text={`What to do next. ${report.nextSteps.join(". ")}`} compact size="sm" />
          </div>
          <ul className="space-y-2">
            {report.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span className="text-foreground/85 leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-foreground">Disclaimer:</strong> This is for informational purposes only.
        Consult a licensed doctor for medical advice.
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Interpret another report
        </button>
      </div>
    </div>
  );
};
