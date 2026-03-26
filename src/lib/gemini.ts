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

  // For multimodal (vision) requests: images first, then prompt text.
  // Label each image so the model knows the card order.
  const parts: any[] = [];
  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      parts.push({ text: `--- Aadhaar Card ${i + 1} (Partner ${i + 1}, index ${i}) ---` });
      parts.push({
        inlineData: {
          data: files[i].base64,
          mimeType: files[i].mimeType,
        },
      });
    }
  }
  parts.push({ text: prompt });

  // 90-second timeout for multi-image OCR requests
  const timeoutMs = files && files.length > 0 ? 90000 : 60000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await m.generateContent({ contents: [{ role: "user", parts }] }, { signal: controller.signal } as any);
    return r.response.text().trim();
  } catch (err: any) {
    if (err?.name === "AbortError" || controller.signal.aborted) {
      throw new Error(`AI request timed out after ${timeoutMs / 1000} seconds. Please try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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
