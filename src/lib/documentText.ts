/**
 * DOCUMENT TEXT EXTRACTION
 * ========================
 * Client-side text extraction shared by Materials, AI Tutor and Ask Doubt.
 *
 * The PDF.js worker is bundled with the app. It used to be downloaded from a
 * public CDN at runtime, which broke PDF uploads on networks that block that
 * CDN (common on school and office networks) and whenever the CDN was slow.
 */

let workerReady: Promise<void> | null = null;

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerReady) {
    workerReady = import("pdfjs-dist/build/pdf.worker.min.mjs?url").then(({ default: workerSrc }) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    });
    // Allow a later attempt to retry if the chunk failed to load.
    workerReady.catch(() => { workerReady = null; });
  }
  await workerReady;
  return pdfjsLib;
}

export interface PdfText {
  /** Text of every readable page, prefixed with "--- Page N ---" markers. */
  text: string;
  totalPages: number;
}

async function readPdf(pdfjsLib: Awaited<ReturnType<typeof loadPdfJs>>, file: File): Promise<PdfText> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  try {
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText.length > 0) parts.push(`--- Page ${pageNum} ---\n${pageText}`);
      } catch (pageErr) {
        console.warn(`[PDF] Error on page ${pageNum}:`, pageErr);
      }
    }
    return { text: parts.join("\n\n"), totalPages: pdf.numPages };
  } finally {
    void pdf.destroy();
  }
}

/** Extract the selectable text of a PDF. Throws if the file cannot be opened. */
export async function extractPdfText(file: File): Promise<PdfText> {
  const pdfjsLib = await loadPdfJs();
  try {
    return await readPdf(pdfjsLib, file);
  } catch (err) {
    // If the bundled worker itself could not start (for example a host that
    // serves .mjs with the wrong content type), fall back to the CDN copy the
    // app used previously before giving up.
    if (!/worker/i.test(err instanceof Error ? err.message : String(err))) throw err;
    console.warn("[PDF] Bundled worker failed, retrying with CDN worker:", err);
    const response = await fetch(`https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`);
    if (!response.ok) throw err;
    const blobUrl = URL.createObjectURL(await response.blob());
    pdfjsLib.GlobalWorkerOptions.workerSrc = blobUrl;
    return await readPdf(pdfjsLib, file);
  }
}

export const isPdfFile = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);
export const isPlainTextFile = (file: File) => file.type === "text/plain" || /\.(txt|md)$/i.test(file.name);
