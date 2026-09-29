import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db";
import { INVITE_SCORE_CUTOFF, RubricRole, weightedTotal } from "@/lib/rubric";
import { EmailDraftPanel } from "@/components/EmailDraftPanel";
import { RetryButton } from "@/components/RetryButton";
import { JdMatchChip } from "@/components/JdMatchChip";

export const dynamic = "force-dynamic";

type Tab = "overview" | "rubric" | "questions" | "email";

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
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
  const validTabs: Tab[] = ["overview", "rubric", "questions", "email"];
  const tab: Tab = validTabs.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : "overview";

  const questionCount = candidate.brief?.questions.length ?? 0;

  return (
    <AppShell active="dashboard">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <Link href={`/?role=${appliedRole}`} className="text-sm text-primary hover:text-primary-hover font-medium">
            &larr; Back to {appliedRole} candidates
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {candidate.personalDetails?.name || "Unnamed candidate"}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {candidate.personalDetails?.email}
              {candidate.personalDetails?.phone ? ` · ${candidate.personalDetails.phone}` : ""}
            </p>
            <p className="text-xs text-muted/70 mt-1">
              Applied for {appliedRole} · {candidate.fileName}
            </p>
            <div className="mt-2">
              <JdMatchChip jdMatch={candidate.jdMatch} jdMatchReason={candidate.jdMatchReason} />
            </div>
          </div>
          {candidate.status === "SCORED" && (
            <div className="text-right flex-none">
              <div className="text-2xl font-semibold text-foreground tabular-nums">{appliedTotal}</div>
              <div
                className={`text-xs font-medium ${
                  appliedTotal >= INVITE_SCORE_CUTOFF ? "text-success" : "text-muted"
                }`}
              >
                {appliedTotal >= INVITE_SCORE_CUTOFF ? "Above the line" : "Below the line"}
              </div>
            </div>
          )}
        </div>

        {candidate.status === "PROCESSING" && (
          <div className="border border-border bg-surface rounded-xl p-4 text-sm text-warn shadow-card">
            Scoring in progress…
          </div>
        )}

        {candidate.status === "FAILED" && (
          <div className="border border-danger/20 bg-danger-soft rounded-xl p-4 space-y-2">
            <p className="text-sm text-danger">Scoring failed: {candidate.failReason}</p>
            <RetryButton candidateId={candidate.id} />
          </div>
        )}

        {candidate.status === "SCORED" && (
          <div className="border-b border-border flex gap-1">
            <TabLink id={candidate.id} tab="overview" active={tab === "overview"}>
              Overview
            </TabLink>
            <TabLink id={candidate.id} tab="rubric" active={tab === "rubric"}>
              Rubric
            </TabLink>
            <TabLink id={candidate.id} tab="questions" active={tab === "questions"}>
              Questions{questionCount > 0 ? ` (${questionCount})` : ""}
            </TabLink>
            <TabLink id={candidate.id} tab="email" active={tab === "email"}>
              Email
            </TabLink>
          </div>
        )}

        {candidate.status === "SCORED" && tab === "overview" && (
          <div className="space-y-6">
            {candidate.brief ? (
              <div className="border border-border rounded-xl bg-surface p-5 shadow-card">
                <h2 className="text-sm font-semibold text-foreground mb-2">Interview brief</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">{candidate.brief.content}</p>
              </div>
            ) : (
              <div className="border border-warn/20 bg-warn-soft rounded-xl p-4 space-y-2">
                <p className="text-sm text-warn">
                  Not in the current top ranking, or the brief/questions step hasn&apos;t generated yet.
                </p>
              </div>
            )}

            {!candidate.emailDraft && (
              <div className="border border-warn/20 bg-warn-soft rounded-xl p-4 space-y-2">
                <p className="text-sm text-warn">
                  The email draft hasn&apos;t generated yet (likely a transient AI error). The
                  scores are still good — see the Email tab to retry just that step.
                </p>
              </div>
            )}
          </div>
        )}

        {candidate.status === "SCORED" && tab === "rubric" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["PM", "SPM"] as RubricRole[]).map((role) => (
              <div key={role} className="border border-border rounded-xl bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">
                    {role} rubric {role === appliedRole && <span className="text-primary">(applied)</span>}
                  </h2>
                  <span className="text-sm font-medium text-foreground tabular-nums">
                    {Math.round(totals[role] * 10) / 10}/100
                  </span>
                </div>
                <ul className="space-y-4">
                  {byRole[role].map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground">{s.criterion.name}</span>
                        <span className="text-muted tabular-nums">{s.score}/3</span>
                      </div>
                      <div className="h-1 rounded-full bg-border overflow-hidden mb-1.5">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(s.score / 3) * 100}%` }}
                        />
                      </div>
                      <p className="text-muted text-xs">{s.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {candidate.status === "SCORED" && tab === "questions" && (
          <div className="border border-border rounded-xl bg-surface p-5 shadow-card">
            {questionCount > 0 ? (
              <ol className="space-y-3">
                {candidate.brief!.questions.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-none w-5 h-5 rounded-full bg-primary-soft text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/80 leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">
                No questions yet — generated only for candidates currently in the top ranking for
                their role.
              </p>
            )}
          </div>
        )}

        {candidate.status === "SCORED" && tab === "email" && (
          <div className="space-y-4">
            {!candidate.emailDraft && (
              <div className="border border-warn/20 bg-warn-soft rounded-xl p-4 space-y-2">
                <p className="text-sm text-warn">
                  Scoring finished, but the email draft didn&apos;t generate (likely a transient AI
                  error). The scores are still good.
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
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TabLink({
  id,
  tab,
  active,
  children,
}: {
  id: string;
  tab: Tab;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/candidates/${id}?tab=${tab}`}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
