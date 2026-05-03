import { toast } from "sonner";

export async function extractPdfText(file: File): Promise<string> {
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
    const t = c.items
      .map((x: any) => ("str" in x ? x.str : ""))
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (t) pages.push(t);
  }
  return pages.join("\n\n");
}

export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await (mammoth as any).extractRawText({ arrayBuffer });
  return result.value;
}

export const ACCEPTED_TYPES = /\.(pdf|docx|txt|md|csv|json)$/i;
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function extractFileText(file: File): Promise<string | null> {
  if (!ACCEPTED_TYPES.test(file.name)) {
    toast.error("Unsupported file type. Use PDF, DOCX, TXT, MD, CSV, or JSON.");
    return null;
  }
  if (file.size > MAX_FILE_SIZE) {
    toast.error("File too large — max 20 MB.");
    return null;
  }
  try {
    let text = "";
    if (/\.pdf$/i.test(file.name)) {
      toast.info("Extracting PDF…");
      text = await extractPdfText(file);
    } else if (/\.docx$/i.test(file.name)) {
      toast.info("Reading DOCX…");
      text = await extractDocxText(file);
    } else {
      text = await file.text();
    }
    if (!text.trim()) {
      toast.error("No text found in file.");
      return null;
    }
    return text;
  } catch {
    toast.error("Failed to read file.");
    return null;
  }
}
