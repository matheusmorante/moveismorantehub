import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[35%] h-[35%] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up z-10">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-500/5 p-8 sm:p-12 border border-slate-100 dark:border-slate-800 text-center">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="bi bi-hourglass-split text-3xl text-amber-500 animate-pulse"></i>
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mb-3">
            Aguardando Aprovação
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Olá <strong>{profile?.full_name || 'Usuário'}</strong>, sua conta foi criada com
            sucesso, mas o acesso ao sistema requer a aprovação de um Administrador. Por favor,
            aguarde a liberação.
          </p>

          <button
            onClick={handleLogout}
            className="w-full px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="bi bi-box-arrow-left text-lg"></i>
            Sair da Conta
          </button>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `,
        }}
      />
    </div>
  );
}
