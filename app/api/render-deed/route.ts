import { NextRequest, NextResponse } from "next/server";
import { renderDeed } from "@/lib/deed-template";
import { LLPData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const data: LLPData = await req.json();
    return NextResponse.json({ html: renderDeed(data, "preview") });
  } catch (err) {
    return NextResponse.json({ html: "<p>Render error</p>" }, { status: 500 });
  }
}
