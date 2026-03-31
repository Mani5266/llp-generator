import { NextRequest, NextResponse } from "next/server";
import { renderDeed } from "@/lib/deed-template";
import { llpDataSchema } from "@/lib/schemas";
import { rateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Rate limit: 60 requests per hour per IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rl = rateLimit(`${clientIp}:renderDeed`, RATE_LIMITS.renderDeed);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body = await req.json();
    const parsed = llpDataSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ html: renderDeed(parsed.data, "preview") });
  } catch {
    return NextResponse.json({ html: "<p>Render error</p>" }, { status: 500 });
  }
}
