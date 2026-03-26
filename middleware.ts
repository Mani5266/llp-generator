import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js middleware for server-side route protection.
 *
 * Uses @supabase/ssr to read auth tokens from cookies (set by the
 * browser client's createBrowserClient). Refreshes expired sessions
 * and writes updated tokens back as Set-Cookie headers.
 *
 * Protects all routes except /login, /auth/*, and static assets.
 * API routes are allowed through — they handle their own auth.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes and static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/")      // API routes handle their own auth
  ) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  // Create a response object that we can modify (to set cookies)
  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // First, set cookies on the request (for downstream server components)
        cookiesToSet.forEach(({ name, value }) => {
          req.cookies.set(name, value);
        });

        // Recreate the response to include the updated request cookies
        supabaseResponse = NextResponse.next({ request: req });

        // Then set cookies on the response (for the browser)
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh the session. This will call setAll if the token was refreshed.
  // IMPORTANT: Use getUser() not getSession() — getUser() validates the
  // token server-side, getSession() only reads from the cookie without
  // validation and can be spoofed.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  // Run on all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
