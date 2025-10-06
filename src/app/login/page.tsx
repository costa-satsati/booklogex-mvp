"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  //const searchParams = useSearchParams();
  //const redirectTo = searchParams.get("redirectedFrom") || "/dashboard";

  const handleEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: "satkon@gmail.com",
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_SITE_URL + "/auth/callback" ||
          "http://localhost:3000/auth/callback",
      },
    });
    if (error) console.error(error);
    else alert("Check your email for the login link.");
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_SITE_URL + "/auth/callback" ||
          "http://localhost:3000/auth/callback",
      },
    });
    if (error) console.error(error);
  };

  return (
    <main className="flex h-screen items-center justify-center flex-col gap-4">
      <button
        onClick={handleEmailLogin}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Login with Email
      </button>
      <button
        onClick={handleGoogleLogin}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Login with Google
      </button>
    </main>
  );
}
