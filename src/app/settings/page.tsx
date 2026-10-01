import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/db";
import { JdEditor } from "@/components/JdEditor";
import { INVITE_SCORE_CUTOFF, TOP_N_BRIEFS_PER_ROLE } from "@/lib/rubric";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const jds = await prisma.jobDescription.findMany();
  const pm = jds.find((j) => j.role === "PM");
  const spm = jds.find((j) => j.role === "SPM");

  return (
    <AppShell active="settings">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="border-b border-border-strong pb-5">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">
            Job descriptions here are used for one thing: checking a CV against
            the JD&apos;s explicit hard requirements (years of experience, named
            must-haves), shown as a match/mismatch chip on each candidate. The
            rubric score itself is separate and never uses the JD — it
            deliberately scores on patterns the JD doesn&apos;t ask for (see
            Kargo_PM_SPM_Hiring_Rubric.txt). Leave a JD blank to skip that check
            for a role.
          </p>
        </div>

        <JdEditor role="PM" label="Product Manager JD" initialContent={pm?.content || ""} />
        <JdEditor role="SPM" label="Senior Product Manager JD" initialContent={spm?.content || ""} />

        <div className="border border-border bg-surface p-5 text-sm text-foreground/80 space-y-1">
          <h2 className="text-[11px] tracking-label uppercase text-muted mb-2">Current scoring thresholds</h2>
          <p>Interview invite cutoff: score &ge; {INVITE_SCORE_CUTOFF}/100 on the applied-role rubric.</p>
          <p>Interview briefs generated for: top {TOP_N_BRIEFS_PER_ROLE} candidates per role.</p>
          <p className="text-xs text-muted pt-1">
            Edit these in src/lib/rubric.ts and redeploy to change them.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
