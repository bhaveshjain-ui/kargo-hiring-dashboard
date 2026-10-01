import { describe, it, expect } from "vitest";
import { weightedTotal, rankByScore } from "./rubric";

describe("weightedTotal", () => {
  it("returns 0 for no scores", () => {
    expect(weightedTotal([])).toBe(0);
  });

  it("computes score/3 * weight, summed, rounded to 1 decimal", () => {
    // 2/3 * 20 + 3/3 * 25 = 13.33... + 25 = 38.33... -> 38.3
    const total = weightedTotal([
      { score: 2, weight: 20 },
      { score: 3, weight: 25 },
    ]);
    expect(total).toBe(38.3);
  });

  it("gives 100 for a perfect score across weights summing to 100", () => {
    const total = weightedTotal([
      { score: 3, weight: 20 },
      { score: 3, weight: 20 },
      { score: 3, weight: 25 },
      { score: 3, weight: 15 },
      { score: 3, weight: 20 },
    ]);
    expect(total).toBe(100);
  });

  it("gives 0 when every criterion scores 0", () => {
    const total = weightedTotal([
      { score: 0, weight: 20 },
      { score: 0, weight: 80 },
    ]);
    expect(total).toBe(0);
  });
});

describe("rankByScore", () => {
  it("sorts by total descending", () => {
    const items = [
      { id: "a", total: 10, createdAt: new Date("2026-01-01") },
      { id: "b", total: 30, createdAt: new Date("2026-01-01") },
      { id: "c", total: 20, createdAt: new Date("2026-01-01") },
    ];
    expect(rankByScore(items).map((i) => i.id)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the input array", () => {
    const items = [
      { id: "a", total: 10, createdAt: new Date("2026-01-01") },
      { id: "b", total: 30, createdAt: new Date("2026-01-01") },
    ];
    const original = [...items];
    rankByScore(items);
    expect(items).toEqual(original);
  });

  /**
   * Regression test for a real bug: the dashboard's displayed rank and
   * refreshBriefsForRole's top-N cutoff used to break ties differently
   * (one relied on DB return order, the other on createdAt desc), so a
   * candidate could show as e.g. rank 5 on the dashboard while a
   * differently-tie-broken internal ranking excluded them from the top 5
   * that actually got a brief. rankByScore is now the one function both
   * call, with an explicit, deterministic tiebreak: earlier-created wins.
   */
  it("breaks ties by earlier createdAt first, regardless of input order", () => {
    const earlier = { id: "first", total: 50, createdAt: new Date("2026-01-01T00:00:00Z") };
    const later = { id: "second", total: 50, createdAt: new Date("2026-01-02T00:00:00Z") };

    expect(rankByScore([earlier, later]).map((i) => i.id)).toEqual(["first", "second"]);
    // Same result even if the input order is reversed — the tiebreak must
    // come from createdAt, not from whatever order the caller passed in.
    expect(rankByScore([later, earlier]).map((i) => i.id)).toEqual(["first", "second"]);
  });

  it("keeps ties stable among more than two equal scores", () => {
    const items = [
      { id: "x", total: 0, createdAt: new Date("2026-01-03") },
      { id: "y", total: 0, createdAt: new Date("2026-01-01") },
      { id: "z", total: 0, createdAt: new Date("2026-01-02") },
    ];
    expect(rankByScore(items).map((i) => i.id)).toEqual(["y", "z", "x"]);
  });
});
