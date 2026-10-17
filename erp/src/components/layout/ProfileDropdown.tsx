import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProfileDropdown() {
  const { user, profile, logout, isAdmin } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleProfileMouseEnter = () => {
    if (profileCloseTimeoutRef.current) {
      clearTimeout(profileCloseTimeoutRef.current);
      profileCloseTimeoutRef.current = null;
    }
    setIsProfileMenuOpen(true);
  };

  const handleProfileMouseLeave = () => {
    if (profileCloseTimeoutRef.current) {
      clearTimeout(profileCloseTimeoutRef.current);
    }
    profileCloseTimeoutRef.current = setTimeout(() => {
      setIsProfileMenuOpen(false);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (profileCloseTimeoutRef.current) {
        clearTimeout(profileCloseTimeoutRef.current);
      }
    };
  }, []);

  const avatarInitial =
    profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U';
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div
      className="relative"
      onMouseEnter={handleProfileMouseEnter}
      onMouseLeave={handleProfileMouseLeave}
    >
      <button
        onClick={() => setIsProfileMenuOpen((prev) => !prev)}
        aria-expanded={isProfileMenuOpen}
        aria-haspopup="menu"
        aria-label="Menu do usuário"
        className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-blue-500/20">
          {avatarInitial}
        </div>
        <div className="hidden md:flex flex-col text-left mr-1">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight max-w-[120px] truncate">
            {displayName}
          </span>
        </div>
        <i
          className={`bi bi-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
            isProfileMenuOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {isProfileMenuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-premium-hover border border-slate-100 dark:border-slate-800 p-2 transition-all z-[99999] animate-slide-up"
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
              {profile?.full_name || 'Usuário'}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {isAdmin ? 'Administrador' : 'Colaborador'}
            </span>
          </div>

          <div className="p-2 space-y-1">
            <Link
              to="/profile"
              onClick={() => setIsProfileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
            >
              <i className="bi bi-person text-base"></i>
              Meu Perfil
            </Link>

            <Link
              to="/system-docs"
              onClick={() => setIsProfileMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
            >
              <i className="bi bi-book-half text-base text-indigo-500"></i>
              Documentação do Sistema
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <i className="bi bi-gear-fill text-base"></i>
                  Configurações do ERP
                </Link>
                <Link
                  to="/acessos-e-usuarios"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <i className="bi bi-shield-lock-fill text-base text-blue-500"></i>
                  Gerenciar Cargos de Usuários
                </Link>
                <Link
                  to="/finance/dashboard"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <i className="bi bi-bank2 text-lg"></i>
                  Financeiro e Rede
                </Link>

                <a
                  href="https://drive.google.com/file/d/1UfEAzpIbgAYA6hG-fx7w7Ja73uXEVE74/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all shadow-sm group"
                >
                  <i className="bi bi-android2 text-blue-400"></i>
                  <span>Baixar App Android</span>
                </a>
              </>
            )}
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-4"></div>

          <button
            onClick={() => {
              setIsProfileMenuOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-4 p-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-[1.5rem] transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer"
          >
            <i className="bi bi-box-arrow-right text-lg"></i>
            Encerrar Sessão
          </button>
        </div>
      )}
    </div>
  );
}
