export const SESSION_COOKIE = "kargo_session";

export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedSessionValue(): Promise<string> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    throw new Error(
      "DASHBOARD_PASSWORD is not set. Add it to your .env file (see .env.example)."
    );
  }
  return sha256(password);
}
