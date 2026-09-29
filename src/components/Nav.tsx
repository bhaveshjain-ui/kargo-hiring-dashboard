import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Nav({ active }: { active: "dashboard" | "upload" | "settings" }) {
  const items: { href: string; label: string; key: typeof active }[] = [
    { href: "/", label: "Dashboard", key: "dashboard" },
    { href: "/upload", label: "Upload CV", key: "upload" },
    { href: "/settings", label: "Settings", key: "settings" },
  ];

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <span className="w-2 h-2 rounded-sm bg-primary-foreground" />
          </span>
          <span className="font-semibold text-foreground tracking-tight">Kargo Hiring</span>
        </div>
        <div className="flex items-center gap-3">
          <nav className="flex gap-1">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="w-px h-5 bg-border" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
