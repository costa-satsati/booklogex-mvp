import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AuthResponse } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Prepare the final redirect *first* (we’ll mutate its cookies)
  const redirectUrl = new URL('/dashboard', req.url);
  const res = NextResponse.redirect(redirectUrl);

  // Create server client wired to *this* response
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

  // Exchange the code for a session and write cookies to `res`
  const { data, error }: AuthResponse = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('❌ Auth exchange failed:', error.message);
    return NextResponse.redirect(new URL('/login', req.url));
  }

  console.log('✅ Supabase session created:', {
    user: data.user?.email,
    expires_in: data.session?.expires_in,
  });

  // Return the same response that carries cookies
  return res;
}
