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
  const isConfirmed = usageInfo.reconciliationStatus === 'meta_confirmed';
  const isUnconfirmed = usageInfo.reconciliationStatus === 'unconfirmed';

  // Cor da barra de progresso baseada nos alertas da Meta
  let barColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  let statusText = 'Normal';

  if (usageInfo.alertLevel === 'exceeded') {
    barColor = 'bg-red-500';
    badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300';
    statusText = 'Limite Atingido (1.000)';
  } else if (usageInfo.alertLevel === 'danger') {
    barColor = 'bg-orange-500';
    badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';
    statusText = 'Alerta aos 900+';
  } else if (usageInfo.alertLevel === 'warning') {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    statusText = 'Atenção acima de 800';
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg">
              <i className="bi bi-speedometer2"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Franquia Gratuita de Mensagens
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Regras oficiais da WhatsApp Business Platform (Meta)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* Metadados e Critérios */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Período Vigente
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
              {isConfirmed
                ? 'Meta Confirmada'
                : isUnconfirmed
                  ? 'Consumo não confirmado'
                  : 'Estimativa Local'}
            </span>
          </div>
        </div>

        {/* Card Principal de Consumo */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Mensagens de Serviço
              </span>
              {isUnconfirmed ? (
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  Consumo não confirmado
                </span>
              ) : (
                <div className="flex items-baseline">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {count}
                  </span>
                  <span className="text-xs text-slate-400 ml-1.5 font-semibold">
                    / {limit} gratuitas
                  </span>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
              {statusText}
            </span>
          </div>

          {/* Barra de Progresso */}
          {!isUnconfirmed && (
            <>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
                <div
                  className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>Consumo: {percentage}%</span>
                <span>Saldo disponível: {balance} msgs</span>
              </div>
            </>
          )}
        </div>

        {/* Informações de Regra da Meta */}
        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-start gap-2.5 mb-5">
          <i className="bi bi-shield-lock-fill text-blue-600 dark:text-blue-400 text-base mt-0.5 shrink-0"></i>
          <div>
            <strong className="block font-bold mb-0.5">Política de Custo Zero Mandatória</strong>
            <p className="text-[11px] leading-relaxed text-blue-800/90 dark:text-blue-300">
              Desde 1º de outubro de 2026, respostas corporativas na API do WhatsApp são tarifadas
              pela Meta após as primeiras 1.000 mensagens de serviço. O MoranteHub opera em modo de
              leitura e recebimento estrito, garantindo custo zero absoluto para a empresa.
            </p>
          </div>
        </div>

        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
