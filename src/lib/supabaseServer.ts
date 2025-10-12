import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  // 👇 use .then() instead of await to avoid returning Promise<void>
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const store = await cookieStorePromise;
          return store.getAll();
        },
        async setAll(cookiesToSet) {
          const store = await cookieStorePromise;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options as CookieOptions)
            );
          } catch {
            // Ignore errors from Server Component context
          }
        },
      },
    }
  );
}
