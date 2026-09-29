// Source of truth for the Kargo PM / SPM hiring rubric.
// Mirrors Kargo_PM_SPM_Hiring_Rubric.txt sections 3-5. Used to seed the
// database (prisma/seed.ts) and as the scoring instructions given to Gemini.

export type RubricRole = "PM" | "SPM";

export interface RubricCriterionDef {
  order: number;
  name: string;
  description: string;
  weight: number;
}

export const SCORING_SCALE = `Score each criterion 0-3:
  3 = the CV meets every part of the "strong" description
  2 = the evidence is present but missing one element
  1 = claimed without specifics
  0 = absent

Final score = sum of (score / 3 x weight). Maximum is 100.`;

export const PM_RUBRIC: RubricCriterionDef[] = [
  {
    order: 1,
    name: "Self-found problem",
    description:
      'The CV describes at least one problem the candidate noticed on their own, using wording like "identified," "noticed," or "found that" rather than "tasked with" or "responsible for." It also states what the problem was costing before the fix (hours, money, errors, or tickets). Two or more such examples earns a 3.',
    weight: 20,
  },
  {
    order: 2,
    name: "Rough version first",
    description:
      "The first fix was the quickest thing that worked, such as a spreadsheet, a weekend prototype, or a manual process. The CV shows the time from noticing the problem to having something working, measured in days or weeks rather than quarters.",
    weight: 20,
  },
  {
    order: 3,
    name: "Adopted without a mandate",
    description:
      "People who didn't report to the candidate started using the fix. The CV says who, how many or how fast, and that it later became a standard or core feature. Something rolled out on a manager's instruction doesn't count.",
    weight: 25,
  },
  {
    order: 4,
    name: "Owns the bad moment",
    description:
      "The CV names at least one specific failure, outage, loss or crisis that the candidate drove to resolution themselves, not as one responder on a rota. They also personally handled communication with the people affected.",
    weight: 15,
  },
  {
    order: 5,
    name: "Written learning that changed practice",
    description:
      "After a failure, the candidate wrote it down (a post-mortem, root-cause note, bug report or SOP), and the CV shows what changed as a result, such as a new standard practice or a metric that moved.",
    weight: 20,
  },
];

export const SPM_RUBRIC: RubricCriterionDef[] = [
  {
    order: 1,
    name: "Self-found problem",
    description:
      "At least two problems spotted without being asked. At least one was outside their own immediate area, such as another team's workflow, a vendor, or a customer's process. The cost is stated in money, time, or customers.",
    weight: 20,
  },
  {
    order: 2,
    name: "Rough version first",
    description:
      "Everything in the PM version, plus evidence of a judgment call about when the rough version stopped being enough and what replaced it (for example, a spreadsheet moved to a proper tool, or a prototype that became a core feature).",
    weight: 10,
  },
  {
    order: 3,
    name: "Adopted without a mandate",
    description:
      "Adoption crossed team or company lines, reaching other teams, the whole function, or customers, and became a lasting standard or core product. At least two instances.",
    weight: 20,
  },
  {
    order: 4,
    name: "Owns the bad moment",
    description:
      "At least two failures or crises where the candidate was the final decision-maker, with no one above approving the fix. The stakes were external (customers, revenue or data), and the candidate owned both the fix and the external communication. Being on a rota, or escalating the problem upward, scores no higher than 1.",
    weight: 30,
  },
  {
    order: 5,
    name: "Written learning that changed practice",
    description:
      "Write-ups of failures that changed practice beyond the candidate's own team. At least one was about the candidate's own mistake, not someone else's.",
    weight: 20,
  },
];

export const RUBRICS: Record<RubricRole, RubricCriterionDef[]> = {
  PM: PM_RUBRIC,
  SPM: SPM_RUBRIC,
};

export function weightedTotal(
  scores: { weight: number; score: number }[]
): number {
  const total = scores.reduce((sum, s) => sum + (s.score / 3) * s.weight, 0);
  return Math.round(total * 10) / 10;
}

/**
 * Ranks candidates by score, highest first, with a deterministic tiebreak
 * (earlier-created first) for equal scores. Used everywhere a "top N" or
 * "rank #" is computed — the dashboard's displayed rank, the compare page's
 * ordering, and refreshBriefsForRole's top-N cutoff all need to agree on
 * the SAME order, or a candidate can show as e.g. rank 5 on the dashboard
 * while a differently-tie-broken internal ranking excluded them from the
 * top 5 that actually got a brief.
 */
export function rankByScore<T extends { total: number; createdAt: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.total - a.total || a.createdAt.getTime() - b.createdAt.getTime());
}

// How many points a candidate needs (against the rubric for the role they
// applied for) to get an interview invite instead of a warm rejection.
export const INVITE_SCORE_CUTOFF = 60;

// How many top-ranked candidates per role get an interview brief generated.
export const TOP_N_BRIEFS_PER_ROLE = 5;
