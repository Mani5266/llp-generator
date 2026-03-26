import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a server-side Supabase client for use in Server Components,
 * Server Actions, and Route Handlers.
 *
 * This client reads/writes auth tokens from/to cookies, keeping them
 * in sync with the browser client created by @supabase/ssr's
 * createBrowserClient.
 *
 * IMPORTANT: Call this function fresh for every request — do NOT cache
 * or reuse the returned client across requests.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can throw when called from a Server Component
            // (which can't set cookies). This is safe to ignore because
            // the middleware will handle refreshing the session.
          }
        },
      },
    }
  );
}
