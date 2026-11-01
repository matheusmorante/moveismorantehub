import React, { useRef } from 'react';

interface ProfileSidebarCardProps {
  avatarUrl?: string | null;
  fullName?: string | null;
  role?: string | null;
  uploading: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void | Promise<void>;
}

export default function ProfileSidebarCard({
  avatarUrl,
  fullName,
  role,
  uploading,
  onAvatarChange,
  onLogout,
}: ProfileSidebarCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="md:col-span-1">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
        <div className="relative inline-block mb-6">
          <div className="w-32 h-32 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <i className="bi bi-person-fill text-5xl text-blue-300"></i>
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-all border-4 border-white dark:border-slate-900"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="bi bi-camera-fill text-sm"></i>
            )}
          </button>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            accept="image/*"
            onChange={onAvatarChange}
          />
        </div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          {fullName || 'Usuário'}
        </h2>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-1">
          {role}
        </p>

        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 space-y-3">
          <a
            href="https://drive.google.com/file/d/1UfEAzpIbgAYA6hG-fx7w7Ja73uXEVE74/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all text-xs"
          >
            <i className="bi bi-android2 text-base"></i>
            Baixar App Android Oficial
          </a>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-20 h-20 bg-white p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
              <img
                src="/mobile-qrcode.png"
                alt="QR Code Instalação Mobile"
                className="w-full h-full object-contain rounded-md"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Instale no Celular
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
                Aponte a Câmera
              </span>
              <span className="text-[9px] text-slate-400 mt-1">
                QR Code direto para o APK v1.0.2
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-3 bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            <i className="bi bi-box-arrow-right"></i>
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}
