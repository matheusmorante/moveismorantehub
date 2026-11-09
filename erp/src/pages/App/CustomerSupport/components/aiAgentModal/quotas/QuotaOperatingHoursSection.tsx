import React from 'react';
import type { UseFormRegister } from 'react-hook-form';
import type { AiUsageLimitsConfig } from '../../../../../../../shared-utils/aiUsageLimitSchemas';

interface QuotaOperatingHoursSectionProps {
  register: UseFormRegister<AiUsageLimitsConfig>;
  isAdministrator: boolean;
  watchedOperatingHoursEnabled?: boolean;
  watchedAllowOffHours?: boolean;
}

export const QuotaOperatingHoursSection: React.FC<QuotaOperatingHoursSectionProps> = ({
  register,
  isAdministrator,
  watchedOperatingHoursEnabled,
  watchedAllowOffHours,
}) => {
  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Horário de Atendimento da IA (Cota Noturna & Segurança)
          </h6>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Restringe o horário em que o assistente responde livremente para evitar abusos na madrugada.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            disabled={!isAdministrator}
            {...register('operatingHours.enabled')}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
        </label>
      </div>

      {watchedOperatingHoursEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="space-y-1">
            <label htmlFor="ai-op-start" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Início do Atendimento
            </label>
            <input
              id="ai-op-start"
              type="time"
              disabled={!isAdministrator}
              {...register('operatingHours.start')}
              className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="ai-op-end" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Término do Atendimento
            </label>
            <input
              id="ai-op-end"
              type="time"
              disabled={!isAdministrator}
              {...register('operatingHours.end')}
              className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
              Permitir Cota Noturna
            </label>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdministrator}
                {...register('operatingHours.allowOffHoursEmergency')}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">Sim (emergência)</span>
            </label>
          </div>

          {watchedAllowOffHours && (
            <div className="space-y-1">
              <label htmlFor="ai-off-max" className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Máx Noturno (req/hora)
              </label>
              <input
                id="ai-off-max"
                type="number"
                min="1"
                max="20"
                disabled={!isAdministrator}
                {...register('operatingHours.offHoursHourlyMaxRequests', { valueAsNumber: true })}
                className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
