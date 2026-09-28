import { NextRequest, NextResponse } from "next/server";
import { processCandidate } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await processCandidate(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Retry failed." },
      { status: 500 }
    );
  }
}
