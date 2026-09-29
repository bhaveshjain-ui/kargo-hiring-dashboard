import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

type ActiveKey = "dashboard" | "upload" | "settings";

const items: { href: string; label: string; key: ActiveKey; icon: JSX.Element }[] = [
  {
    href: "/",
    label: "Dashboard",
    key: "dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload CV",
    key: "upload",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    key: "settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export function Sidebar({ active }: { active: ActiveKey }) {
  return (
    <aside className="w-16 md:w-56 flex-none border-r border-border bg-surface flex flex-col h-screen sticky top-0">
      <div className="h-14 flex items-center gap-2.5 px-3 md:px-5 border-b border-border">
        <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-none">
          <span className="w-2 h-2 rounded-sm bg-primary-foreground" />
        </span>
        <span className="hidden md:inline font-semibold text-foreground tracking-tight truncate">
          Kargo Hiring
        </span>
      </div>

      <nav className="flex-1 px-2 md:px-3 py-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            title={item.label}
            className={`flex items-center gap-3 px-2.5 md:px-3 py-2 rounded-md text-sm font-medium transition-colors justify-center md:justify-start ${
              active === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-2 md:px-3 py-3 border-t border-border flex justify-center md:justify-start">
        <ThemeToggle />
      </div>
    </aside>
  );
}
