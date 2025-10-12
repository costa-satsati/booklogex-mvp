'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { OrganisationSettings } from '@/types/organisation';

export function useOrgSettings() {
  const [settings, setSettings] = useState<OrganisationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('organisation_settings')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (!error && data) setSettings(data);
      setLoading(false);
    })();
  }, []);

  return { settings, loading };
}
