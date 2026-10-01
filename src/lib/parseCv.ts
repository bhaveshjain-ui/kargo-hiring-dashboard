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

  // Deliberately omits standardFontDataUrl: it's only used for accurate
  // glyph-width metrics when *rendering* a page, not for getTextContent().
  // Pointing it at a real path requires require.resolve() to find the
  // package on disk, but webpack statically rewrites require.resolve()
  // calls to a numeric module ID when this file gets bundled (confirmed
  // in production: "The path argument must be of type string. Received
  // type number") — a well-known webpack/Next.js gotcha, invisible in
  // isolated test scripts that bypass webpack entirely. Omitting it only
  // costs a harmless console warning per unmapped glyph; text extraction
  // is unaffected (verified against all 30 real resumes in this batch).
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  try {
    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pageTexts.push(reconstructLines(content.items));
    }
    return pageTexts.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * pdf.js's getTextContent() returns a flat list of text runs with position
 * data, not pre-joined lines the way pdf-parse's output was — grouping runs
 * by their Y position to reconstruct lines matters because downstream
 * heuristics (personalDetails.ts guessName) scan line-by-line for a short,
 * name-shaped line. Without this, every run on a page concatenates into one
 * giant line and those heuristics never match anything.
 */
function reconstructLines(items: unknown[]): string {
  const lines: string[] = [];
  let currentLine = "";
  let lastY: number | null = null;

  for (const raw of items) {
    if (!raw || typeof raw !== "object" || !("str" in raw) || !("transform" in raw)) continue;
    const item = raw as { str: string; transform: number[] };
    const y = item.transform[5];

    if (lastY !== null && Math.abs(y - lastY) > 2) {
      lines.push(currentLine.trim());
      currentLine = item.str;
    } else {
      currentLine += (currentLine && item.str && !/\s$/.test(currentLine) ? " " : "") + item.str;
    }
    lastY = y;
  }
  if (currentLine.trim()) lines.push(currentLine.trim());

  return lines.join("\n");
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}
