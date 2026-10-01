import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUniqueEmailDraft = vi.fn();
const mockUpsertEmailDraft = vi.fn();
const mockFindUniquePersonalDetails = vi.fn();

vi.mock("./db", () => ({
  prisma: {
    emailDraft: {
      findUnique: (...args: unknown[]) => mockFindUniqueEmailDraft(...args),
      upsert: (...args: unknown[]) => mockUpsertEmailDraft(...args),
    },
    personalDetails: {
      findUnique: (...args: unknown[]) => mockFindUniquePersonalDetails(...args),
    },
  },
}));

const mockDraftEmail = vi.fn();
vi.mock("./emailDraft", () => ({
  draftEmail: (...args: unknown[]) => mockDraftEmail(...args),
  NAME_PLACEHOLDER: "{{candidate_name}}",
}));

// pipeline.ts imports these at module load time; none of their functions
// run on the draftEmailForCandidate path, but the imports must resolve.
vi.mock("./scoring", () => ({ scoreCandidate: vi.fn() }));
vi.mock("./brief", () => ({ generateBrief: vi.fn() }));
vi.mock("./interviewQuestions", () => ({ generateInterviewQuestions: vi.fn() }));
vi.mock("./jdMatch", () => ({ checkJdMatch: vi.fn() }));

const { draftEmailForCandidate } = await import("./pipeline");

const SCORED = {
  candidateId: "cand_1",
  appliedRole: "PM" as const,
  cvBodyRedacted: "[Candidate]'s redacted CV text",
  appliedTotal: 80,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUniquePersonalDetails.mockResolvedValue({ candidateId: "cand_1", name: "Priya Krishnan", email: "x", phone: null });
  mockDraftEmail.mockResolvedValue({ subject: "Subject", body: "Hi {{candidate_name}}, ..." });
});

describe("draftEmailForCandidate", () => {
  it("drafts a new email when none exists yet", async () => {
    mockFindUniqueEmailDraft.mockResolvedValue(null);

    await draftEmailForCandidate(SCORED);

    expect(mockDraftEmail).toHaveBeenCalledTimes(1);
    expect(mockUpsertEmailDraft).toHaveBeenCalledTimes(1);
  });

  it("regenerates when the existing draft is still unsent (status DRAFT)", async () => {
    mockFindUniqueEmailDraft.mockResolvedValue({ candidateId: "cand_1", status: "DRAFT" });

    await draftEmailForCandidate(SCORED);

    expect(mockDraftEmail).toHaveBeenCalledTimes(1);
    expect(mockUpsertEmailDraft).toHaveBeenCalledTimes(1);
  });

  /**
   * Regression test for a real bug, caught live: retrying the email/brief
   * step for a candidate whose email had already been sent silently
   * regenerated and overwrote it back to an unsent DRAFT, erasing the
   * record that a real email had gone out. draftEmailForCandidate must
   * never touch an EmailDraft once it's left the DRAFT state.
   */
  it("does NOT regenerate or touch an already-SENT draft", async () => {
    mockFindUniqueEmailDraft.mockResolvedValue({ candidateId: "cand_1", status: "SENT" });

    await draftEmailForCandidate(SCORED);

    expect(mockDraftEmail).not.toHaveBeenCalled();
    expect(mockUpsertEmailDraft).not.toHaveBeenCalled();
  });

  it("does NOT touch a draft whose send is currently in flight (SENDING)", async () => {
    mockFindUniqueEmailDraft.mockResolvedValue({ candidateId: "cand_1", status: "SENDING" });

    await draftEmailForCandidate(SCORED);

    expect(mockDraftEmail).not.toHaveBeenCalled();
    expect(mockUpsertEmailDraft).not.toHaveBeenCalled();
  });

  it("substitutes the real first name for the placeholder, never sending the real name to the draft generator", async () => {
    mockFindUniqueEmailDraft.mockResolvedValue(null);
    mockDraftEmail.mockResolvedValue({ subject: "Subject", body: "Hi {{candidate_name}}, welcome." });

    await draftEmailForCandidate(SCORED);

    // The AI call itself never received the real name...
    const callArg = mockDraftEmail.mock.calls[0][0];
    expect(JSON.stringify(callArg)).not.toContain("Priya");
    // ...but the stored draft has it substituted in afterwards.
    const upsertArg = mockUpsertEmailDraft.mock.calls[0][0];
    expect(upsertArg.create.body).toBe("Hi Priya, welcome.");
  });
});
