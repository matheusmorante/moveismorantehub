import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SchedulingControlsProps {
  title: string;
  isPickup?: boolean;
  hideSchedulingShortcuts?: boolean;
  isImmediatePickup: boolean;
  isPendingScheduling: boolean;
  headerActions?: React.ReactNode;
  onTogglePending: () => void;
  onToggleImmediatePickup: () => void;
  isPrimaryExpanded?: boolean;
  onTogglePrimary?: () => void;
}

export const SchedulingControls: React.FC<SchedulingControlsProps> = ({
  title,
  isPickup,
  hideSchedulingShortcuts,
  isImmediatePickup,
  isPendingScheduling,
  headerActions,
  onTogglePending,
  onToggleImmediatePickup,
  isPrimaryExpanded,
  onTogglePrimary,
}) => (
  <>
    {(title || headerActions || !hideSchedulingShortcuts) && <div className={`flex flex-wrap items-center gap-3 mb-4 ${onTogglePrimary
      ? 'w-full border-b border-slate-200 pb-2 dark:border-slate-700'
      : 'ml-1 justify-between'
    }`}>
      {title && onTogglePrimary ? (
        <button type="button" aria-expanded={isPrimaryExpanded} onClick={onTogglePrimary} className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg py-2 text-left text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white">
          <span>{title}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isPrimaryExpanded ? 'rotate-180' : ''}`} />
        </button>
      ) : title ? (
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {title}
        </label>
      ) : null}

      {headerActions}

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
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
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
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
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
    </div>}

  </>
);
