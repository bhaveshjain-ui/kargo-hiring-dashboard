import { NextRequest, NextResponse } from "next/server";
import { retryEmailAndBrief } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

// Retries just the email-draft/brief step for a candidate that already
// scored successfully but whose post-scoring step failed (see
// src/lib/pipeline.ts runEmailAndBriefStep) — avoids re-paying for scoring.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await retryEmailAndBrief(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Retry failed." },
      { status: 500 }
    );
  }
}
