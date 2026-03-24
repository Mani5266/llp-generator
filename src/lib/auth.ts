import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side authentication helper for API routes.
 * Extracts the Supabase access token from the Authorization header,
 * verifies it, and returns the authenticated user.
 *
 * Usage in API routes:
 *   const { user, error } = await getAuthUser(req);
 *   if (error) return error;
 */
export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized: Missing or invalid authorization header" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized: Invalid or expired session" },
        { status: 401 }
      ),
    };
  }

  return { user, error: null };
}
