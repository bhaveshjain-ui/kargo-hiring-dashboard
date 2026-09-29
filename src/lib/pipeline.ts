import { prisma } from "./db";
import { scoreCandidate } from "./scoring";
import { generateBrief } from "./brief";
import { generateInterviewQuestions } from "./interviewQuestions";
import { draftEmail, NAME_PLACEHOLDER } from "./emailDraft";
import {
  INVITE_SCORE_CUTOFF,
  TOP_N_BRIEFS_PER_ROLE,
  RubricRole,
  RUBRICS,
  weightedTotal,
} from "./rubric";

/**
 * Runs the full pipeline for a freshly-uploaded (or retried) candidate:
 * score against both rubrics, then draft the email and refresh interview
 * briefs for their applied role.
 *
 * These are two separate phases with separate error handling on purpose.
 * If scoring itself fails, the candidate is marked FAILED (nothing useful
 * was produced). If scoring succeeds but the email/brief step fails
 * afterwards (e.g. a transient Gemini error), the candidate stays SCORED —
 * the committed scores are real and shouldn't be hidden behind a "scoring
 * failed" banner just because a later step had a problem. Call
 * retryEmailAndBrief to retry just that part.
 */
export async function processCandidate(candidateId: string): Promise<void> {
  const scored = await scoreAndStore(candidateId);
  await runEmailAndBriefStep(scored);
}

/** Retries only the email-draft/brief step for a candidate that is already SCORED. */
export async function retryEmailAndBrief(candidateId: string): Promise<void> {
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
  if (candidate.status !== "SCORED") {
    throw new Error("Candidate must be SCORED before retrying the email/brief step.");
  }

  const appliedRole = candidate.appliedRole as RubricRole;
  const scores = await prisma.criterionScore.findMany({
    where: { candidateId, rubricRole: appliedRole },
    include: { criterion: true },
  });
  const appliedTotal = weightedTotal(scores.map((s) => ({ score: s.score, weight: s.criterion.weight })));

  await runEmailAndBriefStep({
    candidateId,
    appliedRole,
    cvBodyRedacted: candidate.cvBodyRedacted,
    appliedTotal,
  });
}

interface ScoredCandidate {
  candidateId: string;
  appliedRole: RubricRole;
  cvBodyRedacted: string;
  appliedTotal: number;
}

