import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend?: Resend };

export function resendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your .env file (see .env.example)."
    );
  }
  if (!globalForResend.resend) {
    globalForResend.resend = new Resend(apiKey);
  }
  return globalForResend.resend;
}

export function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error(
      "RESEND_FROM_EMAIL is not set. Add it to your .env file (see .env.example)."
    );
  }
  return from;
}

/**
 * Without a DNS-verified sending domain, Resend only delivers to the
 * account owner's own verified address — any other `to` (any real
 * candidate's email) is rejected with "Invalid `to` field". Until a real
 * domain is verified, RESEND_TEST_RECIPIENT_EMAIL redirects every send
 * there instead, so the feature is testable end-to-end; unset it once a
 * verified domain is configured to send to real candidates again.
 */
export function toAddress(candidateEmail: string): string {
  return process.env.RESEND_TEST_RECIPIENT_EMAIL || candidateEmail;
}
