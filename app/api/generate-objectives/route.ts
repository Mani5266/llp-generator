import { NextRequest, NextResponse } from "next/server";
import { geminiText } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();
    const text = await geminiText(
      `Generate a professional LLP business objectives clause for India LLP Act 2008.
Business description: "${description}"
Write 10-12 objectives as one flowing paragraph, formal legal language.
Return ONLY the paragraph text.`
    );
    return NextResponse.json({ objectives: text });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
