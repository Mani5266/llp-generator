import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.verifyOtp({ type: type as "email", token_hash });

    if (!error) {
      // Email confirmed — redirect to login page
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  // Something went wrong — still redirect to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
