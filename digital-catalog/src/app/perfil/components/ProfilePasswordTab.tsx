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
import { CheckCircle2, Key, KeyRound, Loader2, RotateCcw } from 'lucide-react';

type PasswordMode = 'with_current' | 'forgot_code';

interface ProfilePasswordTabProps {
  passwordMode: PasswordMode;
  email?: string | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordOtpCode: string;
  sendingPasswordCode: boolean;
  verifyingPasswordCode: boolean;
  updatingPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordOtpCodeChange: (value: string) => void;
  onRequestPasswordCode: () => void | Promise<void>;
  onUpdateWithCurrentPassword: (event: FormEvent) => void | Promise<void>;
  onVerifyCodeAndSave: (event: FormEvent) => void | Promise<void>;
  onReturnToCurrentPassword: () => void;
}

export default function ProfilePasswordTab({
  passwordMode,
  email,
  currentPassword,
  newPassword,
  confirmPassword,
  passwordOtpCode,
  sendingPasswordCode,
  verifyingPasswordCode,
  updatingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordOtpCodeChange,
  onRequestPasswordCode,
  onUpdateWithCurrentPassword,
  onVerifyCodeAndSave,
  onReturnToCurrentPassword,
}: ProfilePasswordTabProps) {
  return (
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
          <form noValidate onSubmit={onUpdateWithCurrentPassword}>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2 max-w-xl">
                <Label htmlFor="currentPassword" className="font-bold text-gray-700">
                  Senha Atual
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => onCurrentPasswordChange(event.target.value)}
                  placeholder="Sua senha atual"
                  className="h-12 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-base font-semibold"
                  required
                />
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onRequestPasswordCode}
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
                  onChange={(event) => onNewPasswordChange(event.target.value)}
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
                  onChange={(event) => onConfirmPasswordChange(event.target.value)}
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
          <form noValidate onSubmit={onVerifyCodeAndSave}>
            <CardContent className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                <Key className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-bold flex items-center gap-2">
                    {sendingPasswordCode && <Loader2 className="h-4 w-4 animate-spin" />}
                    {sendingPasswordCode ? 'Enviando código...' : 'Recuperação por E-mail:'}
                  </p>
                  <p className="leading-relaxed">
                    Confirme sua identidade com o código recebido em <strong>{email}</strong>.
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
                  onChange={(event) => onPasswordOtpCodeChange(event.target.value)}
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
                  onChange={(event) => onNewPasswordChange(event.target.value)}
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
                  onChange={(event) => onConfirmPasswordChange(event.target.value)}
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
                onClick={onReturnToCurrentPassword}
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
  );
}
