"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"

function AuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get("code")

    async function handleCallback() {
      if (code) {
        try {
          const res = await fetch(`/api/auth/callback?code=${code}`)
          if (res.ok) {
            router.push("/")
            router.refresh()
            return
          }
        } catch (err) {
          console.error("Erro ao chamar API de callback:", err)
        }
      }

      // Se for fluxo implícito (token no hash), o supabase-js trata automaticamente no cliente.
      // Aguardamos a sessão ficar ativa e redirecionamos.
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push("/")
        router.refresh()
      } else {
        // Escuta alterações se ainda não estiver pronto
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            router.push("/")
            router.refresh()
            subscription.unsubscribe()
          } else if (event === "SIGNED_OUT") {
            router.push("/auth/login?error=callback-auth-failed")
            subscription.unsubscribe()
          }
        })
        
        // Timeout de fallback de 3 segundos para evitar travamento
        const timeout = setTimeout(() => {
          subscription.unsubscribe()
          router.push("/")
        }, 3000)

        return () => clearTimeout(timeout)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-muted-foreground font-medium animate-pulse">Conectando sua conta...</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground font-medium">Carregando...</p>
      </div>
    }>
      <AuthCallbackHandler />
    </Suspense>
  )
}
