import React from 'react';
import type { CharacteristicsQuotaStats } from '../../hooks/useAiCharacteristicsQuota';

export interface CharacteristicsQuotaBarProps {
  readonly stats: CharacteristicsQuotaStats;
  readonly isMinuteLimitReached: boolean;
  readonly isHourlyLimitReached: boolean;
  readonly isBlocked: boolean;
}

export const CharacteristicsQuotaBar: React.FC<CharacteristicsQuotaBarProps> = ({
  stats,
  isMinuteLimitReached,
  isHourlyLimitReached,
  isBlocked,
}) => {
  return (
    <>
      <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <i className="bi bi-speedometer2 text-slate-400" />
            Consumo:
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            Hoje: <strong className="text-slate-800 dark:text-slate-200">{stats.usedToday}</strong> / {stats.limitToday}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-600 dark:text-slate-400">
            Último minuto:{' '}
            <strong
              className={
                isMinuteLimitReached
                  ? 'text-red-500 font-bold'
                  : 'text-slate-800 dark:text-slate-200'
              }
            >
              {stats.usedMinute}
            </strong>{' '}
            / {stats.limitMinute}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-600 dark:text-slate-400">
            Última hora: <strong className={isHourlyLimitReached ? 'text-red-500 font-bold' : 'text-slate-800 dark:text-slate-200'}>{stats.usedHour}</strong> / {stats.limitHour}
          </span>
        </div>
        {(isMinuteLimitReached || isHourlyLimitReached) && (
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
            <i className="bi bi-exclamation-triangle-fill" />
            {isMinuteLimitReached ? 'Cota por minuto atingida' : 'Cota horária atingida'}
          </span>
        )}
      </div>

      {isBlocked && (
        <div
          role="alert"
          className="mx-6 mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2.5"
        >
          <i className="bi bi-shield-x text-base text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong>Limite de segurança atingido.</strong>
            <p className="mt-0.5 text-red-700 dark:text-red-300">
              {isMinuteLimitReached
                ? `O teto de ${stats.limitMinute} requisições por minuto foi atingido. Aguarde antes de fazer outra análise.`
                : isHourlyLimitReached
                  ? `O teto de ${stats.limitHour} requisições por hora foi atingido. Aguarde alguns minutos para fazer novas análises.`
                  : `O teto diário de ${stats.limitToday} requisições foi atingido hoje.`}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
