import React from 'react';

interface NavigationRailFooterProps {
  userInitials: string;
  userName?: string;
  userRole?: string;
  onOpenPolicy: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRealtimeConnected: boolean;
}

export const NavigationRailFooter: React.FC<NavigationRailFooterProps> = ({
  userInitials,
  userName = 'Operador',
  userRole = 'Colaborador',
  onOpenPolicy,
  isLoading,
  onRefresh,
  isRealtimeConnected,
}) => {
  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      {/* Avatar do Operador Autenticado com Indicador Online */}
      <div
        title={`${userName} (${userRole})`}
        className="relative w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-blue-700/50 cursor-pointer"
      >
        {userInitials}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
      </div>

      {/* Aviso de política empresarial de envio */}
      <button
        type="button"
        onClick={onOpenPolicy}
        title="Envio de mensagens bloqueado por política da empresa"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50"
        aria-label="Política de envio da Central"
      >
        <i className="bi bi-shield-lock-fill text-sm text-amber-600 dark:text-amber-400" />
      </button>

      {/* Botão de Atualização Manual */}
      <button
        type="button"
        onClick={onRefresh}
        title="Sincronizar conversas"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        aria-label="Atualizar lista de conversas"
      >
        <i className={`bi bi-arrow-clockwise text-sm ${isLoading ? 'animate-spin' : ''}`}></i>
      </button>

      {/* Indicador Pulsante de Conexão Realtime */}
      <div
        title={
          isRealtimeConnected
            ? 'Conexão Realtime ativa (eventos instantâneos)'
            : 'Reconectando ao canal Realtime...'
        }
        className="flex items-center justify-center p-0.5"
      >
        <span className="relative flex h-2 w-2">
          {isRealtimeConnected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isRealtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </span>
      </div>
    </div>
  );
};
