"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmailDraftPanel({
  candidateId,
  initialSubject,
  initialBody,
  kind,
  status,
}: {
  candidateId: string;
  initialSubject: string;
  initialBody: string;
  kind: "INVITE" | "REJECT";
  status: "DRAFT" | "SENDING" | "SENT";
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);

  const sent = status === "SENT";
  const locked = sent || status === "SENDING";

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setSavedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    if (!confirm("Send this email now? This cannot be undone.")) return;
    setSending(true);
    setError(null);
    try {
      await save();
      const res = await fetch(`/api/candidates/${candidateId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-line rounded-lg bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {kind === "INVITE" ? "Interview invite" : "Warm rejection"}
        </h2>
        {sent && <span className="text-xs font-medium text-good">Sent</span>}
        {status === "SENDING" && <span className="text-xs font-medium text-warn">Sending…</span>}
      </div>

      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={locked}
          className="w-full border border-line rounded-md px-3 py-2 text-sm disabled:bg-paper disabled:text-ink/50"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink/60 mb-1">Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={locked}
          rows={10}
          className="w-full border border-line rounded-md px-3 py-2 text-sm font-sans disabled:bg-paper disabled:text-ink/50"
        />
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}
      {savedOnce && !error && !locked && (
        <p className="text-xs text-ink/40">Saved.</p>
      )}

      {!locked && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={saving || sending}
            className="text-sm px-3 py-1.5 rounded-md border border-line hover:bg-paper disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="text-sm px-3 py-1.5 rounded-md bg-ink text-white hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      )}
    </div>
  );
}
