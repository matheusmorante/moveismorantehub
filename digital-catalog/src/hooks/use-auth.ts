"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuta mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/auth/callback`
    console.log("Iniciando login Google OAuth. Redirect URL enviada:", redirectUrl)
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    })
  }

  const logout = async () => {
    return await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    loginWithGoogle,
    logout,
  }
}
