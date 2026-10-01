import React from 'react';
import Shipping from '../../../types/Shipping.type';
import { ValidationErrors } from '../../../utils/validations';

interface AgendamentoProps {
  scheduling: Shipping['scheduling'];
  onChangeScheduling: (key: keyof Shipping['scheduling'], value: string | Date | boolean) => void;
  errors: ValidationErrors;
  isPickup?: boolean;
  hideSchedulingShortcuts?: boolean;
  hideNotice?: boolean;
  title?: string;
}

const Agendamento = ({
  scheduling,
  onChangeScheduling,
  errors,
  isPickup,
  hideSchedulingShortcuts,
  hideNotice,
  title,
}: AgendamentoProps) => {
  if (!scheduling) return null;
  const isImmediatePickup = Boolean(isPickup && scheduling.immediatePickup);
  const isPendingScheduling = Boolean(scheduling.pendingScheduling && !isImmediatePickup);
  const isScheduleReadOnly = isPendingScheduling || isImmediatePickup;
  const hasError = !isScheduleReadOnly && (errors['shipping_date'] || errors['shipping_time']);
  const onScheduleChange = (key: keyof Shipping['scheduling'], value: string | Date | boolean) => {
    if (key !== 'immediatePickup') onChangeScheduling('immediatePickup', false);
    onChangeScheduling(key, value);
  };

  const handleImmediatePickupToggle = () => {
    if (scheduling.immediatePickup) {
      onChangeScheduling('immediatePickup', false);
      onChangeScheduling('date', '');
      onChangeScheduling('endDate', '');
      onChangeScheduling('startTime', '');
      onChangeScheduling('endTime', '');
      return;
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const time = `${hours}:${mins}`;

    onChangeScheduling('pendingScheduling', false);
    onChangeScheduling('immediatePickup', true);
    onChangeScheduling('notInformed', false);
    onChangeScheduling('date', date);
    onChangeScheduling('endDate', '');
    onChangeScheduling('dateType', 'fixed');
    onChangeScheduling('type', 'fixed');
    onChangeScheduling('startTime', time);
    onChangeScheduling('endTime', '');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 ml-1">
        <label className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title || (isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega')}
        </label>

        {!hideSchedulingShortcuts && (
          <div
            className={`grid items-center gap-x-4 ${
              isPickup ? 'grid-cols-[max-content_max-content]' : 'grid-cols-[max-content]'
            }`}
          >
            <div
              aria-hidden={isImmediatePickup}
              className={`flex items-center gap-2 ${isImmediatePickup ? 'invisible' : ''}`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Agendamento pendente?
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isPendingScheduling}
                aria-label="Marcar agendamento como pendente"
                disabled={isImmediatePickup}
                onClick={() => {
                  const isPending = !isPendingScheduling;
                  onChangeScheduling('immediatePickup', false);
                  onChangeScheduling('pendingScheduling', isPending);
                  if (isPending) {
                    onChangeScheduling('date', '');
                    onChangeScheduling('startTime', '');
                    onChangeScheduling('notInformed', false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isPendingScheduling
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${isPendingScheduling ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {isPickup && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Retirada imediata?
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(scheduling.immediatePickup)}
                  aria-label="Retirada imediata"
                  onClick={handleImmediatePickupToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                    scheduling.immediatePickup
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${scheduling.immediatePickup ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className={`w-full transition-opacity ${isScheduleReadOnly ? 'opacity-90' : hasError ? 'text-red-500' : ''}`}
      >
        {isPendingScheduling && (
          <div className="flex items-center gap-4 py-4 px-4 bg-orange-50/50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 rounded-2xl mb-6 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <i className="bi bi-clock-history text-xl" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-[11px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest leading-none mb-1">
                Agendamento em Aberto
              </h4>
              <p className="text-[9px] font-bold text-orange-600/70 dark:text-orange-500/70 uppercase leading-tight">
                Este pedido será agendado em breve.
              </p>
            </div>
          </div>
        )}

        {!scheduling.notInformed || hideNotice ? (
          <div
            className={`flex flex-col gap-6 w-full transition-all duration-300 ${isScheduleReadOnly ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}
          >
            {/* Section 1: DATE */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                <div className="w-full sm:w-auto min-w-[140px]">
                  <select
                    disabled={isScheduleReadOnly}
                    className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                    value={scheduling.dateType || 'fixed'}
                    onChange={(e) => onScheduleChange('dateType', e.target.value as any)}
                  >
                    <option value="fixed" className="dark:bg-slate-900">
                      Data Fixa
                    </option>
                    <option value="range" className="dark:bg-slate-900">
                      Período de Data
                    </option>
                  </select>
                </div>

                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                  <div className="flex-1 relative">
                    <input
                      type="date"
                      disabled={isScheduleReadOnly}
                      className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm outline-none transition-colors dark:text-slate-300 ${errors['shipping_date'] && !isScheduleReadOnly ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'}`}
                      value={scheduling.date || ''}
                      onChange={(e) => onScheduleChange('date', e.target.value)}
                    />
                  </div>

                  {scheduling.dateType === 'range' && (
                    <>
                      <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">
                        Até
                      </span>
                      <div className="flex-1 relative">
                        <input
                          type="date"
                          disabled={isScheduleReadOnly}
                          className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm outline-none transition-colors dark:text-slate-300 ${errors['shipping_date'] && !isScheduleReadOnly ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'}`}
                          value={scheduling.endDate || ''}
                          onChange={(e) => onScheduleChange('endDate', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: TIME */}
            <div className="flex flex-col gap-3 py-4 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full py-2">
                <div className="w-full sm:w-auto min-w-[140px]">
                  <select
                    disabled={isScheduleReadOnly}
                    className="w-full bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-600 dark:text-slate-300 transition-all"
                    value={scheduling.type || 'fixed'}
                    onChange={(e) => onScheduleChange('type', e.target.value as any)}
                  >
                    <option value="fixed" className="dark:bg-slate-900">
                      Horário Fixo
                    </option>
                    <option value="range" className="dark:bg-slate-900">
                      Período de Horário
                    </option>
                  </select>
                </div>

                <div className="flex-1 flex flex-row items-center gap-3 relative group w-full">
                  <div className="flex-1 relative group/time">
                    <input
                      type="time"
                      disabled={isScheduleReadOnly}
                      className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm outline-none transition-colors dark:text-slate-300 ${errors['shipping_time'] && !isScheduleReadOnly ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'}`}
                      value={scheduling.startTime || ''}
                      onChange={(e) => onScheduleChange('startTime', e.target.value)}
                    />
                  </div>

                  {scheduling.type === 'range' && (
                    <>
                      <span className="text-[10px] font-black uppercase text-slate-300 dark:text-slate-500 tracking-widest shrink-0 px-1">
                        Até
                      </span>
                      <div className="flex-1 relative group/time">
                        <input
                          type="time"
                          disabled={isScheduleReadOnly}
                          className={`w-full border-b-2 bg-transparent px-3 py-2 text-sm outline-none transition-colors dark:text-slate-300 ${errors['shipping_time'] && !isScheduleReadOnly ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'}`}
                          value={scheduling.endTime || ''}
                          onChange={(e) => onScheduleChange('endTime', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-amber-50/50 dark:bg-amber-900/10 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500 grow-0 shrink-0">
              <i className="bi bi-exclamation-triangle-fill text-xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                Aviso de Agendamento
              </span>
              <span className="text-[11px] font-medium text-amber-600/80 dark:text-amber-500/80 uppercase tracking-tight">
                Data e horário não serão informados para esta {isPickup ? 'retirada' : 'entrega'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agendamento;
