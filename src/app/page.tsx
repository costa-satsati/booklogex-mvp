"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export default function Home() {
  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase.from("test").select("*")
      console.log("Data:", data, "Error:", error)
    }
    loadData()
  }, [])

  return <h1 className="text-2xl font-bold text-blue-600">Supabase Connected 🚀</h1>
}
