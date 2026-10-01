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

  const aboveLineCount = ranked.filter((c) => c.status === "SCORED" && c.total >= INVITE_SCORE_CUTOFF).length;
  const briefsCount = ranked.filter((c) => c.brief).length;

  return (
    <AppShell active="dashboard">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-6 mb-6">
          <div>
            <p className="text-[11px] tracking-label uppercase text-muted mb-1">
              Candidates · {role === "PM" ? "Product Manager" : "Senior Product Manager"}
            </p>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Ranking</h1>
          </div>
          <div className="flex gap-1 bg-surface border border-border p-1">
            <RoleLink role="PM" active={role === "PM"} />
            <RoleLink role="SPM" active={role === "SPM"} />
          </div>
        </div>

        {ranked.length > 0 && (
          <div className="flex border-y border-border-strong mb-8">
            <Stat label="Candidates" value={ranked.length} />
            <Stat label="Above the line" value={aboveLineCount} accent="success" />
            <Stat label="Briefs ready" value={briefsCount} accent="primary" />
          </div>
        )}

        {ranked.length === 0 ? (
          <div className="border border-dashed border-border p-12 text-center text-sm text-muted bg-surface">
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
      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground hover:bg-surface-hover"
      }`}
    >
      {role}
    </Link>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "primary";
}) {
  return (
    <div className="flex-1 border-r border-border last:border-r-0 px-5 py-4 first:pl-0">
      <p className="text-[11px] tracking-label uppercase text-muted mb-1.5">{label}</p>
      <p
        className={`font-mono text-4xl font-medium tabular-nums leading-none ${
          accent === "success" ? "text-success" : accent === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
