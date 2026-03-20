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
  const m = client().getGenerativeModel({ model: "gemini-2.5-flash" });
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
  let clean = raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim();
  
  // Robustness fix: Fix common JSON syntax errors from AI (like unescaped backslashes in paths)
  try {
    return JSON.parse(clean) as T;
  } catch (err) {
    console.warn("[geminiJSON] Initial parse failed, attempting cleanup:", err);
    
    // 1. Fix unescaped backslashes that aren't followed by valid escape chars
    // Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
    clean = clean.replace(/\\(?![/\\bfnrtu"'])/g, "\\\\");

    // 2. Fix invalid \u sequences (e.g., \u followed by non-hex or less than 4 hex)
    // We look for \u NOT followed by 4 hex digits and escape the \
    clean = clean.replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u");

    try {
      return JSON.parse(clean) as T;
    } catch (finalErr) {
      console.error("[geminiJSON] Cleanup also failed. Raw content:", raw);
      throw finalErr;
    }
  }
}
