'use client';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { accountNameFormSchema, accountEmailChangeFormSchema, catalogPasswordReauthenticationFormSchema } from '@/shared-utils/accountFormSchemas';
import { passwordRecoveryEmailSchema, passwordRecoveryCodeSchema, catalogPasswordRecoveryFormSchema } from '@/shared-utils/authFormSchemas';

import { useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { waitForAuthOperation } from '@/shared-utils/authOperationTimeout';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Loader2,
  Send,
  Lock,
  UserCheck,
  ArrowLeft,
  Key,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

function ProfileContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  // Form states - Name
  const [nameDraft, setNameDraft] = useState<{ userId: string; value: string } | null>(null);
  const fullName = nameDraft && nameDraft.userId === user?.id ? nameDraft.value : user?.user_metadata?.full_name || '';
  const setFullName = (value: string) => setNameDraft({ userId: user?.id || '', value });
  const [updatingName, setUpdatingName] = useState(false);

  // Form states - Email (Etapas 1 e 2)
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);

  // Form states - Password (Modos: 'with_current' | 'forgot_code')
  const [passwordMode, setPasswordMode] = useState<'with_current' | 'forgot_code'>('with_current');

  // Modo A: Digitar Senha Atual + Nova Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Modo B: Esqueci a senha atual (Código via E-mail)
  const [passwordOtpCode, setPasswordOtpCode] = useState('');
  const [sendingPasswordCode, setSendingPasswordCode] = useState(false);
  const [verifyingPasswordCode, setVerifyingPasswordCode] = useState(false);

  const nameForm = useZodForm(accountNameFormSchema, { fullName });
  const emailForm = useZodForm(accountEmailChangeFormSchema, { email: newEmail, confirmation: confirmEmail });
  const emailCodeForm = useZodForm(passwordRecoveryCodeSchema, { email: newEmail, code: emailOtpCode });
  const currentPasswordForm = useZodForm(catalogPasswordReauthenticationFormSchema, { email: user?.email || '', password: newPassword, confirmation: confirmPassword, currentPassword });
  const passwordEmailForm = useZodForm(passwordRecoveryEmailSchema, { email: user?.email || '' });
  const passwordCodeForm = useZodForm(catalogPasswordRecoveryFormSchema, { email: user?.email || '', code: passwordOtpCode, password: newPassword, confirmation: confirmPassword });
  const accountInFlight = useRef(false);
  const runAccountOperation = async (operation: () => Promise<unknown>) => {
    if (accountInFlight.current) return;
    accountInFlight.current = true;
    try { await operation(); } finally { accountInFlight.current = false; }
  };

  if (!authLoading && !user) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm">
            Você precisa estar conectado à sua conta para visualizar e alterar suas configurações de
            perfil.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full px-8 font-bold">
          <Link href="/auth/login">Fazer Login</Link>
        </Button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium text-sm">Carregando seu perfil...</p>
      </div>
    );
  }

  const userName = fullName || user?.user_metadata?.full_name || user?.email || 'Usuário';
  const userInitials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'U';

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAccountOperation(() => nameForm.validateAndRun({ fullName }, async (validated) => {
      setUpdatingName(true);
      try {
        const { error } = await waitForAuthOperation(supabase.auth.updateUser({
          data: { full_name: validated.fullName },
        }), 'perfil:nome');
        if (error) throw new Error(error.message);
        toast.success('Nome atualizado com sucesso!');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar o nome.');
      } finally {
        setUpdatingName(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handleRequestEmailChangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAccountOperation(() => emailForm.validateAndRun({ email: newEmail, confirmation: confirmEmail }, async (validated) => {
      if (validated.email === user?.email?.trim().toLowerCase()) {
        toast.error('O novo e-mail é idêntico ao e-mail atual.');
        return;
      }
      setSendingEmailCode(true);
      try {
        const { error } = await waitForAuthOperation(supabase.auth.updateUser({ email: validated.email }), 'perfil:solicitar-email');
        if (error) throw new Error(error.message);
        toast.success('Código/link de confirmação enviado para ' + validated.email + '! Insira o código recebido abaixo.');
        setEmailStep(2);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar código de verificação.');
      } finally {
        setSendingEmailCode(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAccountOperation(() => emailCodeForm.validateAndRun({ email: newEmail, code: emailOtpCode }, async (validated) => {
      setVerifyingEmailCode(true);
      try {
        const payload = { email: validated.email.toLowerCase(), token: validated.code };
        const { error } = await waitForAuthOperation(supabase.auth.verifyOtp({ ...payload, type: 'email_change' }), 'perfil:verificar-email');
        if (error) {
          // Preserve the provider's existing alternative only after a confirmed response.
          const alternative = await waitForAuthOperation(supabase.auth.verifyOtp({ ...payload, type: 'email' }), 'perfil:verificar-email-alternativo');
          if (alternative.error) throw new Error(error.message);
        }
        toast.success('E-mail verificado e alterado com sucesso! Redirecionando para login...');
        const result = await waitForAuthOperation(logout(), 'perfil:sair-apos-email');
        if (result?.error) throw new Error(result.error.message);
        router.push('/auth/login?email_updated=true');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Código inválido ou expirado. Tente novamente.');
      } finally {
        setVerifyingEmailCode(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handlePasswordUpdateWithCurrentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAccountOperation(() => currentPasswordForm.validateAndRun({ email: user?.email || '', password: newPassword, confirmation: confirmPassword, currentPassword }, async (validated) => {
      setUpdatingPassword(true);
      try {
        const { error: authError } = await waitForAuthOperation(supabase.auth.signInWithPassword({
          email: validated.email, password: validated.currentPassword,
        }), 'perfil:confirmar-senha-atual');
        if (authError) throw new Error('A senha atual digitada está incorreta.');
        const { error: updateError } = await waitForAuthOperation(supabase.auth.updateUser({ password: validated.password }), 'perfil:alterar-senha');
        if (updateError) throw new Error(updateError.message);
        toast.success('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar a senha.');
      } finally {
        setUpdatingPassword(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handleRequestPasswordCode = async () => {
    await runAccountOperation(() => passwordEmailForm.validateAndRun({ email: user?.email || '' }, async (validated) => {
      setPasswordMode('forgot_code');
      setSendingPasswordCode(true);
      try {
        const { error } = await waitForAuthOperation(supabase.auth.resetPasswordForEmail(validated.email), 'perfil:solicitar-codigo-senha');
        if (error) throw new Error(error.message);
        toast.success('Código enviado para ' + validated.email + '! Insira o código e defina sua nova senha.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao enviar código.');
      } finally {
        setSendingPasswordCode(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handleVerifyPasswordCodeAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAccountOperation(() => passwordCodeForm.validateAndRun({ email: user?.email || '', code: passwordOtpCode, password: newPassword, confirmation: confirmPassword }, async (validated) => {
      setVerifyingPasswordCode(true);
      try {
        const { error: otpError } = await waitForAuthOperation(supabase.auth.verifyOtp({
          email: validated.email, token: validated.code, type: 'recovery',
        }), 'perfil:verificar-codigo-senha');
        if (otpError) throw new Error(otpError.message);
        const { error: updateError } = await waitForAuthOperation(supabase.auth.updateUser({ password: validated.password }), 'perfil:redefinir-senha');
        if (updateError) throw new Error(updateError.message);
        toast.success('Senha redefinida com sucesso via código de e-mail!');
        setPasswordMode('with_current');
        setPasswordOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Código inválido ou expirado.');
      } finally {
        setVerifyingPasswordCode(false);
      }
    }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0])));
  };

  const handleLogoutAccount = async () => {
    await runAccountOperation(async () => {
      try {
        const result = await waitForAuthOperation(logout(), 'perfil:sair');
        if (result?.error) throw new Error(result.error.message);
        toast.success('Você saiu da sua conta.');
        router.push('/');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível sair da conta.');
      }
    });
  };

  return (
    <div className="bg-gray-50/50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 sm:px-8 md:px-12 max-w-5xl space-y-8">
        {/* NAVEGAÇÃO DE VOLTA */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            asChild
            className="gap-2 text-muted-foreground hover:text-primary rounded-full"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a Loja
            </Link>
          </Button>
          <Badge
            variant="outline"
            className="bg-white border-gray-200 text-gray-600 px-3 py-1 font-bold text-xs gap-1.5"
          >
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
                {user?.email === 'matheusmorante002@gmail.com' && (
                  <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase">
                    Admin
                  </Badge>
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

              <form noValidate onSubmit={handleUpdateName}>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2 max-w-xl">
                    <Label htmlFor="fullName" className="font-bold text-gray-700">
                      Nome Completo
                    </Label>
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
                    <Label htmlFor="currentEmailDisplay" className="font-bold text-gray-700">
                      E-mail Cadastrado (Somente leitura)
                    </Label>
                    <Input
                      id="currentEmailDisplay"
                      value={user?.email || ''}
                      disabled
                      className="h-12 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-6 border-t bg-gray-50/30 flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white"
                    disabled={updatingName}
                  >
                    {updatingName ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações de Nome'
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
                    ? 'Passo 1: Digite o novo e-mail para receber o código de confirmação.'
                    : 'Passo 2: Insira o código enviado por e-mail para concluir a alteração.'}
                </CardDescription>
              </CardHeader>

              {emailStep === 1 ? (
                <form noValidate onSubmit={handleRequestEmailChangeCode}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-blue-900">
                      <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold">Segurança na Alteração de E-mail:</p>
                        <p className="leading-relaxed">
                          Enviaremos um código de verificação para o seu novo endereço de e-mail. Ao
                          confirmar, você será deslogado por segurança para realizar um novo login.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="currentEmail" className="font-bold text-gray-700">
                        E-mail Atual
                      </Label>
                      <Input
                        id="currentEmail"
                        value={user?.email || ''}
                        disabled
                        className="h-12 rounded-xl bg-gray-100 text-gray-500 font-semibold cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="newEmail" className="font-bold text-gray-700">
                        Novo E-mail
                      </Label>
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
                      <Label htmlFor="confirmEmail" className="font-bold text-gray-700">
                        Confirme o Novo E-mail
                      </Label>
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
                    <Button
                      type="submit"
                      size="lg"
                      className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white gap-2"
                      disabled={sendingEmailCode}
                    >
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
                <form noValidate onSubmit={handleVerifyEmailCode}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3 text-green-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold">Código enviado com sucesso!</p>
                        <p className="leading-relaxed">
                          Verifique a caixa de entrada de <strong>{newEmail}</strong> e insira o
                          código recebido abaixo.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label
                        htmlFor="emailOtpCode"
                        className="font-bold text-gray-700 flex items-center gap-2"
                      >
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
                      onClick={() => { if (!accountInFlight.current) setEmailStep(1); }}
                      disabled={verifyingEmailCode}
                      className="gap-2 text-muted-foreground hover:text-gray-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Voltar / Corrigir E-mail
                    </Button>

                    <Button
                      type="submit"
                      size="lg"
                      className="rounded-xl font-bold h-12 px-8 bg-green-600 hover:bg-green-700 text-white gap-2"
                      disabled={verifyingEmailCode}
                    >
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
                  {passwordMode === 'with_current'
                    ? 'Confirme sua senha atual para definir uma nova senha.'
                    : 'Digite o código recebido no seu e-mail para redefinir sua senha.'}
                </CardDescription>
              </CardHeader>

              {passwordMode === 'with_current' ? (
                /* MODO A: CONFIRMAÇÃO COM SENHA ATUAL */
                <form noValidate onSubmit={handlePasswordUpdateWithCurrentPassword}>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="currentPassword" className="font-bold text-gray-700">
                        Senha Atual
                      </Label>
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
                          onClick={handleRequestPasswordCode}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          Esqueceu a senha atual? Clique para enviar código ao e-mail.
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label htmlFor="newPassword" className="font-bold text-gray-700">
                        Nova Senha
                      </Label>
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
                      <Label htmlFor="confirmPassword" className="font-bold text-gray-700">
                        Confirme a Nova Senha
                      </Label>
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
                    <Button
                      type="submit"
                      size="lg"
                      className="rounded-xl font-bold h-12 px-8 bg-primary hover:bg-primary/90 text-white"
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validando e salvando...
                        </>
                      ) : (
                        'Salvar Nova Senha'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              ) : (
                /* MODO B: CÓDIGO ENVIADO POR EMAIL (SE ESQUECEU A SENHA ATUAL) */
                <form noValidate onSubmit={handleVerifyPasswordCodeAndSave}>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                      <Key className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs sm:text-sm">
                        <p className="font-bold flex items-center gap-2">
                          {sendingPasswordCode && <Loader2 className="h-4 w-4 animate-spin" />}
                          {sendingPasswordCode ? 'Enviando código...' : 'Recuperação por E-mail:'}
                        </p>
                        <p className="leading-relaxed">
                          Confirme sua identidade com o código recebido em <strong>{user?.email}</strong>.
                          Digite o código e a nova senha abaixo.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 max-w-xl">
                      <Label
                        htmlFor="passwordOtpCode"
                        className="font-bold text-gray-700 flex items-center gap-2"
                      >
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
                      <Label htmlFor="newPasswordCode" className="font-bold text-gray-700">
                        Nova Senha
                      </Label>
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
                      <Label htmlFor="confirmPasswordCode" className="font-bold text-gray-700">
                        Confirme a Nova Senha
                      </Label>
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
                      onClick={() => { if (!accountInFlight.current) setPasswordMode('with_current'); }}
                      disabled={sendingPasswordCode || verifyingPasswordCode}
                      className="gap-2 text-muted-foreground hover:text-gray-900"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Voltar e usar Senha Atual
                    </Button>

                    <Button
                      type="submit"
                      size="lg"
                      className="rounded-xl font-bold h-12 px-8 bg-green-600 hover:bg-green-700 text-white gap-2"
                      disabled={sendingPasswordCode || verifyingPasswordCode}
                    >
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
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium text-sm">Carregando seu perfil...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
