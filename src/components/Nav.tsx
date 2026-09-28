import Link from "next/link";

export function Nav({ active }: { active: "dashboard" | "upload" | "settings" }) {
  const items: { href: string; label: string; key: typeof active }[] = [
    { href: "/", label: "Dashboard", key: "dashboard" },
    { href: "/upload", label: "Upload CV", key: "upload" },
    { href: "/settings", label: "Settings", key: "settings" },
  ];

  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="font-semibold text-ink">Kargo Hiring</div>
        <nav className="flex gap-1">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                active === item.key
                  ? "bg-ink text-white"
                  : "text-ink/70 hover:bg-line/60"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
