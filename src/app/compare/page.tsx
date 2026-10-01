import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db";
import { INVITE_SCORE_CUTOFF, RubricRole, weightedTotal } from "@/lib/rubric";
import { JdMatchChip } from "@/components/JdMatchChip";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { ids?: string };
}) {
  const ids = (searchParams.ids || "").split(",").filter(Boolean);

  if (ids.length < 2) {
    return (
      <AppShell active="dashboard">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-sm text-muted">
            Pick at least 2 candidates from the{" "}
            <Link href="/" className="text-primary hover:text-primary-hover font-medium">
              dashboard
            </Link>{" "}
            to compare them.
          </p>
        </div>
      </AppShell>
    );
  }

  const candidates = await prisma.candidate.findMany({
    where: { id: { in: ids } },
    include: {
      personalDetails: true,
      brief: true,
      scores: { include: { criterion: true } },
    },
  });

  // Preserve the order the founder selected them in, not DB order.
  const ordered = ids.map((id) => candidates.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  if (ordered.length < 2) {
    return (
      <AppShell active="dashboard">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <p className="text-sm text-danger">Couldn&apos;t find those candidates — they may have been removed.</p>
        </div>
      </AppShell>
    );
  }

  const appliedRole = ordered[0].appliedRole as RubricRole;
  const criteriaOrder = [...ordered[0].scores]
    .filter((s) => s.rubricRole === appliedRole)
    .sort((a, b) => a.criterion.order - b.criterion.order)
    .map((s) => s.criterion.name);

  const totals = ordered.map((c) =>
    weightedTotal(
      c.scores.filter((s) => s.rubricRole === c.appliedRole).map((s) => ({ score: s.score, weight: s.criterion.weight }))
    )
  );

  return (
    <AppShell active="dashboard">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="border-b border-border-strong pb-5">
          <Link href={`/?role=${appliedRole}`} className="text-sm text-primary hover:text-primary-hover font-medium">
            &larr; Back to {appliedRole} candidates
          </Link>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mt-2">
            Comparing {ordered.length} candidates
          </h1>
        </div>

        <div className="grid bg-border gap-px" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(220px, 1fr))` }}>
          {ordered.map((c, i) => (
            <div key={c.id} className="bg-surface p-4">
              <Link href={`/candidates/${c.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                {c.personalDetails?.name || "Unnamed"}
              </Link>
              <p className="text-xs text-muted mt-0.5">{c.personalDetails?.email}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-mono text-2xl font-semibold text-foreground tabular-nums">{totals[i]}</span>
                <span className={`text-[11px] tracking-label uppercase ${totals[i] >= INVITE_SCORE_CUTOFF ? "text-success" : "text-muted"}`}>
                  {totals[i] >= INVITE_SCORE_CUTOFF ? "Above" : "Below"}
                </span>
              </div>
              <div className="mt-2">
                <JdMatchChip jdMatch={c.jdMatch} jdMatchReason={c.jdMatchReason} compact />
              </div>
            </div>
          ))}
        </div>

        <div className="border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-strong text-muted text-[11px] tracking-label uppercase">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Criterion ({appliedRole} rubric)</th>
                {ordered.map((c) => (
                  <th key={c.id} className="text-left px-4 py-2.5 font-medium">
                    {c.personalDetails?.name?.split(/\s+/)[0] || "—"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteriaOrder.map((criterionName) => (
                <tr key={criterionName} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{criterionName}</td>
                  {ordered.map((c) => {
                    const s = c.scores.find((s) => s.rubricRole === c.appliedRole && s.criterion.name === criterionName);
                    return (
                      <td key={c.id} className="px-4 py-3">
                        {s ? (
                          <div>
                            <span className="font-mono font-medium text-foreground tabular-nums">{s.score}/3</span>
                            <p className="text-xs text-muted mt-0.5 max-w-xs">{s.reason}</p>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid bg-border gap-px" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(220px, 1fr))` }}>
          {ordered.map((c) => (
            <div key={c.id} className="bg-surface p-4">
              <h3 className="text-[11px] tracking-label uppercase text-muted mb-2">Brief</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {c.brief?.content || <span className="text-muted">Not generated (not in the current top ranking).</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
