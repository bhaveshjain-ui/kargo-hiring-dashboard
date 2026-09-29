import { Sidebar } from "./Sidebar";

export function AppShell({
  active,
  children,
}: {
  active: "dashboard" | "upload" | "settings";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar active={active} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
