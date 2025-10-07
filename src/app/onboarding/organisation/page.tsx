"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OrganisationOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    abn: "",
    gst_registered: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) return;

    // 1️⃣ Create organisation
    const { data: org, error: orgError } = await supabase
      .from("organisations")
      .insert([
        {
          name: form.name,
          abn: form.abn,
          gst_registered: form.gst_registered,
        },
      ])
      .select()
      .single();

    if (orgError) {
      console.error("Organisation error:", orgError);
      setLoading(false);
      return;
    }

    // 2️⃣ Update user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .update({ org_id: org.id })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      setLoading(false);
      return;
    }

    // 3️⃣ Redirect
    router.push("/dashboard");
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-md space-y-4"
      >
        <h1 className="text-xl font-semibold text-gray-800 text-center">
          Set up your organisation
        </h1>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="e.g. Kosta Pty Ltd"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            ABN
          </label>
          <input
            type="text"
            required
            value={form.abn}
            onChange={(e) => setForm({ ...form, abn: e.target.value })}
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="11 222 333 444"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="gst"
            checked={form.gst_registered}
            onChange={(e) =>
              setForm({ ...form, gst_registered: e.target.checked })
            }
            className="h-4 w-4 border-gray-300"
          />
          <label htmlFor="gst" className="text-sm text-gray-700">
            Registered for GST
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
        >
          {loading ? "Creating..." : "Create Organisation"}
        </button>
      </form>
    </main>
  );
}
