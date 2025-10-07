"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import TopbarUserMenu from "@/components/TopbarUserMenu";
import { supabase } from "@/lib/supabaseClient";

export function Topbar() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadOrg = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        console.warn("⚠️ No Supabase user found yet");
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          `
          org:organisations (
            name,
            abn
          )
        `
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Error fetching organisation:", error.message);
        return;
      }

      if (data?.org) {
        setOrgName(data.org.name);
      } else {
        console.warn("⚠️ No organisation found for user.");
      }
    };

    loadOrg();
  }, []);

  if (!mounted)
    return (
      <header className="h-12 border-b bg-white shadow-sm" />
    );

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm">
      {/* Mobile menu button */}
      <button className="md:hidden p-2 text-gray-600 hover:text-gray-800">
        <Menu size={20} />
      </button>

      {/* Greeting */}
      <div
        className="text-sm text-gray-500 hidden sm:block"
        suppressHydrationWarning
      >
        {orgName ?? "Welcome back 👋"}
      </div>

      {/* User avatar & dropdown */}
      <div className="flex items-center gap-3">
        <TopbarUserMenu />
      </div>
    </header>
  );
}
