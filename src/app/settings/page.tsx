import { Nav } from "@/components/Nav";
import { prisma } from "@/lib/db";
import { JdEditor } from "@/components/JdEditor";
import { INVITE_SCORE_CUTOFF, TOP_N_BRIEFS_PER_ROLE } from "@/lib/rubric";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const jds = await prisma.jobDescription.findMany();
  const pm = jds.find((j) => j.role === "PM");
  const spm = jds.find((j) => j.role === "SPM");

  return (
    <div>
      <Nav active="settings" />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
          <p className="text-sm text-muted mt-1">
            Job descriptions are kept here for your own reference — the scoring
            rubric (Kargo_PM_SPM_Hiring_Rubric.txt) deliberately scores on
            patterns the JD doesn&apos;t ask for, so JD text isn&apos;t sent to the AI.
          </p>
        </div>

        <JdEditor role="PM" label="Product Manager JD" initialContent={pm?.content || ""} />
        <JdEditor role="SPM" label="Senior Product Manager JD" initialContent={spm?.content || ""} />

        <div className="border border-border rounded-xl bg-surface p-5 text-sm text-foreground/80 space-y-1 shadow-card">
          <h2 className="text-sm font-semibold text-foreground mb-2">Current scoring thresholds</h2>
          <p>Interview invite cutoff: score &ge; {INVITE_SCORE_CUTOFF}/100 on the applied-role rubric.</p>
          <p>Interview briefs generated for: top {TOP_N_BRIEFS_PER_ROLE} candidates per role.</p>
          <p className="text-xs text-muted pt-1">
            Edit these in src/lib/rubric.ts and redeploy to change them.
          </p>
        </div>
      </main>
    </div>
  );
}
