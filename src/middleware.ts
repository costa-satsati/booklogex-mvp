import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function middleware(req: NextRequest) {
  // Prepare a response we can modify cookies on
  const res = NextResponse.next({ request: { headers: req.headers } });

  // ✅ Correct usage (3 parameters)
  const supabase = await createClient();

  // Fetch the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('middleware user', user);

  // Redirect unauthenticated users away from protected routes
  if (!user && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile?.org_id && !req.nextUrl.pathname.startsWith('/onboarding')) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/onboarding/organisation';
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

// Apply to protected routes
export const config = {
  matcher: ['/dashboard/:path*', '/transactions/:path*', '/employees/:path*'],
};
