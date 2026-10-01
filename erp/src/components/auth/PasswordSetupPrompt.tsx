import { type FormEvent, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { validatePasswordSetup } from '@/services/authPasswordSetup';

export const PasswordSetupPrompt = () => {
  const location = useLocation();
  const { user, passwordCredentialStatus, createPasswordCredential, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  if (location.pathname === '/reset-password' || !user || passwordCredentialStatus !== 'required') {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePasswordSetup(password, confirmation);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      await createPasswordCredential(password, confirmation);
      setPassword('');
      setConfirmation('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível criar a senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="password-setup-title"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-9"
        role="dialog"
      >
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <i className="bi bi-shield-lock text-xl" aria-hidden="true" />
        </div>

        <h2 id="password-setup-title" className="text-xl font-black text-slate-900 dark:text-white">
          Crie sua senha de acesso
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Cadastre uma senha para também poder entrar sem o Google.
        </p>
        {user.email && (
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
            {user.email}
          </p>
        )}

        <form id="password-setup-form" className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nova senha
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Confirmar senha
            <input
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              minLength={8}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
        </form>

        {message && (
          <p aria-live="polite" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            form="password-setup-form"
            type="submit"
          >
            {isSubmitting ? 'Salvando…' : 'Criar senha'}
          </button>
          <button
            className="w-full rounded-xl px-4 py-3 font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => void logout()}
            type="button"
          >
            Sair da conta
          </button>
        </div>
      </section>
    </div>
  );
};
