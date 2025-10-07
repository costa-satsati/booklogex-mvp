import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { AuthResponse } from "@supabase/supabase-js";

/**
 * Handles Supabase OAuth/Magic Link callback.
 * Exchanges the temporary `code` in the URL for a persistent session,
 * sets auth cookies via Supabase SSR helpers, and redirects to /dashboard.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // If user lands here without a valid code, send back to login
  if (!code) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Prepare a response object so we can attach cookies
  const res = NextResponse.next();

  // Create a server-side Supabase client with cookie handlers
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // Exchange the auth code for a Supabase session (auto-handles PKCE verifier)
  const { data, error }: AuthResponse = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("❌ Auth exchange failed:", error.message);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  console.log("✅ Supabase session created:", {
    user: data.user?.email,
    expires_in: data.session?.expires_in,
  });


  // Redirect to dashboard (middleware will reroute to onboarding if needed)
  const redirectUrl = new URL("/dashboard", req.url);
  return NextResponse.redirect(redirectUrl);
}
