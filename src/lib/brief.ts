import { generateText } from "./gemini";
import { RubricRole } from "./rubric";

interface BriefInput {
  appliedRole: RubricRole;
  cvBodyRedacted: string;
  totalScore: number;
  topReasons: string[]; // the 2-3 highest-scoring criterion reasons, for grounding
}

/**
 * Generates a three-sentence interview brief for a top-ranked candidate.
 * Never receives personal identifiers — cvBodyRedacted has them stripped.
 */
export async function generateBrief(input: BriefInput): Promise<string> {
  const systemInstruction = `You write short interview briefs for a founder who has 45 minutes between meetings to review candidates. Write EXACTLY three sentences, plain text, no markdown, no greeting, no candidate name (refer to "the candidate" if needed, but prefer just describing them directly). Sentence 1: who they are professionally and their strongest piece of evidence from the CV. Sentence 2: why the scoring engine ranked them highly here, in concrete terms. Sentence 3: one specific thing to probe or verify in the interview, based on a gap or unverified claim in the CV.`;

  const prompt = `Role applied for: ${input.appliedRole}
Rubric score: ${input.totalScore}/100
Top-scoring reasons from the rubric: ${input.topReasons.join(" | ")}

CV CONTENT:
"""
${input.cvBodyRedacted}
"""

Write the three-sentence brief now.`;

  return generateText({ systemInstruction, prompt });
}
