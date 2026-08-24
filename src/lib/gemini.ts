import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("LLM request timed out")), ms)
    ),
  ]);
}

export async function callGeminiJSON<T = any>(
  prompt: string,
  attempt = 1
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      }),
      TIMEOUT_MS
    );

    const text = response.text;
    if (!text) throw new Error("Empty response from model");

    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch (err: any) {
    if (attempt < 2) {
      return callGeminiJSON<T>(prompt, attempt + 1);
    }
    console.error("Gemini call failed after retry:", err?.message);
    return { ok: false, error: err?.message ?? "Unknown LLM error" };
  }
}


export function preVisitPrompt(symptoms: string) {
  return `Analyse these symptoms and return ONLY valid JSON with this exact shape:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": string,
  "suggestedQuestions": [string, string, string]
}
Symptoms: ${symptoms}`;
}

export function postVisitPrompt(notes: string) {
  return `Convert these clinical notes into a patient-friendly summary. Return ONLY valid JSON with this exact shape:
{
  "summary": string,
  "medicationSchedule": [{ "medication": string, "frequency": string, "duration": string }],
  "followUpSteps": [string]
}
Notes: ${notes}`;
}
