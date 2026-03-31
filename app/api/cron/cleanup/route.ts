import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Data Retention Cleanup Endpoint
 * 
 * Calls the `cleanup_expired_data` PostgreSQL function to delete:
 *   - Agreements inactive for > 30 days
 *
 * Intended to be called by:
 *   - Vercel Cron Jobs (vercel.json)
 *   - External cron services (e.g., cron-job.org)
 *   - Manual admin trigger
 */

export async function GET(req: NextRequest) {
  // ── Build service-role client ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Missing Supabase configuration" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Call the PostgreSQL retention function
    const { data, error } = await supabase.rpc("cleanup_expired_data", {
      agreement_retention_days: 30,
    });

    if (error) {
      console.error("[cron/cleanup] RPC error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[cron/cleanup] Data retention cleanup completed:", data);
    return NextResponse.json({ success: true, result: data });
  } catch (err) {
    console.error("[cron/cleanup] Unexpected error:", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
