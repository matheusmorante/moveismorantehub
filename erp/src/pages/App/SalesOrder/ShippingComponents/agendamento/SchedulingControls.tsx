import React from 'react';

interface SchedulingControlsProps {
  title: string;
  isPickup?: boolean;
  hideSchedulingShortcuts?: boolean;
  isImmediatePickup: boolean;
  isPendingScheduling: boolean;
  scheduleMode: 'defined' | 'alternatives';
  onTogglePending: () => void;
  onToggleImmediatePickup: () => void;
  onSelectScheduleMode: (mode: 'defined' | 'alternatives') => void;
}

export const SchedulingControls: React.FC<SchedulingControlsProps> = ({
  title,
  isPickup,
  hideSchedulingShortcuts,
  isImmediatePickup,
  isPendingScheduling,
  scheduleMode,
  onTogglePending,
  onToggleImmediatePickup,
  onSelectScheduleMode,
}) => (
  <>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 ml-1">
      <label className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {title}
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
              onClick={onTogglePending}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                isPendingScheduling
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  isPendingScheduling ? 'translate-x-6' : 'translate-x-1'
                }`}
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
                aria-checked={isImmediatePickup}
                aria-label="Retirada imediata"
                onClick={onToggleImmediatePickup}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isImmediatePickup
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300 bg-slate-200 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    isImmediatePickup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>

    {!hideSchedulingShortcuts && (
      <div
        className="mb-4 ml-1 flex w-fit rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800"
        role="tablist"
        aria-label="Tipo de agendamento"
      >
        {(['defined', 'alternatives'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={scheduleMode === mode}
            onClick={() => onSelectScheduleMode(mode)}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              scheduleMode === mode
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {mode === 'defined' ? 'Data definida' : 'Datas alternativas'}
          </button>
        ))}
      </div>
    )}
  </>
);
