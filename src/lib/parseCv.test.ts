import { describe, it, expect } from "vitest";
import { reconstructLines, extractCvText } from "./parseCv";

/** Builds a fake pdf.js TextContent item at a given Y position. */
function item(str: string, y: number) {
  return { str, transform: [1, 0, 0, 1, 0, y] };
}

describe("reconstructLines", () => {
  /**
   * Regression test for a real bug: pdf.js's getTextContent() returns a
   * flat list of positioned text runs, not pre-joined lines. The first
   * version of this code just space-joined every run on a page, which
   * collapsed an entire resume into one giant line — and broke name
   * detection on every single candidate, since personalDetails.ts scans
   * line-by-line for a short, name-shaped line. This groups runs by Y
   * position instead, matching the real line layout of the page.
   */
  it("starts a new line when the Y position changes", () => {
    const items = [item("Priya Krishnan", 700), item("Product Manager", 680), item("Mumbai", 660)];
    expect(reconstructLines(items)).toBe("Priya Krishnan\nProduct Manager\nMumbai");
  });

  it("joins runs on the same line with a single space", () => {
    const items = [item("Hello", 700), item("World", 700)];
    expect(reconstructLines(items)).toBe("Hello World");
  });

  it("doesn't double a space when a run already ends with whitespace", () => {
    const items = [item("Hello ", 700), item("World", 700)];
    expect(reconstructLines(items)).toBe("Hello World");
  });

  it("tolerates tiny sub-pixel Y jitter within what is visually one line", () => {
    const items = [item("Hello", 700), item("World", 701.5)];
    expect(reconstructLines(items)).toBe("Hello World");
  });

  it("ignores malformed items without throwing", () => {
    const items = [item("Real text", 700), { not: "a text item" }, null, item("More text", 680)];
    expect(reconstructLines(items as unknown[])).toBe("Real text\nMore text");
  });

  it("returns an empty string for no items", () => {
    expect(reconstructLines([])).toBe("");
  });
});

describe("extractCvText", () => {
  it("extracts plain text files directly", async () => {
    const text = await extractCvText(Buffer.from("Hello\nWorld"), "cv.txt", "text/plain");
    expect(text).toBe("Hello\nWorld");
  });

  it("rejects an unsupported file type", async () => {
    await expect(extractCvText(Buffer.from("data"), "cv.xyz", "application/octet-stream")).rejects.toThrow(
      /Unsupported file type/
    );
  });
});
