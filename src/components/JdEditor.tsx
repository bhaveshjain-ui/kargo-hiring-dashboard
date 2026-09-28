"use client";

import { useState } from "react";

export function JdEditor({
  role,
  label,
  initialContent,
}: {
  role: "PM" | "SPM";
  label: string;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Could not save.");
      setSavedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-line rounded-lg bg-white p-5 space-y-2">
      <h2 className="text-sm font-semibold text-ink">{label}</h2>
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSavedOnce(false);
        }}
        rows={8}
        className="w-full border border-line rounded-md px-3 py-2 text-sm font-sans"
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded-md border border-line hover:bg-paper disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {savedOnce && !error && <span className="text-xs text-ink/40">Saved.</span>}
      </div>
    </div>
  );
}
