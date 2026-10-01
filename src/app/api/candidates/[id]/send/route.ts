import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resendClient, fromAddress, toAddress } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: { personalDetails: true, emailDraft: true },
  });

  if (!candidate || !candidate.personalDetails || !candidate.emailDraft) {
    return NextResponse.json({ error: "Nothing to send for this candidate yet." }, { status: 404 });
  }

  // Atomically claim the send: only succeeds if the draft is still DRAFT,
  // so a double-click or a duplicated request can't both pass this check
  // and send two copies of the email. Whoever loses the race gets a 409.
  const claim = await prisma.emailDraft.updateMany({
    where: { candidateId: params.id, status: "DRAFT" },
    data: { status: "SENDING" },
  });

  if (claim.count === 0) {
    return NextResponse.json(
      { error: "This email has already been sent (or is currently being sent)." },
      { status: 409 }
    );
  }

  try {
    const resend = resendClient();
    const result = await resend.emails.send({
      from: fromAddress(),
      to: toAddress(candidate.personalDetails.email),
      subject: candidate.emailDraft.subject,
      text: candidate.emailDraft.body,
    });

    if (result.error) {
      await prisma.emailDraft.update({ where: { candidateId: params.id }, data: { status: "DRAFT" } });
      return NextResponse.json({ error: result.error.message }, { status: 502 });
    }
  } catch (err) {
    await prisma.emailDraft.update({ where: { candidateId: params.id }, data: { status: "DRAFT" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send email." },
      { status: 502 }
    );
  }

  await prisma.emailDraft.update({
    where: { candidateId: params.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
