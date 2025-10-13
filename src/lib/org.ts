import { supabase } from '@/lib/supabaseClient';

/**
 * Retrieves the current logged-in user's organisation ID.
 * Throws if the user is not signed in or the org cannot be found.
 */
export async function getCurrentOrgId(): Promise<string> {
  // 1️⃣ Get current user
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error('User not signed in.');
  }

  // 2️⃣ Look up org_id from user_profiles
  const { data: profile, error: profErr } = await supabase
    .from('user_profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profErr) {
    throw new Error(`Failed to fetch user profile: ${profErr.message}`);
  }

  if (!profile?.org_id) {
    throw new Error('User profile has no associated organisation.');
  }

  return profile.org_id;
}
