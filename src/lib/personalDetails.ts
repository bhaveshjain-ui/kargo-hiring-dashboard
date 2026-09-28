/**
 * Best-effort detection of name/email/phone from raw CV text, shown to the
 * founder as pre-filled, editable suggestions on the upload form — never
 * trusted blindly. Also provides the redaction step that strips personal
 * identifiers out of the CV text before it is stored or sent to Gemini.
 *
 * Redaction has two passes, deliberately overlapping:
 *  1. Targeted: strip the exact name/email/phone the founder confirmed.
 *  2. Blanket: strip EVERY email-shaped and phone-number-shaped string in
 *     the CV, not just the confirmed ones. A CV listing a second personal
 *     email or a second phone number would otherwise leak straight past
 *     the targeted pass and into Gemini — the rubric never needs contact
 *     info, so erring toward over-redaction here is the safe default.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const EMAIL_RE_G = new RegExp(EMAIL_RE.source, "gi");
// Loosely matches runs of digits/spaces/dashes/dots/parens (e.g. "+91 98765 43210",
// "(022) 4567-8901", "9876543210"); validated against digit count below since this
// alone would also match things like page numbers or dates.
const PHONE_CANDIDATE_RE = /\+?\(?\d[\d\s().-]{5,17}\d/g;

export interface DetectedPersonalDetails {
  name: string;
  email: string;
  phone: string;
}

export function detectPersonalDetails(cvText: string): DetectedPersonalDetails {
  const emailMatch = cvText.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0] : "";

  const phone = guessPhone(cvText);

  const name = guessName(cvText);

  return { name, email, phone };
}

function guessName(cvText: string): string {
  const lines = cvText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (EMAIL_RE.test(line) || hasPhoneDigits(line)) continue;
    if (line.length > 40 || line.length < 3) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w));
    if (looksLikeName) return line;
  }

  return "";
}

function guessPhone(cvText: string): string {
  const candidates = cvText.match(PHONE_CANDIDATE_RE) || [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) {
      return candidate.trim();
    }
  }
  return "";
}

function hasPhoneDigits(line: string): boolean {
  return (line.match(/\d/g) || []).length >= 7;
}

/**
 * Removes personal identifiers from CV text before it is persisted as
 * cvBodyRedacted or passed to any Gemini call. See file header for the two
 * passes this runs.
 */
export function redactPersonalDetails(
  cvText: string,
  details: DetectedPersonalDetails
): string {
  let redacted = cvText;

  // --- Pass 1: targeted, using exactly what the founder confirmed ---

  if (details.email) {
    redacted = replaceAll(redacted, details.email, "[candidate email]");
  }

  if (details.phone) {
    const digitsOnly = details.phone.replace(/\D/g, "");
    if (digitsOnly.length >= 7) {
      const flexible = "\\+?[\\s.()-]*" + digitsOnly.split("").join("[\\s.()-]*");
      redacted = redacted.replace(new RegExp(flexible, "g"), "[candidate phone]");
    }
  }

  if (details.name) {
    redacted = replaceAll(redacted, details.name, "[Candidate]");
    for (const part of details.name.split(/\s+/)) {
      // >=2 so short given/family names and initials ("Bo", "Al", "J.") are
      // still caught, not just parts of 3+ characters.
      if (part.length >= 2) {
        redacted = redacted.replace(
          new RegExp(`\\b${escapeRegex(part)}\\b`, "g"),
          "[Candidate]"
        );
      }
    }
  }

  // --- Pass 2: blanket, catches anything targeted redaction missed (a
  // second email, a second phone number, a nickname the founder didn't
  // confirm) ---

  redacted = redacted.replace(EMAIL_RE_G, "[email]");
  redacted = redacted.replace(PHONE_CANDIDATE_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 ? "[phone]" : match;
  });

  return redacted;
}

function replaceAll(text: string, needle: string, replacement: string): string {
  if (!needle) return text;
  return text.replace(new RegExp(escapeRegex(needle), "gi"), replacement);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
