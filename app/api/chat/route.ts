import { NextRequest, NextResponse } from "next/server";
import { geminiJSON } from "@/lib/gemini";
import { buildPrompt, AIReply } from "@/lib/prompts";
import { LLPData } from "@/types";
import { validateUpdates } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { message, data, step, imageBase64, imageMimeType } = await req.json() as { message: string; data: Partial<LLPData>; step: string; imageBase64?: string; imageMimeType?: string };
    const image = (imageBase64 && imageMimeType) ? { base64: imageBase64, mimeType: imageMimeType } : undefined;
    const result = await geminiJSON<AIReply>(buildPrompt(message, data, step), image);

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
    return NextResponse.json({
      message: "Sorry, I had trouble with that. Please try again.",
      validationError: err instanceof Error ? err.message : "error",
      suggestedOptions: [],
      suggestedCheckboxes: [],
    });
  }
}
