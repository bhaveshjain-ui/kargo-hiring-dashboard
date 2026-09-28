import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { INVITE_SCORE_CUTOFF, RubricRole, weightedTotal } from "@/lib/rubric";
import { EmailDraftPanel } from "@/components/EmailDraftPanel";
import { RetryButton } from "@/components/RetryButton";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params }: { params: { id: string } }) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      personalDetails: true,
      brief: true,
      emailDraft: true,
      scores: { include: { criterion: true } },
    },
  });

  if (!candidate) notFound();

  const byRole: Record<RubricRole, typeof candidate.scores> = { PM: [], SPM: [] };
  for (const s of candidate.scores) {
    byRole[s.rubricRole as RubricRole].push(s);
  }
  const totals: Record<RubricRole, number> = { PM: 0, SPM: 0 };
  for (const role of ["PM", "SPM"] as RubricRole[]) {
    byRole[role].sort((a, b) => a.criterion.order - b.criterion.order);
    totals[role] = weightedTotal(byRole[role].map((s) => ({ score: s.score, weight: s.criterion.weight })));
  }

  const appliedRole = candidate.appliedRole as RubricRole;
  const appliedTotal = totals[appliedRole];

  return (
    <div>
      <Nav active="dashboard" />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href={`/?role=${appliedRole}`} className="text-sm text-accent hover:underline">
            &larr; Back to {appliedRole} candidates
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              {candidate.personalDetails?.name || "Unnamed candidate"}
            </h1>
            <p className="text-sm text-ink/60 mt-0.5">
              {candidate.personalDetails?.email}
              {candidate.personalDetails?.phone ? ` · ${candidate.personalDetails.phone}` : ""}
            </p>
            <p className="text-xs text-ink/40 mt-1">
              Applied for {appliedRole} · {candidate.fileName}
            </p>
          </div>
          {candidate.status === "SCORED" && (
            <div className="text-right">
              <div className="text-2xl font-semibold text-ink">{appliedTotal}</div>
              <div
                className={`text-xs font-medium ${
                  appliedTotal >= INVITE_SCORE_CUTOFF ? "text-good" : "text-ink/50"
                }`}
              >
                {appliedTotal >= INVITE_SCORE_CUTOFF ? "Above the line" : "Below the line"}
              </div>
            </div>
          )}
        </div>

        {candidate.status === "PROCESSING" && (
          <div className="border border-line bg-white rounded-lg p-4 text-sm text-warn">
            Scoring in progress…
          </div>
        )}

        {candidate.status === "FAILED" && (
          <div className="border border-bad/30 bg-bad/5 rounded-lg p-4 space-y-2">
            <p className="text-sm text-bad">Scoring failed: {candidate.failReason}</p>
            <RetryButton candidateId={candidate.id} />
          </div>
        )}

        {candidate.brief && (
          <div className="border border-line rounded-lg bg-white p-5">
            <h2 className="text-sm font-semibold text-ink mb-2">Interview brief</h2>
            <p className="text-sm text-ink/80 leading-relaxed">{candidate.brief.content}</p>
          </div>
        )}

        {candidate.status === "SCORED" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["PM", "SPM"] as RubricRole[]).map((role) => (
              <div key={role} className="border border-line rounded-lg bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-ink">
                    {role} rubric {role === appliedRole && <span className="text-accent">(applied)</span>}
                  </h2>
                  <span className="text-sm font-medium text-ink">
                    {Math.round(totals[role] * 10) / 10}/100
                  </span>
                </div>
                <ul className="space-y-3">
                  {byRole[role].map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink">{s.criterion.name}</span>
                        <span className="text-ink/60">{s.score}/3</span>
                      </div>
                      <p className="text-ink/60 text-xs mt-0.5">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {candidate.status === "SCORED" && !candidate.emailDraft && (
          <div className="border border-warn/30 bg-warn/5 rounded-lg p-4 space-y-2">
            <p className="text-sm text-warn">
              Scoring finished, but the email draft didn&apos;t generate (likely a transient AI
              error). The scores above are still good.
            </p>
            <RetryButton
              candidateId={candidate.id}
              endpoint="retry-email"
              label="Generate email draft"
              loadingLabel="Generating…"
            />
          </div>
        )}

        {candidate.emailDraft && (
          <EmailDraftPanel
            candidateId={candidate.id}
            initialSubject={candidate.emailDraft.subject}
            initialBody={candidate.emailDraft.body}
            kind={candidate.emailDraft.kind as "INVITE" | "REJECT"}
            status={candidate.emailDraft.status as "DRAFT" | "SENDING" | "SENT"}
          />
        )}
      </main>
    </div>
  );
}
