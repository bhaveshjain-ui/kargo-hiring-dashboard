import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const json = await req.json();
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const draft = await prisma.emailDraft.findUnique({ where: { candidateId: params.id } });
  if (!draft) {
    return NextResponse.json({ error: "No draft exists for this candidate yet." }, { status: 404 });
  }
  if (draft.status !== "DRAFT") {
    return NextResponse.json(
      { error: "This email has already been sent (or is currently being sent)." },
      { status: 409 }
    );
  }

  await prisma.emailDraft.update({
    where: { candidateId: params.id },
    data: {
      subject: parsed.data.subject ?? undefined,
      body: parsed.data.body ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}
