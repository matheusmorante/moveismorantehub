import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CustomerSupportRealtimeStatus } from '../../hooks/useCustomerSupportConversations';

interface NavigationRailFooterProps {
  userInitials: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  onLogout: () => void | Promise<void>;
  onOpenPolicy: () => void;
  onResetLayout?: () => void;
  isMobileViewport: boolean;
  realtimeStatus: CustomerSupportRealtimeStatus;
  onReconnectRealtime: () => void;
}

const realtimeStatusCopy: Record<CustomerSupportRealtimeStatus, { label: string; detail: string; color: string }> = {
  connected: {
    label: 'Conectada',
    detail: 'A Central está recebendo atualizações em tempo real.',
    color: 'bg-emerald-500',
  },
  reconnecting: {
    label: 'Reconectando',
    detail: 'Tentando restabelecer as atualizações em tempo real.',
    color: 'bg-amber-500',
  },
  disconnected: {
    label: 'Desconectada',
    detail: 'As atualizações automáticas podem atrasar enquanto a conexão é restabelecida.',
    color: 'bg-rose-500',
  },
};

export const NavigationRailFooter: React.FC<NavigationRailFooterProps> = ({
  userInitials,
  userName = 'Operador',
  userRole = 'Colaborador',
  userEmail,
  onLogout,
  onOpenPolicy,
  onResetLayout,
  isMobileViewport,
  realtimeStatus,
  onReconnectRealtime,
}) => {
  const [openMenu, setOpenMenu] = useState<'profile' | 'settings' | 'connection' | null>(null);
  const statusCopy = realtimeStatusCopy[realtimeStatus];
  const toggleMenu = (menu: NonNullable<typeof openMenu>) => {
    setOpenMenu((current) => current === menu ? null : menu);
  };

  return (
    <div
      className="flex flex-col items-center gap-2.5 w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpenMenu(null);
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => toggleMenu('profile')}
          title={`${userName} (${userRole}) · Sessão ativa`}
          aria-label={`Abrir menu do atendente ${userName}`}
          aria-expanded={openMenu === 'profile'}
          aria-controls="customer-support-agent-profile"
          className="relative w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-blue-700/50 hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-800"
        >
          {userInitials}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" aria-hidden="true" />
        </button>
        {openMenu === 'profile' && (
          <div id="customer-support-agent-profile" role="group" aria-label="Menu do atendente" className="absolute left-full bottom-0 z-50 ml-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{userName}</p>
              {userEmail && <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{userEmail}</p>}
              <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">Sessão autenticada · {userRole}</p>
            </div>
            <Link
              to="/profile"
              onClick={() => setOpenMenu(null)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="bi bi-person" /> Meu perfil
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                void onLogout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <i className="bi bi-box-arrow-right" /> Encerrar sessão
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => toggleMenu('settings')}
          title="Configurações e ajuda da Central"
          aria-label="Configurações e ajuda da Central"
          aria-expanded={openMenu === 'settings'}
          aria-controls="customer-support-settings"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
        >
          <i className="bi bi-gear-fill text-sm" />
        </button>
        {openMenu === 'settings' && (
          <div id="customer-support-settings" role="group" aria-label="Configurações e ajuda da Central" className="absolute left-full bottom-0 z-50 ml-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Central de Atendimento</p>
            {!isMobileViewport && onResetLayout && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onResetLayout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <i className="bi bi-arrow-clockwise" /> Restaurar layout padrão
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                onOpenPolicy();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="bi bi-shield-lock-fill text-amber-500" /> Política de envio
            </button>
            <Link
              to="/system-docs"
              onClick={() => setOpenMenu(null)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <i className="bi bi-book-half text-indigo-500" /> Ajuda e documentação
            </Link>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => toggleMenu('connection')}
          title={`Atualizações em tempo real: ${statusCopy.label}`}
          aria-label={`Detalhes da conexão em tempo real: ${statusCopy.label}`}
          aria-expanded={openMenu === 'connection'}
          aria-controls="customer-support-realtime-status"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800/50"
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            {realtimeStatus === 'connected' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusCopy.color}`} />
          </span>
        </button>
        {openMenu === 'connection' && (
          <div id="customer-support-realtime-status" role="group" aria-label="Status das atualizações da Central" className="absolute left-full bottom-0 z-50 ml-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Atualizações da Central</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{statusCopy.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{statusCopy.detail}</p>
            {realtimeStatus === 'disconnected' && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  onReconnectRealtime();
                }}
                className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Reconectar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
