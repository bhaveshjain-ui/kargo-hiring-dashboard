import { z } from "zod";
import { generateJson } from "./gemini";
import { RubricRole } from "./rubric";

const questionsSchema = z.array(z.string()).min(3).max(4);

const GEMINI_QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 4,
    },
  },
  required: ["questions"],
};

interface QuestionsInput {
  appliedRole: RubricRole;
  cvBodyRedacted: string;
  topReasons: string[]; // grounding context, same as generateBrief
}

/**
 * Generates 3-4 interview questions grounded in this specific CV, for a
 * top-ranked candidate Arjun is about to interview. Never receives
 * personal identifiers — cvBodyRedacted has them stripped.
 */
export async function generateInterviewQuestions(input: QuestionsInput): Promise<string[]> {
  const roleLabel = input.appliedRole === "PM" ? "Product Manager" : "Senior Product Manager";

  const systemInstruction = `You write interview questions for Arjun, the founder of Kargo, to ask a ${roleLabel} candidate. Produce exactly 3 to 4 questions. Every question must be grounded in something specific from THIS candidate's CV — name the project, number, or claim it refers to. Do not ask generic questions that could apply to any candidate. At least one question must probe a claim in the CV that is vague, unverified, or missing a detail (e.g. no timeline, no company name, no mention of who else was involved). Return short, direct questions Arjun can ask out loud, not multi-part essay prompts.`;

  const prompt = `Role applied for: ${roleLabel}

Rubric context (what stood out in scoring, for grounding — do not just restate these):
${input.topReasons.join(" | ")}

CV CONTENT:
"""
${input.cvBodyRedacted}
"""

Return a JSON object with a "questions" array of 3-4 strings.`;

  const result = await generateJson({
    systemInstruction,
    prompt,
    responseSchema: GEMINI_QUESTIONS_SCHEMA,
    parse: (data) => {
      const obj = z.object({ questions: questionsSchema }).parse(data);
      return obj.questions;
    },
  });

  return result;
}
