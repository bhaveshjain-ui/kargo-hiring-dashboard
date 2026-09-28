import { z } from "zod";
import { generateJson } from "./gemini";
import { RubricRole } from "./rubric";

const draftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const GEMINI_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
  },
  required: ["subject", "body"],
};

export const NAME_PLACEHOLDER = "{{candidate_name}}";

interface DraftInput {
  kind: "INVITE" | "REJECT";
  appliedRole: RubricRole;
  cvBodyRedacted: string;
}

/**
 * Drafts a personalized email from CV content. The AI is instructed to use
 * the literal placeholder {{candidate_name}} wherever the candidate's name
 * would go — it is never given the real name. The caller substitutes the
 * real name (from PersonalDetails) into the returned body afterwards.
 */
export async function draftEmail(input: DraftInput): Promise<{ subject: string; body: string }> {
  const roleLabel = input.appliedRole === "PM" ? "Product Manager" : "Senior Product Manager";

  const systemInstruction =
    input.kind === "INVITE"
      ? `You draft warm, specific interview-invite emails for Arjun, the founder of Kargo, a logistics SaaS company. The email is from Arjun personally. Reference one or two concrete, specific things from the candidate's CV to show the invite isn't generic. Keep it short (under 150 words), friendly, and propose that the candidate reply with their availability for a call this week. Sign off as "Arjun". You do NOT know the candidate's real name — wherever you would greet them by name, use the exact literal placeholder ${NAME_PLACEHOLDER} (for example "Hi ${NAME_PLACEHOLDER},"). Never invent a name.`
      : `You draft warm, respectful rejection emails for Arjun, the founder of Kargo, a logistics SaaS company. The email is from Arjun personally. Thank the candidate genuinely, reference one specific, positive thing from their CV so it doesn't read as a form rejection, and be honest that Kargo is moving forward with other candidates for this role without being harsh. Keep it short (under 130 words), warm, and leave the door open for the future. Sign off as "Arjun". You do NOT know the candidate's real name — wherever you would greet them by name, use the exact literal placeholder ${NAME_PLACEHOLDER} (for example "Hi ${NAME_PLACEHOLDER},"). Never invent a name.`;

  const prompt = `Role applied for: ${roleLabel}

CV CONTENT:
"""
${input.cvBodyRedacted}
"""

Return a JSON object with "subject" and "body" for this email. The body should use ${NAME_PLACEHOLDER} exactly once at the greeting, use \\n\\n for paragraph breaks, and end with "Arjun" on its own line (no company sign-off block needed).`;

  return generateJson({
    systemInstruction,
    prompt,
    responseSchema: GEMINI_DRAFT_SCHEMA,
    parse: (data) => draftSchema.parse(data),
  });
}
