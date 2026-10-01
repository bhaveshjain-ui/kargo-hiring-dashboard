import { describe, it, expect } from "vitest";
import { parseScoringResult } from "./scoring";
import { PM_RUBRIC, SPM_RUBRIC } from "./rubric";

function fullValidPayload() {
  return {
    PM: PM_RUBRIC.map((c) => ({ name: c.name, score: 2, reason: "Some evidence." })),
    SPM: SPM_RUBRIC.map((c) => ({ name: c.name, score: 1, reason: "Some evidence." })),
  };
}

describe("parseScoringResult", () => {
  it("accepts a complete, valid payload", () => {
    const result = parseScoringResult(fullValidPayload());
    expect(result.PM).toHaveLength(PM_RUBRIC.length);
    expect(result.SPM).toHaveLength(SPM_RUBRIC.length);
  });

  it("rejects a criterion name that isn't in the rubric", () => {
    const payload = fullValidPayload();
    payload.PM[0] = { name: "Made up criterion", score: 2, reason: "x" };
    expect(() => parseScoringResult(payload)).toThrow();
  });

  it("rejects a score outside 0-3", () => {
    const payload = fullValidPayload();
    payload.PM[0].score = 5;
    expect(() => parseScoringResult(payload)).toThrow();
  });

  /**
   * Regression test for a real bug: pipeline.ts used to silently `continue`
   * past any criterion Gemini returned that didn't match a known name,
   * which could store a candidate with 4 scored criteria instead of 5 with
   * no visible sign anything was wrong. Validation now constrains names to
   * an enum AND requires exactly one of each — a missing or duplicated
   * criterion fails the whole call loudly instead of silently understating
   * a score.
   */
  it("rejects a payload missing one of the five PM criteria", () => {
    const payload = fullValidPayload();
    payload.PM = payload.PM.slice(0, 4); // drop the 5th criterion
    expect(() => parseScoringResult(payload)).toThrow();
  });

  it("rejects a duplicated criterion even if the count is right", () => {
    const payload = fullValidPayload();
    payload.PM[4] = { ...payload.PM[0] }; // duplicate criterion 0, losing criterion 4
    expect(() => parseScoringResult(payload)).toThrow();
  });

  it("rejects a non-integer score", () => {
    const payload = fullValidPayload();
    // @ts-expect-error deliberately invalid for the test
    payload.SPM[0].score = 1.5;
    expect(() => parseScoringResult(payload)).toThrow();
  });
});
