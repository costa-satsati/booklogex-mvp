import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login", req.url));

  const res = NextResponse.redirect(new URL("/dashboard", req.url));

  // 👇 Manually get the code-verifier cookie value
  const codeVerifier = req.cookies.get(
    "sb-ayiymomittshudtckydp-auth-token-code-verifier"
  )?.value;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.delete({ name, ...options });
        },
      },
    }
  );

  try {
    // 👇 If Supabase fails to read its own cookie, we supply it manually
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.warn("exchangeCodeForSession default failed:", error.message);
      if (codeVerifier) {
        const { data: manualData, error: manualError } =
          await supabase.auth.exchangeCodeForSession({
            authCode: code,
            codeVerifier,
          } as any);
        if (manualError) throw manualError;
        console.log("✅ Manual PKCE exchange succeeded:", manualData.session);
      } else {
        throw error;
      }
    } else {
      console.log("✅ Default PKCE exchange succeeded:", data.session);
    }
  } catch (err: any) {
    console.error("❌ Auth exchange totally failed:", err.message);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return res;
}
