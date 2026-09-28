"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
  | { kind: "pick" }
  | { kind: "parsing" }
  | {
      kind: "confirm";
      cvText: string;
      fileName: string;
      fileType: string;
      appliedRole: "PM" | "SPM";
      name: string;
      email: string;
      phone: string;
    }
  | { kind: "submitting" };

export function UploadForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [appliedRole, setAppliedRole] = useState<"PM" | "SPM">("PM");
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setError(null);
    setStep({ kind: "parsing" });

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/candidates/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that file.");

      setStep({
        kind: "confirm",
        cvText: data.cvText,
        fileName: data.fileName,
        fileType: data.fileType,
        appliedRole,
        name: data.detected.name,
        email: data.detected.email,
        phone: data.detected.phone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep({ kind: "pick" });
    }
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step.kind !== "confirm") return;

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    if (!name || !email) {
      setError("Name and email are required.");
      return;
    }

    setError(null);
    setStep({ kind: "submitting" });

    try {
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appliedRole: step.appliedRole,
          fileName: step.fileName,
          fileType: step.fileType,
          cvText: step.cvText,
          name,
          email,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save that candidate.");
      router.push(`/candidates/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep({ ...step });
    }
  }

  if (step.kind === "pick" || step.kind === "parsing") {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Role applied for</label>
          <select
            value={appliedRole}
            onChange={(e) => setAppliedRole(e.target.value as "PM" | "SPM")}
            className="border border-line rounded-md px-3 py-2 text-sm w-full bg-white"
          >
            <option value="PM">Product Manager</option>
            <option value="SPM">Senior Product Manager</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">CV file</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            disabled={step.kind === "parsing"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
            className="block w-full text-sm border border-line rounded-md px-3 py-2 bg-white file:mr-3 file:rounded file:border-0 file:bg-ink file:text-white file:px-3 file:py-1.5 file:text-sm"
          />
          <p className="text-xs text-ink/50 mt-1">PDF, DOCX, or TXT.</p>
        </div>

        {step.kind === "parsing" && (
          <p className="text-sm text-ink/60">Reading the CV…</p>
        )}
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    );
  }

  if (step.kind === "confirm") {
    return (
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="rounded-md border border-line bg-white p-4 text-sm text-ink/70">
          <p>
            We auto-detected these from <span className="font-medium">{step.fileName}</span>.
            Check them — anything here will be stripped out of the CV before it ever reaches
            the AI, so it needs to be right.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Full name</label>
          <input
            name="name"
            defaultValue={step.name}
            required
            className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Email</label>
          <input
            name="email"
            type="email"
            defaultValue={step.email}
            required
            className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">Phone (optional)</label>
          <input
            name="phone"
            defaultValue={step.phone}
            className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>

        {error && <p className="text-sm text-bad">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-ink text-white rounded-md px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Confirm and score
          </button>
          <button
            type="button"
            onClick={() => setStep({ kind: "pick" })}
            className="text-sm text-ink/60 px-4 py-2"
          >
            Start over
          </button>
        </div>
      </form>
    );
  }

  return <p className="text-sm text-ink/60">Scoring against the rubric — this can take a few seconds…</p>;
}
