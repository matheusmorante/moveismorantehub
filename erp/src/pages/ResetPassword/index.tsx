import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../utils/supabaseConfig';
import { validatePasswordSetup } from '@/services/authPasswordSetup';
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

  const sendRecoveryCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage({ tone: 'error', text: 'Informe seu e-mail para continuar.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await requestPasswordRecoveryCode(supabase, trimmedEmail);
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'recovery-send') });
        return;
      }
      setStage('code');
      setMessage({
        tone: 'success',
        text: 'Se a conta estiver cadastrada, enviaremos um código para esse e-mail.',
      });
    } catch {
      setMessage({
        tone: 'error',
        text: 'Não foi possível enviar o código agora. Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyRecoveryCode = async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await verifyPasswordRecoveryCode(supabase, email, code);
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'recovery-verify') });
        return;
      }
      setCode('');
      setStage('password');
    } catch {
      setMessage({ tone: 'error', text: 'Código inválido. Confira e tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validatePasswordSetup(password, confirmation);
    if (validationError) {
      setMessage({ tone: 'error', text: validationError });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const { error } = await updateAuthenticatedPassword(supabase, password);
      if (error) {
        setMessage({ tone: 'error', text: getPasswordAuthErrorMessage(error, 'password-update') });
        return;
      }

      await supabase.auth.signOut();
      toast.success('Senha atualizada com sucesso. Entre com sua nova senha.');
      navigate('/login', { replace: true });
    } catch {
      setMessage({
        tone: 'error',
        text: 'Não foi possível atualizar a senha. Tente novamente.',
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
              onSubmit={(event) => {
                event.preventDefault();
                void sendRecoveryCode();
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
            <div className="space-y-4">
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
                type="button"
                disabled={isSubmitting || !code.trim()}
                onClick={() => void verifyRecoveryCode()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl disabled:opacity-60"
              >
                {isSubmitting ? 'Validando…' : 'Validar código'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void sendRecoveryCode()}
                className="w-full py-3 text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-60"
              >
                Reenviar código
              </button>
            </div>
          )}

          {stage === 'password' && (
            <form onSubmit={saveNewPassword} className="space-y-4">
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
            onClick={() => navigate('/login', { replace: true })}
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
