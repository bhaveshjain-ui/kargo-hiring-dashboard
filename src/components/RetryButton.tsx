"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryButton({
  candidateId,
  endpoint = "retry",
  label = "Retry scoring",
  loadingLabel = "Retrying…",
}: {
  candidateId: string;
  endpoint?: "retry" | "retry-email";
  label?: string;
  loadingLabel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={retry}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {loading ? loadingLabel : label}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
