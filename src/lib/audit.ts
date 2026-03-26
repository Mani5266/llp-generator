/**
 * Audit logging module for DPDP Act compliance.
 *
 * Uses the Supabase service role client to INSERT into audit_logs,
 * bypassing user-scoped RLS (the audit_logs table only grants INSERT to service_role).
 *
 * Fire-and-forget: audit failures are logged to console but never block the API response.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// ── Service Role Client (server-side only, never exposed to browser) ──

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServiceClient() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    console.warn("[audit] SUPABASE_SERVICE_ROLE_KEY not set — audit logging disabled");
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Lazy singleton — created on first use
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _serviceClient: ReturnType<typeof createClient<any>> | null | undefined;

function serviceClient() {
  if (_serviceClient === undefined) {
    _serviceClient = getServiceClient();
  }
  return _serviceClient;
}

// ── Types ──

interface AuditLogEntry {
  user_id: string;
  action: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// ── Public API ──

/**
 * Log an auditable action. Fire-and-forget — does not throw on failure.
 *
 * @param userId   - The authenticated user's UUID
 * @param action   - Action name (e.g. 'chat', 'download_docx')
 * @param req      - NextRequest (used to extract IP and User-Agent)
 * @param options  - Optional: resource_id, extra metadata
 */
export async function logAudit(
  userId: string,
  action: string,
  req: NextRequest,
  options?: {
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const client = serviceClient();
  if (!client) return; // Gracefully skip if service key not configured

  try {
    const entry: AuditLogEntry = {
      user_id: userId,
      action,
      resource_id: options?.resourceId,
      metadata: options?.metadata,
      ip_address: getClientIp(req),
      user_agent: req.headers.get("user-agent")?.substring(0, 500) || undefined,
    };

    const { error } = await client.from("audit_logs").insert(entry);

    if (error) {
      console.error("[audit] Failed to write audit log:", error.message);
    }
  } catch (err) {
    // Never let audit failures break the API
    console.error("[audit] Unexpected error:", err);
  }
}

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for; fallback to x-real-ip.
 */
function getClientIp(req: NextRequest): string | undefined {
  // Vercel/Cloudflare set these headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be comma-separated; first is the client
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || undefined;
}
