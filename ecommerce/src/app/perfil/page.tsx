"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  User as UserIcon, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  Loader2, 
  Send, 
  Lock, 
  UserCheck,
  ArrowLeft,
  Key,
  RotateCcw
} from "lucide-react"
import Link from "next/link"

function ProfileContent() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  // Form states - Name
  const [fullName, setFullName] = useState("")
  const [updatingName, setUpdatingName] = useState(false)

  // Form states - Email (Etapas 1 e 2)
  const [emailStep, setEmailStep] = useState<1 | 2>(1)
  const [newEmail, setNewEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [emailOtpCode, setEmailOtpCode] = useState("")
  const [sendingEmailCode, setSendingEmailCode] = useState(false)
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false)

  // Form states - Password (Modos: 'with_current' | 'forgot_code')
  const [passwordMode, setPasswordMode] = useState<"with_current" | "forgot_code">("with_current")
  
  // Modo A: Digitar Senha Atual + Nova Senha
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Modo B: Esqueci a senha atual (Código via E-mail)
  const [passwordOtpCode, setPasswordOtpCode] = useState("")
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false)
  const [verifyingPasswordCode, setVerifyingPasswordCode] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "")
    }
  }, [user])

  if (!authLoading && !user) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm">
            Você precisa estar conectado à sua conta para visualizar e alterar suas configurações de perfil.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full px-8 font-bold">
          <Link href="/auth/login">Fazer Login</Link>
        </Button>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Carregando seu perfil...</p>
      </div>
    )
  }

  const userName = fullName || user?.user_metadata?.full_name || user?.email || "Usuário"
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "U"

  // 1. Atualizar Nome Completo
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error("O nome não pode estar vazio.")
      return
    }

    setUpdatingName(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      })

      if (error) throw error
      toast.success("Nome atualizado com sucesso!")
    } catch (error: any) {
      console.error("Erro ao atualizar nome:", error)
      toast.error(error.message || "Erro ao atualizar o nome.")
    } finally {
      setUpdatingName(false)
    }
  }

  // 2. E-mail — Etapa 1: Enviar Código de Verificação para o Novo E-mail
  const handleRequestEmailChangeCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = newEmail.trim().toLowerCase()

    if (!trimmedEmail) {
      toast.error("Por favor, digite o novo e-mail.")
      return
    }

    if (trimmedEmail === user?.email) {
      toast.error("O novo e-mail é idêntico ao e-mail atual.")
      return
    }

    if (trimmedEmail !== confirmEmail.trim().toLowerCase()) {
      toast.error("Os e-mails digitados não coincidem.")
      return
    }

    setSendingEmailCode(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmedEmail })
      if (error) throw error

      toast.success(`Código/link de confirmação enviado para ${trimmedEmail}! Insira o código recebido abaixo.`)
      setEmailStep(2)
    } catch (error: any) {
      console.error("Erro ao solicitar alteração de e-mail:", error)
      toast.error(error.message || "Erro ao enviar código de verificação.")
    } finally {
      setSendingEmailCode(false)
    }
  }

  // 2. E-mail — Etapa 2: Confirmar Código OTP Digitado
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = emailOtpCode.trim()

    if (!code) {
      toast.error("Por favor, informe o código de verificação enviado por e-mail.")
      return
    }

    setVerifyingEmailCode(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: newEmail.trim().toLowerCase(),
        token: code,
        type: "email_change"
      })

      if (error) {
        const altRes = await supabase.auth.verifyOtp({
          email: newEmail.trim().toLowerCase(),
          token: code,
          type: "email"
        })
        if (altRes.error) throw error
      }

      toast.success("E-mail verificado e alterado com sucesso! Redirecionando para login...")

      await logout()
      router.push("/auth/login?email_updated=true")
    } catch (error: any) {
      console.error("Erro ao verificar código de e-mail:", error)
      toast.error(error.message || "Código inválido ou expirado. Tente novamente.")
    } finally {
      setVerifyingEmailCode(false)
    }
  }

  // 3. Alterar Senha — MODO PRINCIPAL: Digitar Senha Atual para Confirmar
  const handlePasswordUpdateWithCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      toast.error("Por favor, digite a sua senha atual.")
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

    setUpdatingPassword(true)
    try {
      // 1. Re-autentica com a senha atual para garantir segurança
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword
      })

      if (authError) {
        throw new Error("A senha atual digitada está incorreta.")
      }

      // 2. Se a senha atual for válida, atualiza para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success("Senha alterada com sucesso!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error)
      toast.error(error.message || "Erro ao atualizar a senha.")
    } finally {
      setUpdatingPassword(false)
    }
  }

  // 3. Alterar Senha — MODO ALTERNATIVO (Esqueceu a senha atual estando logado): Código no E-mail
  const handleRequestPasswordCode = async () => {
    if (!user?.email) return

    setSendingPasswordCode(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) throw error

      toast.success(`Código enviado para ${user.email}! Insira o código e defina sua nova senha.`)
    } catch (error: any) {
      console.error("Erro ao enviar código de senha:", error)
      toast.error(error.message || "Erro ao enviar código.")
    } finally {
      setSendingPasswordCode(false)
    }
  }

  const handleVerifyPasswordCodeAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = passwordOtpCode.trim()

    if (!code) {
      toast.error("Digite o código de 6 dígitos recebido no e-mail.")
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

    setVerifyingPasswordCode(true)
    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: user?.email || "",
        token: code,
        type: "recovery"
      })

      if (otpError) throw otpError

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast.success("Senha redefinida com sucesso via código de e-mail!")
      setPasswordMode("with_current")
      setPasswordOtpCode("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Erro ao redefinir senha com código:", error)
      toast.error(error.message || "Código inválido ou expirado.")
    } finally {
      setVerifyingPasswordCode(false)
    }
  }

  const handleLogoutAccount = async () => {
    await logout()
    toast.success("Você saiu da sua conta.")
    router.push("/")
  }

  return (
    <div className="bg-gray-50/50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 max-w-5xl space-y-8">
        
        {/* NAVEGAÇÃO DE VOLTA */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-primary rounded-full">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Loja
            </Link>
          </Button>
          <Badge variant="outline" className="bg-white border-gray-200 text-gray-600 px-3 py-1 font-bold text-xs gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            Conta Segura
          </Badge>
        </div>

        {/* CARTÃO DE CABEÇALHO DO PERFIL */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left z-10">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-primary to-blue-900 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0 border-4 border-white">
              {userInitials}
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                  {userName}
                </h1>
                {user?.email === "matheusmorante002@gmail.com" && (
                  <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">Admin</Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                {user?.email}
              </p>
              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  Conta Verificada
                </span>
              </div>
            </div>
          </div>

          <div className="z-10 shrink-0">
            <Button 
              variant="outline" 
              onClick={handleLogoutAccount}
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-bold text-sm h-11 px-6 shadow-2xs"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </div>
        </div>

        {/* ABAS DE GERENCIAMENTO DE CONTA */}
        <Tabs defaultValue="nome" className="w-full space-y-6">
          <TabsList className="bg-white p-1.5 border border-gray-200 rounded-2xl w-full flex flex-wrap sm:flex-nowrap gap-1 h-auto shadow-2xs">
            <TabsTrigger 
              value="nome" 
              className="flex-1 py-3 font-extrabold text-xs sm:text-sm rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all"
            >
              <UserIcon className="h-4 w-4" />
              <span>Dados Pessoais</span>
            </TabsTrigger>

            <TabsTrigger 
              value="email" 
              className="flex-1 py-3 font-extrabold text-xs sm:text-sm rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all"
            >
              <Mail className="h-4 w-4" />
              <span>Alterar E-mail</span>
            </TabsTrigger>

            <TabsTrigger 
              value="senha" 
              className="flex-1 py-3 font-extrabold text-xs sm:text-sm rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white gap-2 transition-all"
            >
              <KeyRound className="h-4 w-4" />
              <span>Segurança & Senha</span>
            </TabsTrigger>
          </TabsList>

          {/* ── ABA 1: CONFIGURAÇÃO DE NOME ── */}
          <TabsContent value="nome">
            <Card className="border-gray-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="border-b bg-gray-50/50 p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Dados Pessoais
                </CardTitle>
                <CardDescription>
                  Atualize seu nome completo exibido no perfil e nos pedidos.
                </CardDescription>
              </CardHeader>
              
              <form onSubmit={handleUpdateName}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2 max-w-xl">
                    <Label htmlFor="fullName" className="font-bold text-gray-700">Nome Completo</Label>
                    <Input 
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                      required
                    />
                  </div>

                  <div className="space-y-2 max-w-xl">
                    <Label htmlFor="currentEmailDisplay" className="font-bold text-gray-700">E-mail Cadastrado (Somente leitura)</Label>
                    <Input 
                      id="currentEmailDisplay"
                      value={user?.email || ""}
                      disabled
                      className="h-12 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-6 border-t bg-gray-50/30 flex justify-end">
                  <Button type="submit" size="lg" className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white" disabled={updatingName}>
                    {updatingName ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações de Nome"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* ── ABA 2: ALTERAÇÃO DE E-MAIL ── */}
          <TabsContent value="email">
            <Card className="border-gray-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="border-b bg-gray-50/50 p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <Mail className="h-5 w-5 text-primary" />
                  Alterar Endereço de E-mail
                </CardTitle>
                <CardDescription>
                  {emailStep === 1 
                    ? "Passo 1: Digite o novo e-mail para receber o código de confirmação."
                    : "Passo 2: Insira o código enviado por e-mail para concluir a alteração."}
                </CardDescription>
              </CardHeader>

              {emailStep === 1 ? (
                <form onSubmit={handleRequestEmailChangeCode}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-blue-900">
                      <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold">Segurança na Alteração de E-mail:</p>
                        <p className="leading-relaxed">
                          Enviaremos um código de verificação para o seu novo endereço de e-mail. 
                          Ao confirmar, você será deslogado por segurança para realizar um novo login.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="currentEmail" className="font-bold text-gray-700">E-mail Atual</Label>
                      <Input 
                        id="currentEmail"
                        value={user?.email || ""}
                        disabled
                        className="h-12 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="newEmail" className="font-bold text-gray-700">Novo E-mail</Label>
                      <Input 
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="novo.email@exemplo.com"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="confirmEmail" className="font-bold text-gray-700">Confirme o Novo E-mail</Label>
                      <Input 
                        id="confirmEmail"
                        type="email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder="Repita o novo e-mail"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 border-t bg-gray-50/30 flex justify-end">
                    <Button type="submit" size="lg" className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white gap-2" disabled={sendingEmailCode}>
                      {sendingEmailCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando código...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Enviar Código para o Novo E-mail
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailCode}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3 text-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold">Código enviado com sucesso!</p>
                        <p className="leading-relaxed">
                          Verifique a caixa de entrada de <strong>{newEmail}</strong> e insira o código recebido abaixo.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="emailOtpCode" className="font-bold text-gray-700 flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        Código de Confirmação Recebido no E-mail
                      </Label>
                      <Input 
                        id="emailOtpCode"
                        type="text"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value)}
                        placeholder="Ex: 123456"
                        className="h-14 rounded-xl border-2 border-primary/30 bg-primary/5 focus:bg-white text-center text-2xl font-black tracking-widest text-primary"
                        required
                        maxLength={10}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 border-t bg-gray-50/30 flex items-center justify-between gap-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setEmailStep(1)}
                      className="gap-2 text-muted-foreground hover:text-gray-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Voltar / Corrigir E-mail
                    </Button>

                    <Button type="submit" size="lg" className="rounded-xl font-bold h-12 px-8 bg-green-600 hover:bg-green-700 text-white gap-2" disabled={verifyingEmailCode}>
                      {verifyingEmailCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validando código...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmar Código e Alterar E-mail
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          </TabsContent>

          {/* ── ABA 3: SEGURANÇA E SENHA (CONFIRMAÇÃO COM SENHA ATUAL OU CÓDIGO) ── */}
          <TabsContent value="senha">
            <Card className="border-gray-100 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="border-b bg-gray-50/50 p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  {passwordMode === "with_current" 
                    ? "Confirme sua senha atual para definir uma nova senha." 
                    : "Digite o código recebido no seu e-mail para redefinir sua senha."}
                </CardDescription>
              </CardHeader>

              {passwordMode === "with_current" ? (
                /* MODO A: CONFIRMAÇÃO COM SENHA ATUAL */
                <form onSubmit={handlePasswordUpdateWithCurrentPassword}>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="currentPassword" className="font-bold text-gray-700">Senha Atual</Label>
                      <Input 
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Sua senha atual"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                      />
                      <div className="pt-1">
                        <button 
                          type="button" 
                          onClick={() => {
                            setPasswordMode("forgot_code")
                            handleRequestPasswordCode()
                          }}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          Esqueceu a senha atual? Clique para enviar código ao e-mail.
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="newPassword" className="font-bold text-gray-700">Nova Senha</Label>
                      <Input 
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="confirmPassword" className="font-bold text-gray-700">Confirme a Nova Senha</Label>
                      <Input 
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                        minLength={6}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 border-t bg-gray-50/30 flex justify-end">
                    <Button type="submit" size="lg" className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white" disabled={updatingPassword}>
                      {updatingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando e salvando...
                        </>
                      ) : (
                        "Salvar Nova Senha"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                /* MODO B: CÓDIGO ENVIADO POR EMAIL (SE ESQUECEU A SENHA ATUAL) */
                <form onSubmit={handleVerifyPasswordCodeAndSave}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                      <Key className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold">Código Enviado por E-mail:</p>
                        <p className="leading-relaxed">
                          Enviamos um código de segurança para <strong>{user?.email}</strong>. Digite o código e a nova senha abaixo.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="passwordOtpCode" className="font-bold text-gray-700 flex items-center gap-2">
                        <Key className="h-4 w-4 text-primary" />
                        Código de Segurança (Recebido no e-mail)
                      </Label>
                      <Input 
                        id="passwordOtpCode"
                        type="text"
                        value={passwordOtpCode}
                        onChange={(e) => setPasswordOtpCode(e.target.value)}
                        placeholder="Ex: 123456"
                        className="h-14 rounded-xl border-2 border-primary/30 bg-primary/5 focus:bg-white text-center text-2xl font-black tracking-widest text-primary"
                        required
                        maxLength={10}
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="newPasswordCode" className="font-bold text-gray-700">Nova Senha</Label>
                      <Input 
                        id="newPasswordCode"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="confirmPasswordCode" className="font-bold text-gray-700">Confirme a Nova Senha</Label>
                      <Input 
                        id="confirmPasswordCode"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                        required
                        minLength={6}
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 border-t bg-gray-50/30 flex items-center justify-between gap-4">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setPasswordMode("with_current")}
                      className="gap-2 text-muted-foreground hover:text-gray-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Voltar e usar Senha Atual
                    </Button>

                    <Button type="submit" size="lg" className="rounded-xl font-bold h-12 px-8 bg-green-600 hover:bg-green-700 text-white gap-2" disabled={verifyingPasswordCode}>
                      {verifyingPasswordCode ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validando código...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Salvar Nova Senha com Código
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Carregando seu perfil...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  )
}
