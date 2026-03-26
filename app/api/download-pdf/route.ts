import { NextRequest, NextResponse } from "next/server";
import { PRINT_CSS } from "@/lib/deed-template";
import { getAuthUser } from "@/lib/auth";
import { pdfInputSchema } from "@/lib/schemas";
import { rateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";

/** Strip dangerous HTML: <script> tags, event handlers (onerror, onclick, etc.), javascript: URLs */
function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")             // Remove <script>...</script>
    .replace(/<script[^>]*>/gi, "")                          // Remove orphan <script> tags
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")          // Remove inline event handlers
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, "")                 // Remove unquoted event handlers
    .replace(/javascript\s*:/gi, "blocked:")                 // Block javascript: URIs
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")              // Remove iframes
    .replace(/<iframe[^>]*>/gi, "")                          // Remove orphan iframes
    .replace(/<embed[^>]*>/gi, "")                           // Remove embeds
    .replace(/<object[\s\S]*?<\/object>/gi, "");             // Remove objects
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await getAuthUser(req);
  if (authError) return authError;

  // Rate limit: 30 requests per hour per user
  const rl = rateLimit(`${user!.id}:downloadPdf`, RATE_LIMITS.downloadPdf);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const body = await req.json();
    const parsed = pdfInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { html: bodyHtml, llpName } = parsed.data;

    // Audit log (fire-and-forget)
    logAudit(user!.id, "download_pdf", req, {
      metadata: { llpName: llpName || "unnamed" },
    });

    const safeName = String(llpName || "Draft").replace(/[<>"'&]/g, "");
    const safeBody = sanitizeHtml(String(bodyHtml || ""));
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>LLP Agreement - ${safeName}</title>
<style>${PRINT_CSS}
.bar{position:fixed;top:0;left:0;right:0;background:#1a2744;color:#fff;padding:10px 20px;font-family:sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;z-index:999;}
.bar button{background:#e53935;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-weight:700;cursor:pointer;font-size:13px;margin-left:8px;}
.bar button.docx{background:#1565c0;}
.content{margin-top:50px;}
@media print{.bar{display:none;}.content{margin-top:0;}}
</style></head><body>
<div class="bar">
  <span>LLP Agreement - ${safeName}</span>
  <div><button onclick="window.print()">Download PDF</button></div>
</div>
<div class="content">${safeBody}</div>
</body></html>`;
    return new NextResponse(html, { headers:{"Content-Type":"text/html; charset=utf-8"} });
  } catch {
    return NextResponse.json({ error:"Failed" }, { status:500 });
  }
}
