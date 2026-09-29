export function JdMatchChip({
  jdMatch,
  jdMatchReason,
  compact,
}: {
  jdMatch: boolean | null;
  jdMatchReason: string | null;
  compact?: boolean;
}) {
  if (jdMatch === null) return null;

  if (jdMatch) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        {!compact && "Meets JD requirements"}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-start gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-warn-soft text-warn"
      title={jdMatchReason || undefined}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-none mt-0.5">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {compact ? "Below JD" : `Below JD requirement — ${jdMatchReason}`}
    </span>
  );
}
