import { NextRequest, NextResponse } from "next/server";
import { renderDeed } from "@/lib/deed-template";
import { LLPData } from "@/types";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req);
  if (authError) return authError;

  try {
    const data: LLPData = await req.json();
    return NextResponse.json({ html: renderDeed(data, "preview") });
  } catch (err) {
    return NextResponse.json({ html: "<p>Render error</p>" }, { status: 500 });
  }
}
