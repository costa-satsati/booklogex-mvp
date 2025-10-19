// src/context/OrgContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Organisation } from '@/types/organisation';

type OrgContextType = {
  organisation: Organisation | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrganisation = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('organisations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;
      setOrganisation(data);
    } catch (error) {
      console.error('Error loading organisation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganisation();

    // Listen for updates from settings page
    const handleUpdate = () => {
      loadOrganisation();
    };

    window.addEventListener('org-settings-updated', handleUpdate);
    return () => window.removeEventListener('org-settings-updated', handleUpdate);
  }, []);

  return (
    <OrgContext.Provider value={{ organisation, loading, refetch: loadOrganisation }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgContext() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrgContext must be used within OrgProvider');
  }
  return context;
}
