import { z } from "zod";
import { PM_RUBRIC, SPM_RUBRIC, SCORING_SCALE, RubricCriterionDef } from "./rubric";
import { generateJson } from "./gemini";

const PM_NAMES = PM_RUBRIC.map((c) => c.name) as [string, ...string[]];
const SPM_NAMES = SPM_RUBRIC.map((c) => c.name) as [string, ...string[]];

const scoringResultSchema = z
  .object({
    PM: z.array(
      z.object({
        name: z.enum(PM_NAMES),
        score: z.number().int().min(0).max(3),
        reason: z.string(),
      })
    ),
    SPM: z.array(
      z.object({
        name: z.enum(SPM_NAMES),
        score: z.number().int().min(0).max(3),
        reason: z.string(),
      })
    ),
  })
  // Gemini is constrained to the enum of valid names above, but nothing
  // stops it from omitting or duplicating a criterion within that enum —
  // require exactly one entry per rubric criterion, so a mismatch fails
  // the whole call loudly (processCandidate marks it FAILED) instead of
  // silently producing a candidate scored on 4 criteria instead of 5.
  .refine((data) => new Set(data.PM.map((c) => c.name)).size === PM_NAMES.length, {
    message: `PM scores must include exactly one entry for each of: ${PM_NAMES.join(", ")}`,
  })
  .refine((data) => new Set(data.SPM.map((c) => c.name)).size === SPM_NAMES.length, {
    message: `SPM scores must include exactly one entry for each of: ${SPM_NAMES.join(", ")}`,
  });

export type ScoringResult = z.infer<typeof scoringResultSchema>;

/** Exported for testing — validates a (would-be) Gemini scoring response without calling the API. */
export function parseScoringResult(data: unknown): ScoringResult {
  return scoringResultSchema.parse(data);
}

const GEMINI_SCORING_SCHEMA = {
  type: "object",
  properties: {
    PM: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: PM_NAMES },
          score: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["name", "score", "reason"],
      },
    },
    SPM: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", enum: SPM_NAMES },
          score: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["name", "score", "reason"],
      },
    },
  },
  required: ["PM", "SPM"],
};

function formatRubric(label: string, rubric: RubricCriterionDef[]): string {
  return rubric
    .map(
      (c) =>
        `${c.order}) ${c.name} (weight ${c.weight}%)\n   Strong CV looks like: ${c.description}`
    )
    .join("\n\n");
}

/**
 * Scores a redacted CV body against BOTH the PM and SPM rubrics in a single
 * Gemini call. The CV text passed in must already have the candidate's
 * name/email/phone stripped out (see personalDetails.ts) — this function
 * never receives or needs personal identifiers.
 */
export async function scoreCandidate(cvBodyRedacted: string): Promise<ScoringResult> {
  const systemInstruction = `You are a hiring rubric scoring engine for Kargo, a logistics SaaS company. You score CVs strictly against the two rubrics given below, one for Product Manager (PM) and one for Senior Product Manager (SPM). Every candidate must be scored against BOTH rubrics regardless of which role they applied for.

${SCORING_SCALE}

Be strict and evidence-based. Do not reward vague claims. A reason must be one line and must cite what specifically is (or is not) in the CV. Never invent details not present in the CV. Return exactly one entry per criterion for both rubrics, using the exact criterion names given — no more, no fewer.

PRODUCT MANAGER RUBRIC
${formatRubric("PM", PM_RUBRIC)}

SENIOR PRODUCT MANAGER RUBRIC
${formatRubric("SPM", SPM_RUBRIC)}`;

  const prompt = `Score the following candidate CV against both rubrics. The candidate's name, email and phone have already been removed from this text — do not attempt to guess or reconstruct identity from it, just evaluate the content.

CV CONTENT:
"""
${cvBodyRedacted}
"""`;

  return generateJson({
    systemInstruction,
    prompt,
    responseSchema: GEMINI_SCORING_SCHEMA,
    parse: parseScoringResult,
  });
}
