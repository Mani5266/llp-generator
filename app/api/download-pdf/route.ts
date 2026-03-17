import { NextRequest, NextResponse } from "next/server";
import { renderDeed, PRINT_CSS } from "@/lib/deed-template";
import { LLPData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { html: bodyHtml, llpName } = await req.json();
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<title>LLP Agreement - ${llpName||"Draft"}</title>
<style>${PRINT_CSS}
.bar{position:fixed;top:0;left:0;right:0;background:#1a2744;color:#fff;padding:10px 20px;font-family:sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;z-index:999;}
.bar button{background:#e53935;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-weight:700;cursor:pointer;font-size:13px;margin-left:8px;}
.bar button.docx{background:#1565c0;}
.content{margin-top:50px;}
@media print{.bar{display:none;}.content{margin-top:0;}}
</style></head><body>
<div class="bar">
  <span>📄 LLP Agreement — ${llpName||"Draft"}</span>
  <div><button onclick="window.print()">Download PDF</button></div>
</div>
<div class="content">${bodyHtml}</div>
</body></html>`;
    return new NextResponse(html, { headers:{"Content-Type":"text/html; charset=utf-8"} });
  } catch (err) {
    return NextResponse.json({ error:"Failed" }, { status:500 });
  }
}
