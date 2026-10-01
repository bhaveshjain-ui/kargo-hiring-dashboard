"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INVITE_SCORE_CUTOFF } from "@/lib/rubric";
import { JdMatchChip } from "./JdMatchChip";

export interface TableCandidate {
  id: string;
  name: string;
  total: number;
  status: string;
  jdMatch: boolean | null;
  jdMatchReason: string | null;
  briefReady: boolean;
  emailStatus: string | null;
  emailKind: string | null;
  createdAt: string; // ISO
}

type SortKey = "rank" | "name" | "score";

export function CandidateTable({ candidates }: { candidates: TableCandidate[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  // Rank's natural order is ascending (1, 2, 3…) — matches the default
  // "name" behavior below on first click. Only "score" defaults to
  // descending (highest first), set explicitly in toggleSort.
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q ? candidates.filter((c) => c.name.toLowerCase().includes(q)) : candidates;

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "score") cmp = a.total - b.total;
      else cmp = candidates.indexOf(a) - candidates.indexOf(b); // original rank order
      return sortAsc ? cmp : -cmp;
    });

    return rows;
  }, [candidates, query, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCompare() {
    router.push(`/compare?ids=${Array.from(selected).join(",")}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates…"
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        {selected.size > 0 && (
          <span className="text-xs text-muted font-mono tabular-nums">{selected.size} SELECTED</span>
        )}
      </div>

      <div className="border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border-strong text-muted text-[11px] tracking-label uppercase">
            <tr>
              <th className="w-10 px-4 py-2.5"></th>
              <th className="text-left px-2 py-2.5 font-medium">
                <SortHeader label="Rank" active={sortKey === "rank"} asc={sortAsc} onClick={() => toggleSort("rank")} />
              </th>
              <th className="text-left px-4 py-2.5 font-medium">
                <SortHeader label="Candidate" active={sortKey === "name"} asc={sortAsc} onClick={() => toggleSort("name")} />
              </th>
              <th className="text-left px-4 py-2.5 font-medium">
                <SortHeader label="Score" active={sortKey === "score"} asc={sortAsc} onClick={() => toggleSort("score")} />
              </th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Brief</th>
              <th className="text-left px-4 py-2.5 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const rank = candidates.indexOf(c) + 1;
              const top = rank === 1;
              return (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors ${
                    top ? "bg-primary-soft/40" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelected(c.id)}
                      disabled={c.status !== "SCORED"}
                      className="border-border accent-[rgb(var(--primary))]"
                      aria-label={`Select ${c.name}`}
                    />
                  </td>
                  <td className={`px-2 py-2.5 font-mono tabular-nums ${top ? "text-primary font-semibold" : "text-muted"}`}>
                    {String(rank).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/candidates/${c.id}`} className="flex items-center gap-2.5 group">
                      <Avatar name={c.name} />
                      <div className="min-w-0">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {c.name || "(processing)"}
                        </div>
                        <JdMatchChip jdMatch={c.jdMatch} jdMatchReason={c.jdMatchReason} compact />
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {c.status === "SCORED" ? (
                      <span className={`font-mono tabular-nums ${top ? "text-base font-semibold text-foreground" : "text-foreground"}`}>
                        {Math.round(c.total * 10) / 10}
                      </span>
                    ) : (
                      <StatusTag status={c.status} />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {c.status === "SCORED" && (
                      <Tag tone={c.total >= INVITE_SCORE_CUTOFF ? "success" : "muted"}>
                        {c.total >= INVITE_SCORE_CUTOFF ? "Above" : "Below"}
                      </Tag>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted font-mono text-xs">{c.briefReady ? "READY" : "—"}</td>
                  <td className="px-4 py-2.5">
                    {c.emailStatus === "SENT" ? (
                      <Tag tone="success">Sent</Tag>
                    ) : c.emailStatus === "SENDING" ? (
                      <Tag tone="warn">Sending</Tag>
                    ) : c.emailStatus === "DRAFT" ? (
                      <Tag tone="primary">{c.emailKind === "INVITE" ? "Invite" : "Reject"}</Tag>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted text-sm">
                  No candidates match &quot;{query}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface border border-border-strong shadow-raised px-4 py-3 flex items-center gap-3 z-20">
          <span className="text-sm text-foreground font-mono tabular-nums">{selected.size} SELECTED</span>
          <button
            onClick={goCompare}
            className="text-sm px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors font-medium"
          >
            Compare
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function SortHeader({ label, active, asc, onClick }: { label: string; active: boolean; asc: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      {active && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={asc ? "" : "rotate-180"}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "?";
  return (
    <span className="flex-none w-7 h-7 bg-primary-soft text-primary text-[11px] font-mono font-semibold flex items-center justify-center">
      {initials}
    </span>
  );
}

/** Structural tag: text + border, no filled pill — reads as a status marker, not a decoration. */
function Tag({ tone, children }: { tone: "success" | "warn" | "danger" | "primary" | "muted"; children: React.ReactNode }) {
  const styles: Record<typeof tone, string> = {
    success: "border-success/40 text-success",
    warn: "border-warn/40 text-warn",
    danger: "border-danger/40 text-danger",
    primary: "border-primary/40 text-primary",
    muted: "border-border text-muted",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 border text-[11px] font-mono uppercase tracking-wide ${styles[tone]}`}>
      {children}
    </span>
  );
}

function StatusTag({ status }: { status: string }) {
  if (status === "PROCESSING") return <Tag tone="warn">Scoring</Tag>;
  if (status === "FAILED") return <Tag tone="danger">Failed</Tag>;
  return <Tag tone="muted">{status}</Tag>;
}
