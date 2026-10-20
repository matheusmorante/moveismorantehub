import React from 'react';
import { formatToBRDate } from '../../../utils/formatters';
import { resolveEffectiveSchedule } from '../../../../../../shared-utils/commercialOrderRules';

export interface SchedulingSectionProps {
  scheduling: any;
  isPickup?: boolean;
}

export const SchedulingSection: React.FC<SchedulingSectionProps> = ({
  scheduling,
  isPickup,
}) => {
  const isPending = Boolean(scheduling?.pendingScheduling && !scheduling?.immediatePickup);
  const resolution = resolveEffectiveSchedule(scheduling);
  const primary = resolution.primary;
  const alternatives = resolution.alternatives;
  const isUsingAlternative = resolution.isUsingAlternative;
  const effective = resolution.effective;

  return (
    <section>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
        <i className="bi bi-clock-fill" />{' '}
        {isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega'}
      </h3>

      {isPending ? (
        <div className="flex items-center gap-3 animate-pulse">
          <i className="bi bi-clock-history text-xl text-orange-500 dark:text-orange-400" />
          <div>
            <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none mb-0.5">
              Aguardando Agendamento
            </p>
            <p className="text-[10px] font-semibold text-orange-500/80 dark:text-orange-500/70 uppercase">
              Data e hora serão definidos em breve
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {isUsingAlternative && effective && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[10px] font-bold w-fit">
              <i className="bi bi-arrow-repeat" />
              <span>Programação definida venceu — reposicionado para {effective.label}</span>
            </div>
          )}

          {/* Programação Principal / Definida */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Data Definida
            </span>
            <span className="text-sm font-black text-blue-700 dark:text-blue-400">
              {primary?.formattedDate ||
                (scheduling?.date
                  ? `${formatToBRDate(scheduling.date)}${
                      scheduling.dateType === 'range' && scheduling.endDate
                        ? ` até ${formatToBRDate(scheduling.endDate)}`
                        : ''
                    }`
                  : 'Não informado')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
              Horário Definido
            </span>
            <span className="text-sm font-black text-blue-700 dark:text-blue-400">
              {primary?.formattedTime ||
                scheduling?.startTime ||
                scheduling?.time ||
                'Não informado'}
              {scheduling?.type === 'range' && scheduling?.endTime && !primary?.formattedTime
                ? ` → ${scheduling.endTime}`
                : ''}
            </span>
          </div>

          {/* Datas Alternativas Informativas */}
          {alternatives.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Datas Alternativas Combinadas:
              </span>
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                    isUsingAlternative && effective?.id === alt.id
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-bold dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="font-bold">{alt.label}:</span>
                  <span>{alt.formattedSummary}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
