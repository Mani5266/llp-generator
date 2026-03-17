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
  const m = client().getGenerativeModel({ model: "gemini-1.5-flash" });
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
  const r = await m.generateContent(parts);
  return r.response.text().trim();
}

export async function geminiJSON<T>(prompt: string, files?: Array<{ base64: string; mimeType: string }>): Promise<T> {
  const raw = await geminiText(prompt + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no explanation.", files);
  const clean = raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  return JSON.parse(clean) as T;
}
