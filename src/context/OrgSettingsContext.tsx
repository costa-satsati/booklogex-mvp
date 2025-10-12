'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { OrganisationSettings } from '@/types/organisation';

type OrgSettingsContextType = {
  settings: OrganisationSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const OrgSettingsContext = createContext<OrgSettingsContextType>({
  settings: null,
  loading: true,
  refresh: async () => {},
});

export function OrgSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<OrganisationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  /** 🔄 Load organisation settings for the current user */
  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setSettings(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('organisation_settings')
        .select('*')
        .eq('user_id', uid)
        .single();

      if (error) {
        console.warn('No organisation settings found:', error.message);
        setSettings(null);
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading org settings:', err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  /** 🔁 Re-fetch when SettingsPage saves changes */
  useEffect(() => {
    loadSettings(); // initial load

    const reload = () => loadSettings();
    window.addEventListener('org-settings-updated', reload);
    return () => window.removeEventListener('org-settings-updated', reload);
  }, []);

  return (
    <OrgSettingsContext.Provider
      value={{
        settings,
        loading,
        refresh: loadSettings,
      }}
    >
      {children}
    </OrgSettingsContext.Provider>
  );
}

export function useOrgContext() {
  return useContext(OrgSettingsContext);
}
