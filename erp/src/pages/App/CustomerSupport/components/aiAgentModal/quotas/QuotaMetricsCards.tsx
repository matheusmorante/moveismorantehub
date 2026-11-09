import React from 'react';
import type { AiUsageLimitsConfig } from '../../../../../../../../shared-utils/aiUsageLimitSchemas';

export interface LiveQuotaMetrics {
  monthlyBudgetBRL: number;
  monthCostBRL: number;
  remainingMonthBudgetBRL: number;
  monthPercent: number;
  todayRequests: number;
  todayTokens: number;
  todayCostBRL: number;
  hourRequests: number;
  hourTokens: number;
  isOperatingHours: boolean;
  status: 'ALLOW' | 'BLOCKED';
  reason?: string;
}

interface QuotaMetricsCardsProps {
  metrics: LiveQuotaMetrics | null;
  currentLimits: AiUsageLimitsConfig;
}

export const QuotaMetricsCards: React.FC<QuotaMetricsCardsProps> = ({ metrics, currentLimits }) => {
  const getBudgetColor = (pct: number) => {
    if (pct >= 95) return 'text-red-600 bg-red-500';
    if (pct >= 70) return 'text-amber-600 bg-amber-500';
    return 'text-emerald-600 bg-emerald-500';
  };

  const monthPercent = metrics?.monthPercent ?? 0;
  const budgetColor = getBudgetColor(monthPercent);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Teto Mensal (R$ 30,00) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Teto Mensal</span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              monthPercent >= 95
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                : monthPercent >= 70
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}
          >
            {monthPercent.toFixed(1)}% Usado
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            R$ {(metrics?.monthCostBRL ?? 0).toFixed(2)}
            <span className="text-xs font-medium text-slate-400">
              {' '}
              / R$ {(metrics?.monthlyBudgetBRL ?? 30.0).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Saldo restante:{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              R$ {(metrics?.remainingMonthBudgetBRL ?? 30.0).toFixed(2)}
            </strong>
          </p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${budgetColor.split(' ')[1]}`}
            style={{ width: `${Math.min(100, monthPercent)}%` }}
          />
        </div>
      </div>

      {/* Consumo Hoje */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Consumo Hoje</span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            Diário
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {metrics?.todayRequests ?? 0}
            <span className="text-xs font-medium text-slate-400"> / {currentLimits.dailyMaxRequests} req</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Custo hoje:{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              R$ {(metrics?.todayCostBRL ?? 0).toFixed(2)}
            </strong>
          </p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                ((metrics?.todayRequests ?? 0) / currentLimits.dailyMaxRequests) * 100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Consumo na Última Hora */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Última Hora</span>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            Anti-Pico
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {metrics?.hourRequests ?? 0}
            <span className="text-xs font-medium text-slate-400"> / {currentLimits.hourlyMaxRequests} req</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tokens na hora:{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              {((metrics?.hourTokens ?? 0) / 1000).toFixed(1)}k
            </strong>
          </p>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(
                100,
                ((metrics?.hourRequests ?? 0) / currentLimits.hourlyMaxRequests) * 100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Janela de Horário */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Horário Ativo</span>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              metrics?.isOperatingHours
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
            }`}
          >
            {metrics?.isOperatingHours ? 'Operação Comercial' : 'Modo Noturno'}
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
            {currentLimits.operatingHours.start} às {currentLimits.operatingHours.end}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {metrics?.isOperatingHours
              ? 'Atendimento e assistente com capacidade total.'
              : 'Modo noturno ativo (cota de segurança de até 5 req/h).'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-3">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>Fuso: Brasília (America/Sao_Paulo)</span>
        </div>
      </div>
    </div>
  );
};
