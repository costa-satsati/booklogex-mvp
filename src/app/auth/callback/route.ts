import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: NextRequest) {
  const res = NextResponse.next();

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(req.url);

  if (error) {
    console.error("Auth exchange error:", error.message);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const redirectRes = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.getAll().forEach((cookie) => redirectRes.cookies.set(cookie));
  return redirectRes;
}
