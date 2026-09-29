import { GoogleGenAI } from "@google/genai";

const globalForGemini = globalThis as unknown as { gemini?: GoogleGenAI };

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env file (see .env.example)."
    );
  }
  if (!globalForGemini.gemini) {
    globalForGemini.gemini = new GoogleGenAI({ apiKey });
  }
  return globalForGemini.gemini;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

/**
 * Calls Gemini asking for a single JSON object back, validated against the
 * given zod-like parse function. Throws if the model does not return valid
 * JSON matching the schema after one retry.
 */
export async function generateJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: object;
  parse: (data: unknown) => T;
}): Promise<T> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: params.responseSchema,
      temperature: 0.2,
    },
  });

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
  const ai = client();
  const res = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: params.prompt,
    config: {
      systemInstruction: params.systemInstruction,
      temperature: 0.4,
    },
  });
  const text = res.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text.trim();
}
