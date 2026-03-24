import { GoogleGenerativeAI } from "@google/generative-ai";

let _client: GoogleGenerativeAI | null = null;

function client() {
  if (!_client) {
    const k = process.env.GEMINI_API_KEY;
    if (!k) throw new Error("GEMINI_API_KEY missing from .env.local");
    _client = new GoogleGenerativeAI(k);
  }
  return _client;
}

export async function geminiText(prompt: string, files?: Array<{ base64: string; mimeType: string }>): Promise<string> {
  const m = client().getGenerativeModel({ 
    model: "gemini-2.0-flash",
  });
  const parts: any[] = [{ text: prompt }];
  if (files && files.length > 0) {
    for (const f of files) {
      parts.push({
        inlineData: {
          data: f.base64,
          mimeType: f.mimeType,
        },
      });
    }
  }

  // 60-second timeout to prevent indefinite hangs
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await m.generateContent({ contents: [{ role: "user", parts }] }, { signal: controller.signal } as any);
    return r.response.text().trim();
  } catch (err: any) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new Error("AI request timed out after 60 seconds. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geminiJSON<T>(prompt: string, files?: Array<{ base64: string; mimeType: string }>): Promise<T> {
  const m = client().getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
  });
  const parts: any[] = [{ text: prompt }];
  if (files && files.length > 0) {
    for (const f of files) {
      parts.push({ inlineData: { data: f.base64, mimeType: f.mimeType } });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const r = await m.generateContent({ contents: [{ role: "user", parts }] }, { signal: controller.signal } as any);
    const raw = r.response.text().trim();
    return JSON.parse(raw) as T;
  } catch (err: any) {
    console.error("[geminiJSON] Error:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
