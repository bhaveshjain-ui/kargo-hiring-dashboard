import path from "path";
import { pathToFileURL } from "url";

/**
 * Extracts raw text from an uploaded CV file. Supports PDF, DOCX, and plain
 * text/markdown. This is the ONLY place file bytes are touched — everything
 * downstream works with the extracted string.
 */
export async function extractCvText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    return normalize(await extractPdfText(buffer));
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return normalize(result.value);
  }

  if (lower.endsWith(".txt") || lower.endsWith(".md") || mimeType.startsWith("text/")) {
    return normalize(buffer.toString("utf-8"));
  }

  throw new Error(
    `Unsupported file type "${mimeType || lower}". Please upload a PDF, DOCX, or TXT file.`
  );
}

/**
 * Uses pdfjs-dist directly rather than the `pdf-parse` package. `pdf-parse`
 * bundles a years-old, frozen pdf.js build with no cross-reference-table
 * recovery, so it hard-fails ("bad XRef entry") on otherwise-valid PDFs
 * from some generators (e.g. ReportLab) whose xref table isn't in the
 * exact format that old build expects. Current pdfjs-dist recovers from
 * this automatically by rescanning the file for objects.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const standardFontDataUrl = pathToFileURL(
    path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/"
  ).href;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  try {
    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pageTexts.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ")
      );
    }
    return pageTexts.join("\n");
  } finally {
    await loadingTask.destroy();
  }
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}
