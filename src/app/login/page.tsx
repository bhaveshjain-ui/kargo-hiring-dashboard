import { ThemeToggle } from "@/components/ThemeToggle";
import { Mark } from "@/components/Mark";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm border border-border border-t-2 border-t-primary bg-surface p-8 space-y-5 shadow-card"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <Mark size={32} />
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">KARGO</h1>
            <p className="text-xs text-muted mt-1 tracking-label uppercase">Hiring Dashboard</p>
          </div>
        </div>
        <input type="hidden" name="next" value={searchParams.next || "/"} />
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Password"
          className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
        />
        {searchParams.error && (
          <p className="text-sm text-danger -mt-2">Wrong password. Try again.</p>
        )}
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2 text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
