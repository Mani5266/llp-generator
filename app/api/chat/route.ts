import { NextRequest, NextResponse } from "next/server";
import { geminiJSON } from "@/lib/gemini";
import { buildPrompt, buildExtractionPrompt, AIReply } from "@/lib/prompts";
import { LLPData } from "@/types";
import { validateUpdates } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { message, data, step, files } = await req.json() as { 
      message: string; 
      data: Partial<LLPData>; 
      step: string; 
      files?: Array<{ base64: string; mimeType: string }>;
    };

    const hasFiles = files && files.length > 0;

    // Use dedicated extraction prompt when Aadhaar files are attached
    const prompt = hasFiles
      ? buildExtractionPrompt(data, files.length)
      : buildPrompt(message, data, step);

    if (hasFiles) console.log(`[API] Extraction prompt — processing ${files.length} file(s)...`);
    
    const result = await geminiJSON<AIReply>(prompt, hasFiles ? files : undefined);
    console.log(`[AI Response] nextStep: ${result.nextStep}, updates:`, JSON.stringify(result.updates, null, 2));

    // Server-side validation on AI-provided updates
    if (result.updates && Object.keys(result.updates).length > 0) {
      const errors = validateUpdates(result.updates);
      if (errors.length > 0) {
        result.validationError = errors.join(" ");
        result.message = `⚠️ ${errors.join(" ")}\n\n${result.message}`;
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("chat error:", err);
    let errorMessage = "Sorry, I had trouble with that. Please try again.";
    if (err instanceof Error) {
      errorMessage = `AI Error: ${err.message}`;
    }
    return NextResponse.json({
      message: errorMessage,
      validationError: err instanceof Error ? err.message : "error",
      suggestedOptions: [],
      suggestedCheckboxes: [],
    });
  }
}
