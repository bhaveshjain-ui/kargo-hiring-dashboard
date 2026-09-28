import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const bodySchema = z.object({
  role: z.enum(["PM", "SPM"]),
  content: z.string(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  await prisma.jobDescription.upsert({
    where: { role: parsed.data.role },
    update: { content: parsed.data.content },
    create: { role: parsed.data.role, content: parsed.data.content },
  });

  return NextResponse.json({ ok: true });
}
