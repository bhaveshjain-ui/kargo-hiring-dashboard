import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { Mark } from "./Mark";

type ActiveKey = "dashboard" | "upload" | "settings";

const items: { href: string; label: string; key: ActiveKey; icon: JSX.Element }[] = [
  {
    href: "/",
    label: "Dashboard",
    key: "dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload CV",
    key: "upload",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    ),
  },
];

export function Sidebar({ active }: { active: ActiveKey }) {
  return (
    <aside className="w-16 md:w-56 flex-none border-r border-border bg-surface flex flex-col h-screen sticky top-0">
      <div className="h-14 flex items-center gap-2.5 px-3 md:px-5 border-b border-border-strong">
        <Mark size={22} />
        <span className="hidden md:inline font-semibold text-foreground tracking-tight truncate text-[15px]">
          KARGO
        </span>
      </div>

      <nav className="flex-1 px-2 md:px-3 pt-5 pb-4">
        <p className="hidden md:block px-3 mb-2 text-[10px] font-medium text-muted tracking-label uppercase">
          Navigate
        </p>
        <div className="space-y-0.5">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 px-2.5 md:px-3 py-2 text-sm font-medium transition-colors justify-center md:justify-start ${
                active === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              {item.icon}
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="px-2 md:px-3 py-3 border-t border-border flex justify-center md:justify-start">
        <ThemeToggle />
      </div>
    </aside>
  );
}
