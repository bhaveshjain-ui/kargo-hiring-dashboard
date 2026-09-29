import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CandidateTable, TableCandidate } from "@/components/CandidateTable";
import { prisma } from "@/lib/db";
import { INVITE_SCORE_CUTOFF, weightedTotal, rankByScore } from "@/lib/rubric";

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

  const ranked = rankByScore(
    candidates.map((c) => ({
      ...c,
      total: weightedTotal(c.scores.map((s) => ({ score: s.score, weight: s.criterion.weight }))),
    }))
  );

  const tableData: TableCandidate[] = ranked.map((c) => ({
    id: c.id,
    name: c.personalDetails?.name || "",
    total: c.total,
    status: c.status,
    jdMatch: c.jdMatch,
    jdMatchReason: c.jdMatchReason,
    briefReady: Boolean(c.brief),
    emailStatus: c.emailDraft?.status ?? null,
    emailKind: c.emailDraft?.kind ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  const scoredCount = ranked.filter((c) => c.status === "SCORED").length;
  const aboveLineCount = ranked.filter((c) => c.status === "SCORED" && c.total >= INVITE_SCORE_CUTOFF).length;
  const briefsCount = ranked.filter((c) => c.brief).length;

  return (
    <AppShell active="dashboard">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Candidates</h1>
            <p className="text-sm text-muted mt-0.5">Ranked by score against the rubric for the role applied to.</p>
          </div>
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            <RoleLink role="PM" active={role === "PM"} />
            <RoleLink role="SPM" active={role === "SPM"} />
          </div>
        </div>

        {ranked.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Candidates" value={ranked.length} />
            <StatCard label="Above the line" value={aboveLineCount} accent="success" />
            <StatCard label="Briefs ready" value={briefsCount} accent="primary" />
          </div>
        )}

        {ranked.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-sm text-muted bg-surface">
            No {role} candidates yet.{" "}
            <Link href="/upload" className="text-primary hover:text-primary-hover font-medium">
              Upload one
            </Link>
            .
          </div>
        ) : (
          <CandidateTable candidates={tableData} />
        )}
      </div>
    </AppShell>
  );
}

function RoleLink({ role, active }: { role: RoleTab; active: boolean }) {
  return (
    <Link
      href={`/?role=${role}`}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
    >
      {role}
    </Link>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "primary";
}) {
  return (
    <div className="border border-border rounded-xl bg-surface p-4 shadow-card">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-semibold mt-1 tabular-nums ${
          accent === "success" ? "text-success" : accent === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
