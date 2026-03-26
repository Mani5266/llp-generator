import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type) {
    // Create a response that we can attach Set-Cookie headers to
    const response = NextResponse.redirect(`${origin}/login`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as "email",
      token_hash,
    });

    if (!error) {
      // Email confirmed — redirect to login page
      // The session cookies are already set on the response
      return response;
    }
  }

  // Something went wrong — redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
