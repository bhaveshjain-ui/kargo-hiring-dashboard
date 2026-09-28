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
