import Link from "next/link";
import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { INVITE_SCORE_CUTOFF, weightedTotal } from "@/lib/rubric";

export const dynamic = "force-dynamic";

type RoleTab = "PM" | "SPM";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const role: RoleTab = searchParams.role === "SPM" ? "SPM" : "PM";

  const candidates = await prisma.candidate.findMany({
    where: { appliedRole: role },
    include: {
      personalDetails: true,
      brief: true,
      emailDraft: true,
      scores: { where: { rubricRole: role }, include: { criterion: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const ranked = candidates
    .map((c) => ({
      ...c,
      total: weightedTotal(c.scores.map((s) => ({ score: s.score, weight: s.criterion.weight }))),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <Nav active="dashboard" />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-ink">Candidates</h1>
          <div className="flex gap-1 bg-white border border-line rounded-md p-1">
            <RoleLink role="PM" active={role === "PM"} />
            <RoleLink role="SPM" active={role === "SPM"} />
          </div>
        </div>

        {ranked.length === 0 ? (
          <div className="border border-dashed border-line rounded-lg p-10 text-center text-sm text-ink/50">
            No {role} candidates yet.{" "}
            <Link href="/upload" className="text-accent underline">
              Upload one
            </Link>
            .
          </div>
        ) : (
          <div className="border border-line rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-paper text-ink/60 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Rank</th>
                  <th className="text-left px-4 py-2 font-medium">Candidate</th>
                  <th className="text-left px-4 py-2 font-medium">Score</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Brief</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr key={c.id} className="border-t border-line hover:bg-paper/60">
                    <td className="px-4 py-3 text-ink/50">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="font-medium text-ink hover:underline">
                        {c.personalDetails?.name || "(processing)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "SCORED" ? (
                        <span className="font-medium">{Math.round(c.total * 10) / 10}</span>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "SCORED" && (
                        <span
                          className={
                            c.total >= INVITE_SCORE_CUTOFF
                              ? "text-good font-medium"
                              : "text-ink/50"
                          }
                        >
                          {c.total >= INVITE_SCORE_CUTOFF ? "Above the line" : "Below the line"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink/60">{c.brief ? "Ready" : "—"}</td>
                    <td className="px-4 py-3 text-ink/60">
                      {c.emailDraft
                        ? c.emailDraft.status === "SENT"
                          ? "Sent"
                          : c.emailDraft.status === "SENDING"
                            ? "Sending…"
                            : `Draft (${c.emailDraft.kind === "INVITE" ? "invite" : "reject"})`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function RoleLink({ role, active }: { role: RoleTab; active: boolean }) {
  return (
    <Link
      href={`/?role=${role}`}
      className={`px-3 py-1.5 rounded text-sm font-medium ${
        active ? "bg-ink text-white" : "text-ink/70 hover:bg-line/60"
      }`}
    >
      {role}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PROCESSING") {
    return <span className="text-warn text-xs font-medium">Scoring…</span>;
  }
  if (status === "FAILED") {
    return <span className="text-bad text-xs font-medium">Failed</span>;
  }
  return <span className="text-ink/50 text-xs">{status}</span>;
}
