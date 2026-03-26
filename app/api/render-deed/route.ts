import { NextRequest, NextResponse } from "next/server";
import { renderDeed } from "@/lib/deed-template";
import { getAuthUser } from "@/lib/auth";
import { llpDataSchema } from "@/lib/schemas";
import { rateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req);
  if (authError) return authError;

  // Rate limit: 60 requests per hour per user
  const rl = rateLimit(`${user!.id}:renderDeed`, RATE_LIMITS.renderDeed);
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

    // Audit log (fire-and-forget)
    logAudit(user!.id, "render_deed", req, {
      metadata: { llpName: parsed.data.llpName || "unnamed" },
    });

    return NextResponse.json({ html: renderDeed(parsed.data, "preview") });
  } catch {
    return NextResponse.json({ html: "<p>Render error</p>" }, { status: 500 });
  }
}
