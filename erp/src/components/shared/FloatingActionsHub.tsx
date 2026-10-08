import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { roleLabel, SYSTEM_ROLES } from '@/pages/utils/accessRoles';

export default function FloatingActionsHub() {
  const { isRealAdministrator, activeRoleMode, setActiveRoleMode } = useAuth();
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [showRoleOptions, setShowRoleOptions] = useState(false);

  const handleOpenAgent = () => {
    window.dispatchEvent(new CustomEvent('morante:open-agent'));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3">
      {isRealAdministrator && (
        <div
          className="relative group"
          data-testid="admin-management-container"
        >
          {!isManagementOpen && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap flex items-center gap-2 transform translate-x-2 group-hover:translate-x-0">
              <span className="text-xs font-black text-white">Gerenciamento</span>
              <i className="bi bi-shield-lock-fill text-amber-300" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsManagementOpen((open) => !open)}
            aria-label="Gerenciamento administrativo"
            aria-expanded={isManagementOpen}
            data-testid="admin-management-toggle"
            className={`relative flex h-12 w-12 items-center justify-center rounded-full border shadow-xl transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-amber-400/30 ${activeRoleMode ? 'border-amber-300 bg-amber-500 text-white' : 'border-white bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300'}`}
            title="Gerenciamento administrativo"
          >
            <i className="bi bi-person-gear text-xl" />
            {activeRoleMode && (
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-500 dark:border-slate-900" />
            )}
          </button>

          {isManagementOpen && (
            <div
              role="dialog"
              aria-label="Gerenciamento administrativo"
              className="absolute bottom-full right-0 mb-3 max-h-[70vh] w-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="mb-3 border-b border-slate-100 px-2 pb-3 dark:border-slate-800">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Gerenciamento
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ferramentas exclusivas do administrador
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRoleOptions((show) => !show)}
                aria-expanded={showRoleOptions}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <i className="bi bi-person-badge-fill" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Trocar modo de uso
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                    Usar o ERP conforme outro cargo
                  </span>
                </span>
                <i
                  className={`bi bi-chevron-down text-[10px] text-slate-400 transition-transform ${showRoleOptions ? 'rotate-180' : ''}`}
                />
              </button>

              {showRoleOptions && (
                <div className="mt-2 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
                  {SYSTEM_ROLES.filter(([role]) => role !== 'administrator').map(([role]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setActiveRoleMode(role);
                        setIsManagementOpen(false);
                      }}
                      aria-pressed={activeRoleMode === role}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${activeRoleMode === role ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    >
                      Modo {roleLabel(role)}
                      {activeRoleMode === role && <i className="bi bi-check2 text-amber-600" />}
                    </button>
                  ))}
                </div>
              )}

              {activeRoleMode && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveRoleMode(null);
                    setIsManagementOpen(false);
                  }}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
                >
                  <i className="bi bi-person-x-fill" />
                  Encerrar modo {roleLabel(activeRoleMode)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botão Flutuante do Agente Seu Lizandro */}
      <div className="relative group" data-testid="assistant-container">
        {/* Tooltip elegante à esquerda */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap flex items-center gap-2 transform translate-x-2 group-hover:translate-x-0">
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-white leading-tight">Seu Lizandro</span>
            <span className="text-[10px] font-semibold text-indigo-300 dark:text-indigo-400">
              Agente IA do ERP
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* Botão Principal com Avatar do Seu Lizandro */}
        <button
          onClick={handleOpenAgent}
          data-testid="assistant-toggle"
          aria-label="Abrir chat do Seu Lizandro, Agente Inteligente do ERP"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full p-0.5 sm:p-1 bg-gradient-to-tr from-indigo-600 via-blue-500 to-amber-400 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-400/30"
          title="Falar com Seu Lizandro (Agente IA)"
        >
          {/* Container interno da imagem */}
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-inner flex items-center justify-center">
            <img
              src="/lizandro.png"
              alt="Seu Lizandro - Agente IA"
              className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                // Fallback para seu-lizandro.jpg caso lizandro.png falhe
                const target = e.currentTarget;
                if (!target.src.endsWith('seu-lizandro.jpg')) {
                  target.src = '/seu-lizandro.jpg';
                }
              }}
            />
          </div>

          {/* Badge / Ponto de Status Online */}
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-sm flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          </span>
        </button>
      </div>
    </div>
  );
}
