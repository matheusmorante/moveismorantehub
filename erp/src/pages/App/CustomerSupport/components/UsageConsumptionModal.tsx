import React from 'react';
import { FreeTierUsageInfo } from '@/pages/utils/customerSupport/freeTierTracker';

interface UsageConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageInfo: FreeTierUsageInfo | null;
}

export const UsageConsumptionModal: React.FC<UsageConsumptionModalProps> = ({
  isOpen,
  onClose,
  usageInfo,
}) => {
  if (!isOpen || !usageInfo) return null;

  const count = usageInfo.serviceMessagesCount;
  const limit = usageInfo.freeTierLimit;
  const balance = usageInfo.availableBalance;
  const percentage = usageInfo.percentageUsed;

  // Cor da barra de progresso baseada nos alertas da Meta
  let barColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  let statusText = 'Normal';

  if (usageInfo.alertLevel === 'exceeded') {
    barColor = 'bg-red-500';
    badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
    statusText = 'Limite Gratuito Atingido (1.000)';
  } else if (usageInfo.alertLevel === 'danger') {
    barColor = 'bg-orange-500';
    badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
    statusText = 'Alerta de Proximidade do Limite (900+)';
  } else if (usageInfo.alertLevel === 'warning') {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    statusText = 'Atenção (800+)';
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              <i className="bi bi-speedometer2"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Consumo de Mensagens
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Franquia gratuita oficial da WhatsApp Cloud API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Período e Metadados */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Período Mensal
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {usageInfo.displayPeriod}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Estado de Conciliação
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
              {usageInfo.reconciliationStatus === 'meta_confirmed'
                ? 'Meta Confirmada'
                : 'Estimativa Local'}
            </span>
          </div>
        </div>

        {/* Medidor e Barra de Progresso */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {count}
              </span>
              <span className="text-xs text-slate-400 ml-1">/ {limit} msgs</span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
              {statusText}
            </span>
          </div>

          {/* Barra */}
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
            <div
              className={`h-full ${barColor} transition-all duration-500 rounded-full`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>Utilizado: {percentage}%</span>
            <span>Saldo restante: {balance} msgs</span>
          </div>
        </div>

        {/* Alerta de 900+ */}
        {count >= 900 && (
          <div className="mb-4 p-3 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-orange-900 dark:text-orange-200 text-xs flex items-center gap-2.5">
            <i className="bi bi-exclamation-triangle-fill text-orange-500 text-base shrink-0"></i>
            <div>
              <strong className="block">Atenção Crítica: Proximidade do Limite</strong>
              <span>
                A franquia gratuita de 1.000 mensagens de serviço está próxima de esgotar.
              </span>
            </div>
          </div>
        )}

        {/* Alerta de Bloqueio Ativo (Custo Zero Garantido) */}
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5 mb-5">
          <i className="bi bi-shield-check text-blue-600 dark:text-blue-400 text-base mt-0.5 shrink-0"></i>
          <div>
            <strong className="block font-bold mb-0.5">Segurança de Custo Zero Ativa</strong>
            <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300">
              Conforme a política da Meta vigente desde 1º de outubro de 2026, mensagens de serviço
              são faturadas individualmente após as primeiras 1.000 mensais por número. Para garantir
              custo zero absoluto, todos os disparos de saída permanecem estritamente bloqueados nesta
              versão.
            </p>
          </div>
        </div>

        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};
