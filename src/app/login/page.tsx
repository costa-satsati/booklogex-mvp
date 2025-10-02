"use client"

import { supabase } from "@/lib/supabaseClient"

export default function LoginPage() {
  const handleEmailLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: "test@example.com",
      options: { emailRedirectTo: "http://localhost:3000/" },
    })
    if (error) console.error(error)
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    })
    if (error) console.error(error)
  }

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
  )
}
