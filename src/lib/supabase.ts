import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL. Add it to your .env.local file.");
}
if (!supabaseKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to your .env.local file.");
}

/**
 * Browser-side Supabase client.
 *
 * Uses @supabase/ssr's createBrowserClient which stores auth tokens in
 * cookies (not localStorage), making them accessible to the Next.js
 * middleware and server-side code.
 *
 * createBrowserClient is a singleton — calling this multiple times
 * returns the same instance.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
