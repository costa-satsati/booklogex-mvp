"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase.from("waitlist_emails").insert([{ email }])

    if (error) {
      setMessage("❌ Error: " + error.message)
    } else {
      setMessage("✅ Thanks! You’ve joined the waitlist.")
      setEmail("")
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-bold text-blue-600">BookLogex</h1>
        <p className="text-slate-600">
          The AI-powered bookkeeping app for Australia & New Zealand.  
          Join the waitlist to get early access.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit">Join</Button>
        </form>

        {message && <p className="text-sm">{message}</p>}
      </div>
    </main>
  )
}
