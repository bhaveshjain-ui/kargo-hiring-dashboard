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
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return normalize(result.text);
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

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}
