import React, { useState, useRef } from 'react';
import { waitForAuthOperation } from '../../../../shared-utils/authOperationTimeout';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../utils/supabaseConfig';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import type { FieldErrors } from 'react-hook-form';
import type { z } from 'zod';
import { passwordRecoveryCodeSchema, passwordRecoveryEmailSchema, passwordSetupFormSchema } from '../../../../shared-utils/authFormSchemas';
import {
  getPasswordAuthErrorMessage,
  requestPasswordRecoveryCode,
  updateAuthenticatedPassword,
  verifyPasswordRecoveryCode,
} from '@/services/authPasswordRecovery';

type RecoveryStage = 'email' | 'code' | 'password';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [stage, setStage] = useState<RecoveryStage>('email');
  const [email, setEmail] = useState(routeEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const emailForm = useZodForm(passwordRecoveryEmailSchema, { email });
  const codeForm = useZodForm(passwordRecoveryCodeSchema, { email, code });
  const passwordForm = useZodForm(passwordSetupFormSchema, { password, confirmation });
  const recoveryInFlight = useRef(false);
  const runRecoveryOperation = async (operation: () => Promise<unknown>) => {
    if (recoveryInFlight.current) return;
    recoveryInFlight.current = true;
    try { await operation(); } finally { recoveryInFlight.current = false; }
  };
  const showValidationError = (errors: FieldErrors) => {
    setMessage({ tone: 'error', text: Object.values(flattenFormErrors(errors))[0] || 'Confira os dados informados.' });
  };

  const sendRecoveryCode = async (data: z.output<typeof passwordRecoveryEmailSchema>) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await waitForAuthOperation(requestPasswordRecoveryCode(supabase, data.email), 'erp:solicitar-recuperacao');
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'recovery-send') });
        return;
      }
      setStage('code');
      setMessage({
        tone: 'success',
        text: 'Se a conta estiver cadastrada, enviaremos um código para esse e-mail.',
      });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível enviar o código agora. Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyRecoveryCode = async (data: z.output<typeof passwordRecoveryCodeSchema>) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await waitForAuthOperation(verifyPasswordRecoveryCode(supabase, data.email, data.code), 'erp:verificar-recuperacao');
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'recovery-verify') });
        return;
      }
      setCode('');
      setStage('password');
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Código inválido. Confira e tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNewPassword = async (data: z.output<typeof passwordSetupFormSchema>) => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await waitForAuthOperation(updateAuthenticatedPassword(supabase, data.password), 'erp:redefinir-senha');
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'password-update') });
        return;
      }

      const { error: signOutError } = await waitForAuthOperation(supabase.auth.signOut(), 'erp:sair-apos-recuperacao');
      if (signOutError) throw new Error(signOutError.message);
      toast.success('Senha atualizada com sucesso. Entre com sua nova senha.');
      navigate('/login', { replace: true });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível atualizar a senha. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    stage === 'email'
      ? 'Esqueci minha senha'
      : stage === 'code'
        ? 'Digite o código'
        : 'Crie sua nova senha';
  const description =
    stage === 'email'
      ? 'Informe o e-mail da sua conta MoranteHub.'
      : stage === 'code'
        ? 'Enviamos um código para o e-mail informado.'
        : 'Escolha uma senha com pelo menos 8 caracteres.';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up z-10">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-blue-500/5 p-8 sm:p-12 border border-slate-100 dark:border-slate-800">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-white font-black text-3xl italic leading-none">M</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight text-center">
              {title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm text-center mt-3">
              {description}
            </p>
          </div>

          {message && (
            <div
              role="status"
              className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${
                message.tone === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {stage === 'email' && (
            <form
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                await runRecoveryOperation(() => emailForm.validateAndRun({ email }, sendRecoveryCode, showValidationError));
              }}
              className="space-y-5"
            >
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  E-mail
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="voce@empresa.com"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl disabled:opacity-60"
              >
                {isSubmitting ? 'Enviando…' : 'Enviar código'}
              </button>
            </form>
          )}

          {stage === 'code' && (
            <form noValidate onSubmit={async (event) => {
              event.preventDefault();
              await runRecoveryOperation(() => codeForm.validateAndRun({ email, code }, verifyRecoveryCode, showValidationError));
            }} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Código de recuperação
                </span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-slate-700 dark:text-slate-100 tracking-[0.35em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Código recebido por e-mail"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting || !code.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl disabled:opacity-60"
              >
                {isSubmitting ? 'Validando…' : 'Validar código'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void runRecoveryOperation(() => emailForm.validateAndRun({ email }, sendRecoveryCode, showValidationError))}
                className="w-full py-3 text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-60"
              >
                Reenviar código
              </button>
            </form>
          )}

          {stage === 'password' && (
            <form noValidate onSubmit={async (event) => {
              event.preventDefault();
              await runRecoveryOperation(() => passwordForm.validateAndRun({ password, confirmation }, saveNewPassword, showValidationError));
            }} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Nova senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Confirmar nova senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => { if (!recoveryInFlight.current) navigate('/login', { replace: true }); }}
            disabled={isSubmitting}
            className="w-full mt-5 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Voltar ao login
          </button>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html:
            '@keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }',
        }}
      />
    </div>
  );
};

export default ResetPassword;
