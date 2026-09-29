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

  const scoredCount = ranked.filter((c) => c.status === "SCORED").length;
  const aboveLineCount = ranked.filter((c) => c.status === "SCORED" && c.total >= INVITE_SCORE_CUTOFF).length;
  const briefsCount = ranked.filter((c) => c.brief).length;

  return (
    <div>
      <Nav active="dashboard" />
      <main className="max-w-6xl mx-auto px-6 py-8">
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
          <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Rank</th>
                  <th className="text-left px-4 py-3 font-medium">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium">Score</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Brief</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => (
                  <tr key={c.id} className="border-t border-border hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3 text-muted tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {c.personalDetails?.name || "(processing)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "SCORED" ? (
                        <span className="font-medium text-foreground tabular-nums">{Math.round(c.total * 10) / 10}</span>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "SCORED" && (
                        <Badge tone={c.total >= INVITE_SCORE_CUTOFF ? "success" : "muted"}>
                          {c.total >= INVITE_SCORE_CUTOFF ? "Above the line" : "Below the line"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{c.brief ? "Ready" : "—"}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.emailDraft
                        ? c.emailDraft.status === "SENT"
                          ? <Badge tone="success">Sent</Badge>
                          : c.emailDraft.status === "SENDING"
                            ? <Badge tone="warn">Sending…</Badge>
                            : <Badge tone="primary">{c.emailDraft.kind === "INVITE" ? "Invite draft" : "Reject draft"}</Badge>
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

function Badge({ tone, children }: { tone: "success" | "warn" | "danger" | "primary" | "muted"; children: React.ReactNode }) {
  const styles: Record<typeof tone, string> = {
    success: "bg-success-soft text-success",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    primary: "bg-primary-soft text-primary",
    muted: "bg-surface-hover text-muted",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${styles[tone]}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PROCESSING") return <Badge tone="warn">Scoring…</Badge>;
  if (status === "FAILED") return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="muted">{status}</Badge>;
}
