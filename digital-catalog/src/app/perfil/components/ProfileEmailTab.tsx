'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { CheckCircle2, Key, Loader2, Mail, RotateCcw, Send, ShieldCheck } from 'lucide-react';

type EmailStep = 1 | 2;

interface ProfileEmailTabProps {
  user: { email?: string | null } | null | undefined;
  emailStep: EmailStep;
  setEmailStep: (step: EmailStep) => void;
  newEmail: string;
  setNewEmail: (email: string) => void;
  confirmEmail: string;
  setConfirmEmail: (email: string) => void;
  emailOtpCode: string;
  setEmailOtpCode: (code: string) => void;
  sendingEmailCode: boolean;
  verifyingEmailCode: boolean;
  accountInFlight: { readonly current: boolean };
  onRequestEmailChangeCode: (event: FormEvent) => void | Promise<void>;
  onVerifyEmailCode: (event: FormEvent) => void | Promise<void>;
}

export default function ProfileEmailTab({
  user,
  emailStep,
  setEmailStep,
  newEmail,
  setNewEmail,
  confirmEmail,
  setConfirmEmail,
  emailOtpCode,
  setEmailOtpCode,
  sendingEmailCode,
  verifyingEmailCode,
  accountInFlight,
  onRequestEmailChangeCode: handleRequestEmailChangeCode,
  onVerifyEmailCode: handleVerifyEmailCode,
}: ProfileEmailTabProps) {
  return (
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
  );
}
