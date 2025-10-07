"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import TopbarUserMenu from "@/components/TopbarUserMenu";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = { org_id: string | null };
type OrgRow = { name: string; abn: string };

export function Topbar() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loadOrg = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;

      // 1) get org_id from profile
      const { data: profile, error: pErr } = await supabase
        .from("user_profiles")
        .select("org_id")
        .eq("id", userId)
        .single<ProfileRow>();

      if (pErr) {
        console.error("Profile fetch error:", pErr);
        return;
      }
      if (!profile?.org_id) {
        console.warn("No organisation linked to user profile yet.");
        return;
      }

      // 2) fetch organisation by id
      const { data: org, error: oErr } = await supabase
        .from("organisations")
        .select("name, abn")
        .eq("id", profile.org_id)
        .single<OrgRow>();

      if (oErr) {
        console.error("Organisation fetch error:", oErr);
        return;
      }

      setOrgName(org.name);
    };

    loadOrg();
  }, []);

  if (!mounted) return <header className="h-12 border-b bg-white shadow-sm" />;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
      <button className="md:hidden p-2 text-gray-600 hover:text-gray-800">
        <Menu size={20} />
      </button>

      <div className="text-sm text-gray-500 hidden sm:block" suppressHydrationWarning>
        {orgName ?? "Welcome back 👋"}
      </div>

      <div className="flex items-center gap-3">
        <TopbarUserMenu />
      </div>
    </header>
  );
}
