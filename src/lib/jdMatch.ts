import { z } from "zod";
import { generateJson } from "./gemini";
import { RubricRole } from "./rubric";

const matchSchema = z.object({
  matches: z.boolean(),
  reason: z.string(),
});

const GEMINI_MATCH_SCHEMA = {
  type: "object",
  properties: {
    matches: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["matches", "reason"],
};

export interface JdMatchResult {
  matches: boolean;
  reason: string;
}

/**
 * Checks a CV against the JD's explicit HARD requirements only (years of
 * experience, named must-have skills/domains) — deliberately separate from
 * rubric scoring, which ignores JD-fit by design (see
 * Kargo_PM_SPM_Hiring_Rubric.txt section 8). Never receives personal
 * identifiers — cvBodyRedacted has them stripped.
 */
export async function checkJdMatch(params: {
  appliedRole: RubricRole;
  cvBodyRedacted: string;
  jdContent: string;
}): Promise<JdMatchResult> {
  const systemInstruction = `You check whether a candidate's CV meets the explicit, hard requirements stated in a job description — things like "3+ years," "required: X," a named domain or tool. You do NOT evaluate culture fit, soft skills, seniority feel, or anything the JD doesn't explicitly state as required. If the JD doesn't clearly state a hard requirement the CV might be missing, default to matches: true. Give one short, specific reason (under 20 words) citing the actual numbers or claims from both the JD and the CV — e.g. "Required: 3+ years B2B SaaS. Candidate shows 1.5 years." Be conservative: only mark matches: false when a stated requirement is clearly and specifically unmet.`;

  const prompt = `Job description (this is the ONLY thing to check hard requirements against — ignore anything not explicitly stated here):
"""
${params.jdContent}
"""

CV CONTENT:
"""
${params.cvBodyRedacted}
"""

Return a JSON object with "matches" (boolean) and "reason" (one short sentence).`;

  return generateJson({
    systemInstruction,
    prompt,
    responseSchema: GEMINI_MATCH_SCHEMA,
    parse: (data) => matchSchema.parse(data),
  });
}
