# Kargo Hiring Dashboard

Internal tool for Arjun to go from "CV uploaded" to "offer/reject sent" without
re-reading anything from scratch. Built for one user, gated by a single shared
password — no accounts, no roles.

## How it works

1. Arjun uploads a CV and picks the role (PM or SPM) at [/upload](src/app/upload/page.tsx).
2. He confirms the auto-detected name/email/phone. **Those are the only things
   that never reach the AI** — once confirmed, they're stripped out of the CV
   text (`src/lib/personalDetails.ts`) and stored separately
   (`PersonalDetails` table). Every AI call from this point on only ever sees
   the redacted CV body.
3. The candidate is scored against **both** the PM and SPM rubrics in one
   Gemini call (`src/lib/scoring.ts`), regardless of which role they applied
   for, per `Kargo_PM_SPM_Hiring_Rubric.txt`.
4. If they land in the top 5 (`TOP_N_BRIEFS_PER_ROLE`) for the role they
   applied to, a three-sentence interview brief is generated
   (`src/lib/brief.ts`).
5. An email is always drafted (`src/lib/emailDraft.ts`) — an interview invite
   if their score on the applied-role rubric is ≥60 (`INVITE_SCORE_CUTOFF`),
   otherwise a warm rejection. The AI drafts around a `{{candidate_name}}`
   placeholder; the real name is substituted in afterwards in plain code, so
   the model never sees it.
6. Arjun opens the [dashboard](src/app/page.tsx), sees everyone ranked by
   score per role, reads the brief + draft, edits if he wants, and clicks
   **Send** — which is the only thing that actually emails anyone, via
   Resend.

Both scoring cutoffs live in [`src/lib/rubric.ts`](src/lib/rubric.ts)
(`INVITE_SCORE_CUTOFF`, `TOP_N_BRIEFS_PER_ROLE`) — edit and redeploy to
change them.

## Stack

- **Next.js 14** (App Router, TypeScript) — one deployable app, UI + API routes.
- **Postgres** via [Neon](https://neon.tech) (free tier) + **Prisma** — chosen
  because Vercel has no persistent disk, so SQLite wasn't an option once this
  gets deployed. Any Postgres works (Supabase, RDS, etc.) — just change
  `DATABASE_URL`.
- **Gemini** (`@google/genai`) — scoring, briefs, and email drafts. Model is
  configurable via `GEMINI_MODEL` (defaults to `gemini-3.8-flash`). Supports
  multiple API keys via `GEMINI_API_KEYS` (comma-separated) — if one is
  dead, rate-limited, or out of quota, `src/lib/gemini.ts` automatically
  retries the next one.
- **Resend** — the only thing that sends real email, and only when Arjun
  clicks Send.
- **Tailwind** — minimal, functional styling only.

## Local setup

```bash
npm install
cp .env.example .env   # fill in the real values, see below
npm run db:push        # creates tables in your Postgres database
npm run db:seed        # loads the rubric criteria + empty JD placeholders
npm run dev
```

Open http://localhost:3000 — it'll ask for `DASHBOARD_PASSWORD` from your `.env`.

### Environment variables

See [`.env.example`](.env.example) for the full list with comments:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Create a free Postgres project at [neon.tech](https://neon.tech), copy the connection string |
| `GEMINI_API_KEYS` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — comma-separated, one or more |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | Must be a sender verified on your Resend account/domain |
| `DASHBOARD_PASSWORD` | Anything — this is the only auth this app has |

## Deploying (Vercel)

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same environment variables as above in the Vercel project settings.
4. Deploy. Then run the schema push + seed once against your production
   database (either locally with `DATABASE_URL` pointed at prod, or via
   `vercel env pull` first):
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. Visit the deployed URL, log in with `DASHBOARD_PASSWORD`.

(Netlify works too — it's a standard Next.js app — but Vercel is the path of
least resistance for the App Router + serverless functions used here.)

## Testing

```bash
npm test          # unit tests (vitest) — pure logic: rubric ranking/scoring,
                   # PII redaction, zod validation of Gemini's output, the
                   # pipeline's email-draft guard rails
npm run build      # production build + type-check
npm run test:smoke # boots the REAL production server and uploads a real PDF
                    # through the actual /api/candidates/parse route
```

The unit suite (`src/**/*.test.ts`) covers logic bugs hit during development —
each test file has a comment on the specific regression it guards against,
e.g. `rankByScore`'s tie-break stability, `draftEmailForCandidate` never
overwriting an already-sent draft, or `parseScoringResult` rejecting a
response missing a criterion. These run directly in Node via Vitest, which
is fast but has a blind spot: webpack-bundling bugs. `src/lib/parseCv.ts`
once used `require.resolve()` to locate a font-data path — this worked fine
under `vitest` (which imports the function directly, bypassing webpack) but
broke in the real deployed app, where Next.js's bundler rewrites
`require.resolve()` calls to a numeric module ID at build time. Unit tests
and `next build`'s type-check both stayed green while that bug was live in
production.

`npm run test:smoke` (`scripts/smoke-test.mjs`) exists to catch that class of
bug: it runs `next start` for real and uploads
[`test-fixtures/sample-resume.pdf`](test-fixtures/sample-resume.pdf) through
the actual API route, asserting the response has the right detected
name/email and multi-line extracted text. It needs `npm run build` to have
been run first, and only needs `DASHBOARD_PASSWORD` set (the route it hits
never touches the database or calls Gemini).

All three are wired into [CI](.github/workflows/ci.yml) on every push and PR
to `master`.

## What's deliberately NOT built

- **No hard-requirements pre-check against the JD.** The rubric
  (`Kargo_PM_SPM_Hiring_Rubric.txt`, section 8) is explicit that it only
  measures two patterns and deliberately leaves out things the JD already
  covers. Job descriptions are stored and editable at `/settings` for
  Arjun's own reference, but they're not fed into scoring — wiring that in
  would mean guessing a matching logic the rubric never specified.
- **No multi-user auth, roles, or audit log.** One founder, one password.
- **No re-scoring on JD or rubric edits.** Changing `src/lib/rubric.ts` only
  affects candidates scored after the change; existing scores aren't
  retroactively recalculated.
- **No lock against re-processing the same candidate twice concurrently**
  (e.g. clicking Retry in two open tabs while the first run is still in
  flight). Both runs would independently call Gemini and the last write
  wins. Sending an email *is* guarded against double-sends
  (`EmailDraft.status` is claimed atomically before Resend is called, see
  `src/app/api/candidates/[id]/send/route.ts`) since that has a real-world
  consequence; re-scoring racing itself just wastes an API call for a
  single founder clicking twice, so it wasn't worth the added complexity.
