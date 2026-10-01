import { AppShell } from "@/components/AppShell";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <AppShell active="upload">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="border-b border-border-strong pb-5 mb-6">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Upload CVs</h1>
          <p className="text-sm text-muted mt-1">
            Pick the role, drop in one or more CVs, then confirm each candidate&apos;s
            contact details. Those details are stored separately and are never
            sent to the AI — everything after this point works only from the CV
            text with them removed.
          </p>
        </div>
        <UploadForm />
      </div>
    </AppShell>
  );
}
