import { NextRequest, NextResponse } from "next/server";
import { PRINT_CSS } from "@/lib/deed-template";
import { pdfInputSchema } from "@/lib/schemas";
import { rateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rateLimit";

/** Strip dangerous HTML: <script> tags, event handlers (onerror, onclick, etc.), javascript: URLs */
function sanitizeHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe[^>]*>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "");
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per hour per IP
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  const rl = rateLimit(`${clientIp}:downloadPdf`, RATE_LIMITS.downloadPdf);
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
