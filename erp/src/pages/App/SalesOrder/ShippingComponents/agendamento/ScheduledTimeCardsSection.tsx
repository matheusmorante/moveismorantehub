import React from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Sun, Sunset } from 'lucide-react';
import { isValidScheduleTime } from '../../../../../../../shared-utils/commercialOrderRules';
import {
  TimeScheduleMode,
  getBottomBorderInputClasses,
  getCardContainerClasses,
  getCardFieldLabelClasses,
  getCardIconClasses,
  getCardTitleClasses,
} from './agendamentoSessionMemory';

interface ScheduledTimeCardsSectionProps {
  baseId: string;
  isScheduleReadOnly: boolean;
  isRequired: boolean;
  effectiveTimeMode: TimeScheduleMode;
  timeError?: string;
  customTimeValue: string;
  customRangeStartTimeValue: string;
  customRangeEndTimeValue: string;
  onSelectTimeMode: (mode: NonNullable<TimeScheduleMode>) => void;
  onCustomTimeChange: (value: string) => void;
  onCustomTimeRangeChange: (field: 'startTime' | 'endTime', value: string) => void;
}

export const ScheduledTimeCardsSection = ({
  baseId,
  isScheduleReadOnly,
  isRequired,
  effectiveTimeMode,
  timeError,
  customTimeValue,
  customRangeStartTimeValue,
  customRangeEndTimeValue,
  onSelectTimeMode,
  onCustomTimeChange,
  onCustomTimeRangeChange,
}: ScheduledTimeCardsSectionProps) => {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const customTimePanelId = `${baseId}-custom-time-panel`;
  const customTimeRangePanelId = `${baseId}-custom-time-range-panel`;

  const isCustomTimeSelected = effectiveTimeMode === 'custom_time';
  const isCustomTimeFilled = isValidScheduleTime(customTimeValue);
  const isCustomTimeRangeSelected = effectiveTimeMode === 'custom_time_range';
  const isCustomRangeStartFilled = isValidScheduleTime(customRangeStartTimeValue);
  const isCustomRangeEndFilled = isValidScheduleTime(customRangeEndTimeValue);
  const isCustomTimeRangeFilled = isCustomRangeStartFilled && isCustomRangeEndFilled;
  const selectionSummary = effectiveTimeMode === 'morning'
    ? 'Manhã · 09:00 às 12:00'
    : effectiveTimeMode === 'afternoon'
      ? 'Tarde · 13:00 às 18:00'
      : effectiveTimeMode === 'custom_time'
        ? customTimeValue ? `Horário específico · ${customTimeValue}` : 'Horário específico não definido'
        : effectiveTimeMode === 'custom_time_range'
          ? customRangeStartTimeValue && customRangeEndTimeValue
            ? `${customRangeStartTimeValue} às ${customRangeEndTimeValue}`
            : 'Período de horário não definido'
          : 'Horário não definido';

  const isCustomTimeInvalid = Boolean(timeError && isCustomTimeSelected);
  const isCustomTimeRangeStartInvalid = Boolean(
    timeError && isCustomTimeRangeSelected && !isCustomRangeStartFilled
  );
  const isCustomTimeRangeEndInvalid = Boolean(
    timeError &&
      isCustomTimeRangeSelected &&
      (!isCustomRangeEndFilled ||
        (isCustomRangeStartFilled && customRangeEndTimeValue <= customRangeStartTimeValue))
  );

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`${baseId}-scheduled-time-content`}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <span
          className={`text-xs font-black uppercase tracking-widest ${
            timeError ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Horário programado {isRequired && <span className="text-red-500">*</span>}
        </span>
        <span className="ml-auto truncate text-xs font-medium text-slate-500 dark:text-slate-400">{selectionSummary}</span>
        {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {isExpanded && <div id={`${baseId}-scheduled-time-content`} className="flex flex-col gap-3 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveTimeMode === 'morning'}
          onClick={() => onSelectTimeMode('morning')}
          className={`${getCardContainerClasses(
            effectiveTimeMode === 'morning'
          )} flex items-center justify-between px-4 py-3.5 text-left`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sun
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(effectiveTimeMode === 'morning')}`}
            />
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveTimeMode === 'morning'
                )}`}
              >
                Manhã
              </span>
              <span
                className={`text-xs font-medium ${
                  effectiveTimeMode === 'morning'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                (09:00 às 12:00)
              </span>
            </div>
          </div>
          {effectiveTimeMode === 'morning' && (
            <Check
              data-testid="card-check-morning"
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
          )}
        </button>

        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveTimeMode === 'afternoon'}
          onClick={() => onSelectTimeMode('afternoon')}
          className={`${getCardContainerClasses(
            effectiveTimeMode === 'afternoon'
          )} flex items-center justify-between px-4 py-3.5 text-left`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sunset
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                effectiveTimeMode === 'afternoon'
              )}`}
            />
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveTimeMode === 'afternoon'
                )}`}
              >
                Tarde
              </span>
              <span
                className={`text-xs font-medium ${
                  effectiveTimeMode === 'afternoon'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                (13:00 às 18:00)
              </span>
            </div>
          </div>
          {effectiveTimeMode === 'afternoon' && (
            <Check
              data-testid="card-check-afternoon"
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
          )}
        </button>
      </div>

      <div
        data-testid="card-container-custom-time"
        className={getCardContainerClasses(
          isCustomTimeSelected,
          isCustomTimeInvalid,
          isCustomTimeFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomTimeSelected}
          aria-controls={customTimePanelId}
          onClick={() => onSelectTimeMode('custom_time')}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Clock
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                isCustomTimeSelected,
                isCustomTimeFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${getCardTitleClasses(
                isCustomTimeSelected,
                isCustomTimeFilled
              )}`}
            >
              Horário específico
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomTimeSelected ? (
              <>
                <Check
                  data-testid="card-check-custom-time"
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomTimeFilled)}`}
                />
                <ChevronUp className={`w-4 h-4 ${getCardIconClasses(true, isCustomTimeFilled)}`} />
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomTimeSelected && (
          <div id={customTimePanelId} className="px-4 pb-4 pt-1 animate-fade-in">
            <label
              htmlFor={`${baseId}-custom-time-input`}
              className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                isCustomTimeInvalid,
                isCustomTimeFilled
              )}`}
            >
              Horário desejado
            </label>
            <input
              id={`${baseId}-custom-time-input`}
              type="time"
              disabled={isScheduleReadOnly}
              placeholder="HH:mm"
              aria-invalid={isCustomTimeInvalid}
              value={customTimeValue}
              onChange={(e) => onCustomTimeChange(e.target.value)}
              className={getBottomBorderInputClasses(isCustomTimeInvalid, isCustomTimeFilled)}
            />
          </div>
        )}
      </div>

      <div
        data-testid="card-container-custom-time-range"
        className={getCardContainerClasses(
          isCustomTimeRangeSelected,
          Boolean(timeError && isCustomTimeRangeSelected),
          isCustomTimeRangeFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomTimeRangeSelected}
          aria-controls={customTimeRangePanelId}
          onClick={() => onSelectTimeMode('custom_time_range')}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Clock
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                isCustomTimeRangeSelected,
                isCustomTimeRangeFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${getCardTitleClasses(
                isCustomTimeRangeSelected,
                isCustomTimeRangeFilled
              )}`}
            >
              Período de horário específico
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomTimeRangeSelected ? (
              <>
                <Check
                  data-testid="card-check-custom-time-range"
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomTimeRangeFilled)}`}
                />
                <ChevronUp
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomTimeRangeFilled)}`}
                />
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomTimeRangeSelected && (
          <div
            id={customTimeRangePanelId}
            className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in"
          >
            <div>
              <label
                htmlFor={`${baseId}-range-start-time-input`}
                className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                  isCustomTimeRangeStartInvalid,
                  isCustomTimeRangeFilled
                )}`}
              >
                Horário inicial
              </label>
              <input
                id={`${baseId}-range-start-time-input`}
                type="time"
                disabled={isScheduleReadOnly}
                placeholder="HH:mm"
                aria-invalid={isCustomTimeRangeStartInvalid}
                value={customRangeStartTimeValue}
                onChange={(e) => onCustomTimeRangeChange('startTime', e.target.value)}
                className={getBottomBorderInputClasses(
                  isCustomTimeRangeStartInvalid,
                  isCustomTimeRangeFilled
                )}
              />
            </div>
            <div>
              <label
                htmlFor={`${baseId}-range-end-time-input`}
                className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                  isCustomTimeRangeEndInvalid,
                  isCustomTimeRangeFilled
                )}`}
              >
                Horário final
              </label>
              <input
                id={`${baseId}-range-end-time-input`}
                type="time"
                disabled={isScheduleReadOnly}
                placeholder="HH:mm"
                aria-invalid={isCustomTimeRangeEndInvalid}
                value={customRangeEndTimeValue}
                onChange={(e) => onCustomTimeRangeChange('endTime', e.target.value)}
                className={getBottomBorderInputClasses(
                  isCustomTimeRangeEndInvalid,
                  isCustomTimeRangeFilled
                )}
              />
            </div>
          </div>
        )}
      </div>

      {timeError && (
        <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 ml-1 mt-0.5">
          {timeError}
        </p>
      )}
      </div>}
    </div>
  );
};
