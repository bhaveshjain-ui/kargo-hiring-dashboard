import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redactPersonalDetails } from "@/lib/personalDetails";
import { processCandidate } from "@/lib/pipeline";

export const runtime = "nodejs";
// Scoring + brief + email drafting can involve several Gemini calls; give
// this route more headroom than the default serverless timeout.
export const maxDuration = 60;

const bodySchema = z.object({
  appliedRole: z.enum(["PM", "SPM"]),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  cvText: z.string().min(20),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional().default(""),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { appliedRole, fileName, fileType, cvText, name, email, phone } = parsed.data;

  const cvBodyRedacted = redactPersonalDetails(cvText, { name, email, phone });

  const candidate = await prisma.candidate.create({
    data: {
      appliedRole,
      fileName,
      fileType,
      cvBodyRedacted,
      status: "PROCESSING",
      personalDetails: {
        create: { name, email, phone: phone || null },
      },
    },
  });

  // Awaited deliberately: on serverless (Vercel), work started after the
  // response is sent is not guaranteed to finish. processCandidate marks
  // the candidate FAILED (with a reason) rather than throwing past here,
  // so this always resolves.
  await processCandidate(candidate.id).catch((err) => {
    console.error(`Pipeline failed for candidate ${candidate.id}:`, err);
  });

  return NextResponse.json({ id: candidate.id });
}
