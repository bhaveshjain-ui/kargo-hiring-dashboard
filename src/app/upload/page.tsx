import { Nav } from "@/components/Nav";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <div>
      <Nav active="upload" />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Upload a CV</h1>
        <p className="text-sm text-muted mt-1 mb-6">
          Pick the role, upload the CV, then confirm the candidate&apos;s contact
          details we auto-detected. Those details are stored separately and are
          never sent to the AI — everything after this point works only from
          the CV text with them removed.
        </p>
        <UploadForm />
      </main>
    </div>
  );
}
