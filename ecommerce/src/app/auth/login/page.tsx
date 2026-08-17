"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { LogIn, KeyRound, Mail, Loader2, CheckCircle2, Send, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Redireciona automaticamente se já houver sessão ativa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/")
        router.refresh()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.push("/")
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Modal e estados de Recuperação de Senha (Esqueceu a Senha)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sendingReset, setSendingReset] = useState(false)
  const [verifyingReset, setVerifyingReset] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success("Login realizado com sucesso!")
      router.push("/")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login")
    } finally {
      setLoading(false)
    }
  }

  // 1. Enviar código no e-mail para recuperação de senha esquecida
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = resetEmail.trim().toLowerCase()
    if (!trimmed) {
      toast.error("Informe seu e-mail cadastrado.")
      return
    }

    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed)
      if (error) throw error

      toast.success(`Código de recuperação enviado para ${trimmed}! Verifique sua caixa de entrada.`)
      setResetStep(2)
    } catch (error: any) {
      console.error("Erro ao solicitar código:", error)
      toast.error(error.message || "Erro ao enviar código de recuperação.")
    } finally {
      setSendingReset(false)
    }
  }

  // 2. Validar código OTP e redefinir senha esquecida
  const handleVerifyCodeAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = resetCode.trim()

    if (!code) {
      toast.error("Digite o código de 6 dígitos recebido por e-mail.")
      return
    }

    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas digitadas não coincidem.")
      return
    }

    setVerifyingReset(true)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: resetEmail.trim().toLowerCase(),
        token: code,
        type: "recovery"
      })

      if (otpError) throw otpError

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success("Senha redefinida com sucesso! Você já está conectado.")
      setIsResetOpen(false)
      setResetStep(1)
      router.push("/")
      router.refresh()
    } catch (error: any) {
      console.error("Erro ao validar código:", error)
      toast.error(error.message || "Código inválido ou expirado. Tente novamente.")
    } finally {
      setVerifyingReset(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold italic text-primary uppercase">
            Móveis <span className="text-accent">Morante</span>
          </CardTitle>
          <CardDescription>Entre com seu e-mail e senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email)
                    setResetStep(1)
                    setIsResetOpen(true)
                  }}
                  className="text-xs text-primary hover:underline font-bold"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
              <LogIn className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/auth/signup" className="text-primary font-bold hover:underline">
              Cadastre-se agora
            </Link>
          </div>
        </CardFooter>
      </Card>

      {/* MODAL DE RECUPERAÇÃO DE SENHA ESQUECIDA COM CÓDIGO NO E-MAIL */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <KeyRound className="h-5 w-5 text-primary" />
              Recuperação de Senha
            </DialogTitle>
            <DialogDescription>
              {resetStep === 1
                ? "Digite seu e-mail para receber um código de segurança."
                : "Digite o código recebido por e-mail e sua nova senha."}
            </DialogDescription>
          </DialogHeader>

          {resetStep === 1 ? (
            <form onSubmit={handleSendResetCode} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">E-mail Cadastrado</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
              </div>

              <Button type="submit" className="w-full font-bold h-12 bg-primary text-white rounded-xl gap-2" disabled={sendingReset}>
                {sendingReset ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Código de Recuperação
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCodeAndResetPassword} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="resetCode" className="font-bold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Código Recebido no E-mail
                </Label>
                <Input
                  id="resetCode"
                  type="text"
                  placeholder="Ex: 123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  className="h-12 rounded-xl text-center text-xl font-black tracking-widest text-primary border-primary/30"
                  required
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newResetPassword">Nova Senha</Label>
                <Input
                  id="newResetPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmResetPassword">Confirme a Nova Senha</Label>
                <Input
                  id="confirmResetPassword"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetStep(1)}
                  className="flex-1 rounded-xl h-12 text-xs font-bold"
                >
                  Voltar
                </Button>
                <Button type="submit" className="flex-1 rounded-xl h-12 bg-green-600 hover:bg-green-700 text-white font-bold gap-2 text-xs" disabled={verifyingReset}>
                  {verifyingReset ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Redefinir Senha
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
