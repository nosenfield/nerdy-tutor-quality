import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase Client for Browser/Client Components
 * 
 * Use this in Client Components, hooks, and client-side code.
 * Does not use cookies from next/headers, so it's safe for client components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

