import { createServerSupabaseClient } from "@/lib/supabase/client-server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth Middleware
 * 
 * Protects dashboard routes by checking authentication status.
 * Redirects unauthenticated users to login page.
 */

export async function middleware(request: NextRequest) {
  // Only protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow all other routes
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

