import { NextRequest, NextResponse } from "next/server";
import { geminiJSON } from "@/lib/gemini";
import { buildPrompt, AIReply } from "@/lib/prompts";
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
    if (files && files.length > 0) console.log(`[API] Processing ${files.length} files...`);
    const result = await geminiJSON<AIReply>(buildPrompt(message, data, step), files);
    console.log(`[AI Response] nextStep: ${result.nextStep}, updates:`, JSON.stringify(result.updates, null, 2));

    // Server-side validation on AI-provided updates
    if (result.updates && Object.keys(result.updates).length > 0) {
      const errors = validateUpdates(result.updates);
      if (errors.length > 0) {
        // Remove invalid fields from updates and add validation error
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
