export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm border border-line bg-white rounded-lg p-8 space-y-4"
      >
        <div>
          <h1 className="text-lg font-semibold text-ink">Kargo Hiring Dashboard</h1>
          <p className="text-sm text-ink/60 mt-1">Enter the dashboard password.</p>
        </div>
        <input type="hidden" name="next" value={searchParams.next || "/"} />
        <input
          type="password"
          name="password"
          autoFocus
          required
          placeholder="Password"
          className="w-full border border-line rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {searchParams.error && (
          <p className="text-sm text-bad">Wrong password. Try again.</p>
        )}
        <button
          type="submit"
          className="w-full bg-ink text-white rounded-md py-2 text-sm font-medium hover:opacity-90"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
