import { GoogleGenAI } from "@google/genai";

function parseApiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS;
  if (multi) {
    return multi
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const single = process.env.GEMINI_API_KEY;
  return single ? [single] : [];
}

const globalForGemini = globalThis as unknown as {
  geminiClients?: Map<string, GoogleGenAI>;
  geminiPreferredKeyIndex?: number;
};

function clientFor(apiKey: string): GoogleGenAI {
  if (!globalForGemini.geminiClients) globalForGemini.geminiClients = new Map();
  let client = globalForGemini.geminiClients.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({ apiKey });
    globalForGemini.geminiClients.set(apiKey, client);
  }
  return client;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * Runs `attempt` against each configured Gemini API key in turn, starting
 * from whichever key last succeeded in this warm process (so a dead or
 * exhausted key isn't retried first on every single call), wrapping around
 * through all configured keys.
 *
 * Only retries on errors thrown by the API call itself (auth failure,
 * quota exceeded, network error) — a malformed response from a key that
 * DID authenticate is a prompt/schema problem, not something a different
 * key would fix, so that's surfaced immediately rather than burning
 * through the rotation for no reason.
 */
async function withKeyRotation<T>(attempt: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const keys = parseApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API key configured. Set GEMINI_API_KEYS (comma-separated) or GEMINI_API_KEY in your .env file."
    );
  }

  const startIndex = (globalForGemini.geminiPreferredKeyIndex ?? 0) % keys.length;
  const errors: string[] = [];

  for (let offset = 0; offset < keys.length; offset++) {
    const index = (startIndex + offset) % keys.length;
    try {
      const result = await attempt(clientFor(keys[index]));
      globalForGemini.geminiPreferredKeyIndex = index;
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`key #${index + 1}: ${message}`);
      console.warn(`Gemini call failed on key #${index + 1}/${keys.length}, trying next key:`, message);
    }
  }

  throw new Error(`All ${keys.length} Gemini API key(s) failed:\n${errors.join("\n")}`);
}

/**
 * Calls Gemini asking for a single JSON object back, validated against the
 * given zod-like parse function.
 */
export async function generateJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: object;
  parse: (data: unknown) => T;
}): Promise<T> {
  const res = await withKeyRotation((ai) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: params.responseSchema,
        temperature: 0.2,
      },
    })
  );

  const text = res.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text.slice(0, 200)}`);
  }

  return params.parse(data);
}

/** Plain text generation (no JSON schema), used for the email/brief drafts. */
export async function generateText(params: {
  systemInstruction: string;
  prompt: string;
}): Promise<string> {
  const res = await withKeyRotation((ai) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: params.prompt,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: 0.4,
      },
    })
  );
  const text = res.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text.trim();
}
