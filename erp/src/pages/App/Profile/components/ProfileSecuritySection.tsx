import React from 'react';

interface ProfileSecuritySectionProps {
  currentPasswordRequired: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordReauthRequired: boolean;
  passwordReauthCode: string;
  loading: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordReauthCodeChange: (value: string) => void;
  onResendCode: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const ProfileSecuritySection: React.FC<ProfileSecuritySectionProps> = ({
  currentPasswordRequired,
  currentPassword,
  newPassword,
  confirmPassword,
  passwordReauthRequired,
  passwordReauthCode,
  loading,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onPasswordReauthCodeChange,
  onResendCode,
  onSubmit,
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
        <i className="bi bi-shield-lock-fill text-amber-600 text-xl"></i>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
          Segurança da Conta
        </h3>
        <p className="text-xs text-slate-400 font-bold italic">
          Gerencie sua senha de acesso.
        </p>
      </div>
    </div>

    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentPasswordRequired && (
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              Senha atual
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCurrentPasswordChange(e.target.value)
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
            Nova Senha
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onNewPasswordChange(e.target.value)
            }
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
            Confirmar Senha
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onConfirmPasswordChange(e.target.value)
            }
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>
        {passwordReauthRequired && (
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              Código de confirmação
            </label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={passwordReauthCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPasswordReauthCodeChange(e.target.value.replace(/\s/g, ''))
              }
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Código enviado por e-mail"
            />
            <button
              type="button"
              disabled={loading}
              onClick={onResendCode}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Reenviar código
            </button>
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !newPassword || !confirmPassword}
        className="w-full mt-4 py-4 bg-slate-800 dark:bg-slate-700 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : passwordReauthRequired ? (
          'Confirmar e alterar senha'
        ) : (
          'Alterar senha'
        )}
      </button>
    </form>
  </div>
);
