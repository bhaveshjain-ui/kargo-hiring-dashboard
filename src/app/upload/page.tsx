import { AppShell } from "@/components/AppShell";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <AppShell active="upload">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Upload CVs</h1>
        <p className="text-sm text-muted mt-1 mb-6">
          Pick the role, drop in one or more CVs, then confirm each candidate&apos;s
          contact details. Those details are stored separately and are never
          sent to the AI — everything after this point works only from the CV
          text with them removed.
        </p>
        <UploadForm />
      </div>
    </AppShell>
  );
}
