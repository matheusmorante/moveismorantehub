import React from 'react';
import { FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';

interface NavigationRailFooterProps {
  userInitials: string;
  userName?: string;
  userRole?: string;
  unreadCountTotal: number;
  usageInfo: FreeTierUsageInfo | null;
  onOpenUsageModal: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  isRealtimeConnected: boolean;
}

export const NavigationRailFooter: React.FC<NavigationRailFooterProps> = ({
  userInitials,
  userName = 'Operador',
  userRole = 'Colaborador',
  unreadCountTotal,
  usageInfo,
  onOpenUsageModal,
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

      {/* Notificação / Bell */}
      <button
        type="button"
        title="Notificações da Central"
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
      >
        <i className="bi bi-bell-fill text-sm"></i>
        {unreadCountTotal > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {/* Indicador de Consumo da Franquia Meta (1.000 mensagens) */}
      <button
        type="button"
        onClick={onOpenUsageModal}
        title={
          usageInfo?.reconciliationStatus === 'unconfirmed'
            ? 'Franquia Meta: Consumo não confirmado (clique para detalhes)'
            : `Consumo da franquia gratuita: ${usageInfo?.serviceMessagesCount || 0}/1.000 msgs (${usageInfo?.percentageUsed || 0}%)`
        }
        className="relative w-8 h-8 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        aria-label="Ver consumo da franquia Meta"
      >
        <i className="bi bi-speedometer2 text-sm text-emerald-600 dark:text-emerald-400"></i>
        {usageInfo && usageInfo.reconciliationStatus !== 'unconfirmed' && (
          <div className="w-5 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mt-0.5 overflow-hidden">
            <div
              className={`h-full ${
                usageInfo.alertLevel === 'exceeded'
                  ? 'bg-red-500'
                  : usageInfo.alertLevel === 'danger'
                    ? 'bg-orange-500'
                    : usageInfo.alertLevel === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usageInfo.percentageUsed, 100)}%` }}
            />
          </div>
        )}
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