async function scoreAndStore(candidateId: string): Promise<ScoredCandidate> {
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });
  const appliedRole = candidate.appliedRole as RubricRole;

  try {
    const rubricCriteria = await prisma.rubricCriterion.findMany();
    const criterionByRoleAndName = new Map(
      rubricCriteria.map((c) => [`${c.role}:${c.name}`, c])
    );

    const result = await scoreCandidate(candidate.cvBodyRedacted);

    const rows: {
      candidateId: string;
      rubricRole: RubricRole;
      criterionId: string;
      score: number;
      reason: string;
    }[] = [];

    for (const rubricRole of ["PM", "SPM"] as RubricRole[]) {
      for (const item of result[rubricRole]) {
        const criterion = criterionByRoleAndName.get(`${rubricRole}:${item.name}`);
        if (!criterion) {
          // scoring.ts constrains Gemini's response to the known criterion
          // names via a zod enum + refine, so this should be unreachable —
          // if it isn't, something is wrong enough to fail loudly rather
          // than silently store a partial, understated score.
          throw new Error(
            `Gemini returned an unrecognized criterion "${item.name}" for ${rubricRole}.`
          );
        }
        rows.push({
          candidateId,
          rubricRole,
          criterionId: criterion.id,
          score: item.score,
          reason: item.reason,
        });
      }
    }

    await prisma.$transaction([
      prisma.criterionScore.deleteMany({ where: { candidateId } }),
      prisma.criterionScore.createMany({ data: rows }),
      prisma.candidate.update({
        where: { id: candidateId },
        data: { status: "SCORED", failReason: null },
      }),
    ]);

    const appliedTotal = weightedTotal(
      rows
        .filter((r) => r.rubricRole === appliedRole)
        .map((r) => ({
          score: r.score,
          weight: rubricCriteria.find((c) => c.id === r.criterionId)!.weight,
        }))
    );

    return { candidateId, appliedRole, cvBodyRedacted: candidate.cvBodyRedacted, appliedTotal };
  } catch (err) {
    await prisma.candidate.update({
      where: { id: candidateId },
      data: {
        status: "FAILED",
        failReason: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

async function runEmailAndBriefStep(scored: ScoredCandidate): Promise<void> {
  // Independent of each other — run concurrently rather than paying two
  // sequential Gemini round trips (draftEmailForCandidate here, plus
  // however many brief calls refreshBriefsForRole makes) on every upload.
  const results = await Promise.allSettled([
    draftEmailForCandidate(scored),
    refreshBriefsForRole(scored.appliedRole),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      // Deliberately does NOT flip candidate.status — scoring already
      // succeeded and is the source of truth the founder sees. This is
      // surfaced by the absence of an EmailDraft/Brief in the UI, which
      // offers its own retry action.
      console.error(`Post-scoring step failed for candidate ${scored.candidateId}:`, result.reason);
    }
  }
}

async function draftEmailForCandidate(scored: ScoredCandidate): Promise<void> {
  const kind = scored.appliedTotal >= INVITE_SCORE_CUTOFF ? "INVITE" : "REJECT";

  const draft = await draftEmail({
    kind,
    appliedRole: scored.appliedRole,
    cvBodyRedacted: scored.cvBodyRedacted,
  });

  const personal = await prisma.personalDetails.findUnique({
    where: { candidateId: scored.candidateId },
  });
  const firstName = personal?.name ? personal.name.split(/\s+/)[0] : "there";

  const hasPlaceholder = draft.body.includes(NAME_PLACEHOLDER);
  const body = hasPlaceholder
    ? draft.body.split(NAME_PLACEHOLDER).join(firstName)
    : `Hi ${firstName},\n\n${draft.body}`;
  if (!hasPlaceholder) {
    console.warn(
      `Email draft for candidate ${scored.candidateId} didn't include ${NAME_PLACEHOLDER}; prepended a greeting instead.`
    );
  }

  await prisma.emailDraft.upsert({
    where: { candidateId: scored.candidateId },
    update: { kind, subject: draft.subject, body, status: "DRAFT" },
    create: { candidateId: scored.candidateId, kind, subject: draft.subject, body, status: "DRAFT" },
  });
}

/**
 * Ensures every candidate currently in the top N (by score against their
 * applied-role rubric) has a generated Brief. Existing briefs for
 * candidates who later drop out of the top N are left in place rather than
 * deleted — cheap to keep, and avoids re-spending API calls if they climb
 * back in.
 *
 * Note: concurrent uploads to the same role can each read the ranking
 * before the other has written a new brief, and so both generate a brief
 * for the same newly-top-N candidate. Acceptable for a single-founder
 * internal tool — worst case is one duplicate Gemini call, not a
 * correctness issue (the upsert makes the final write win cleanly).
 */
export async function refreshBriefsForRole(role: RubricRole): Promise<void> {
  const candidates = await prisma.candidate.findMany({
    where: { appliedRole: role, status: "SCORED" },
    include: { scores: { where: { rubricRole: role }, include: { criterion: true } }, brief: true },
  });

  const ranked = candidates
    .map((c) => ({
      candidate: c,
      total: weightedTotal(c.scores.map((s) => ({ score: s.score, weight: s.criterion.weight }))),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_N_BRIEFS_PER_ROLE);

  for (const { candidate, total } of ranked) {
    // Backfills questions onto a brief generated before that field existed,
    // as well as generating both fresh for a candidate with no brief yet.
    if (candidate.brief && candidate.brief.questions.length > 0) continue;

    const topReasons = [...candidate.scores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => `${s.criterion.name}: ${s.reason}`);

    const [content, questions] = await Promise.all([
      candidate.brief
        ? Promise.resolve(candidate.brief.content)
        : generateBrief({
            appliedRole: role,
            cvBodyRedacted: candidate.cvBodyRedacted,
            totalScore: total,
            topReasons,
          }),
      generateInterviewQuestions({
        appliedRole: role,
        cvBodyRedacted: candidate.cvBodyRedacted,
        topReasons,
      }),
    ]);

    await prisma.brief.upsert({
      where: { candidateId: candidate.id },
      update: { content, questions },
      create: { candidateId: candidate.id, content, questions },
    });
  }
}

export { RUBRICS };
