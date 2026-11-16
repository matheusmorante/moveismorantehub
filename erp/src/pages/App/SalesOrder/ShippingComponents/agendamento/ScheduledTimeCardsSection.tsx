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
import { ScheduleModeToggle } from './ScheduleModeToggle';

interface ScheduledTimeCardsSectionProps {
  baseId: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
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
  isExpanded,
  onToggleExpanded,
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
  const [isCustomTimeRangeExpanded, setIsCustomTimeRangeExpanded] = React.useState(
    effectiveTimeMode === 'custom_time_range'
  );
  const [lastFixedTimeMode, setLastFixedTimeMode] = React.useState<
    'morning' | 'afternoon' | 'custom_time'
  >(
    effectiveTimeMode === 'morning' || effectiveTimeMode === 'afternoon'
      ? effectiveTimeMode
      : 'custom_time'
  );
  const customTimePanelId = `${baseId}-custom-time-panel`;
  const customTimeRangePanelId = `${baseId}-custom-time-range-panel`;

  const isCustomTimeSelected = effectiveTimeMode === 'custom_time';
  React.useEffect(() => {
    setIsCustomTimeRangeExpanded(effectiveTimeMode === 'custom_time_range');
    if (
      effectiveTimeMode === 'morning' ||
      effectiveTimeMode === 'afternoon' ||
      effectiveTimeMode === 'custom_time'
    ) {
      setLastFixedTimeMode(effectiveTimeMode);
    }
  }, [effectiveTimeMode]);

  const isCustomTimeFilled = isValidScheduleTime(customTimeValue);
  const isCustomTimeRangeSelected = effectiveTimeMode === 'custom_time_range';
  const timeModeType = isCustomTimeRangeSelected ? 'period' : 'fixed';
  const isCustomRangeStartFilled = isValidScheduleTime(customRangeStartTimeValue);
  const isCustomRangeEndFilled = isValidScheduleTime(customRangeEndTimeValue);
  const isCustomTimeRangeFilled = isCustomRangeStartFilled && isCustomRangeEndFilled;
  const isCustomTimeInvalid = Boolean(
    timeError && (isCustomTimeSelected || (!effectiveTimeMode && !isCustomTimeRangeSelected))
  );
  const customTimeInputClassName = isCustomTimeSelected || isCustomTimeInvalid
    ? getBottomBorderInputClasses(isCustomTimeInvalid, isCustomTimeFilled)
    : 'w-full border-0 border-b-2 border-slate-300 rounded-none bg-transparent px-1 py-2 text-sm font-bold text-slate-500 outline-none shadow-none focus:border-slate-400 focus:ring-0 transition-colors [color-scheme:light] dark:border-slate-600 dark:text-slate-400 dark:focus:border-slate-500 dark:[color-scheme:dark]';
  const isCustomTimeRangeInvalid = Boolean(timeError && isCustomTimeRangeSelected);
  const isCustomTimeRangeStartInvalid = Boolean(
    timeError && isCustomTimeRangeSelected && !isCustomRangeStartFilled
  );
  const isCustomTimeRangeEndInvalid = Boolean(
    timeError &&
      isCustomTimeRangeSelected &&
      (!isCustomRangeEndFilled ||
        (isCustomRangeStartFilled && customRangeEndTimeValue <= customRangeStartTimeValue))
  );
  const isCustomTimeValid = isCustomTimeFilled && !isCustomTimeInvalid;
  const isCustomTimeRangeValid = Boolean(
    isCustomTimeRangeFilled &&
      customRangeEndTimeValue > customRangeStartTimeValue &&
      !isCustomTimeRangeStartInvalid &&
      !isCustomTimeRangeEndInvalid
  );
  const isTimeSummaryDefined =
    effectiveTimeMode === 'morning' ||
    effectiveTimeMode === 'afternoon' ||
    isCustomTimeValid ||
    isCustomTimeRangeValid;
  const selectionSummary = effectiveTimeMode === 'morning'
    ? 'De manhã · 09:00 às 12:00'
    : effectiveTimeMode === 'afternoon'
      ? 'À tarde · 13:00 às 18:00'
      : isCustomTimeValid
        ? customTimeValue
        : isCustomTimeRangeValid
          ? `${customRangeStartTimeValue} às ${customRangeEndTimeValue}`
          : '';

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`${baseId}-scheduled-time-content`}
          title={timeError || undefined}
          onClick={onToggleExpanded}
          className="flex min-h-10 min-w-[220px] flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <span
            className={`shrink-0 text-[13px] font-semibold ${
              timeError ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            Horário programado {isRequired && <span className="text-red-500">*</span>}
          </span>
          {!isExpanded && (
            isTimeSummaryDefined ? (
              <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectionSummary}</span>
              </span>
            ) : (
              <span className="ml-auto inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Falta definir
              </span>
            )
          )}
        </button>
        {isExpanded && (
          <ScheduleModeToggle
            mode={timeModeType}
            specificLabel="Específico"
            ariaLabel="Tipo de horário programado"
            disabled={isScheduleReadOnly}
            onChange={(mode) => {
              if (mode === 'period' && !isCustomTimeRangeSelected) {
                onSelectTimeMode('custom_time_range');
              } else if (mode === 'fixed' && isCustomTimeRangeSelected) {
                onSelectTimeMode(lastFixedTimeMode);
              }
            }}
          />
        )}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`${baseId}-scheduled-time-content`}
          aria-label={isExpanded ? 'Recolher horários programados' : 'Expandir horários programados'}
          title={timeError || undefined}
          onClick={onToggleExpanded}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {isExpanded && <div id={`${baseId}-scheduled-time-content`} className="flex flex-col gap-4 animate-fade-in">
      {!isCustomTimeRangeSelected && (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveTimeMode === 'morning'}
          onClick={() => onSelectTimeMode('morning')}
          className={`${getCardContainerClasses(
            effectiveTimeMode === 'morning'
          )} flex h-full items-center justify-center px-4 py-3.5 text-center`}
        >
          <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Sun
                className={`h-4 w-4 shrink-0 ${getCardIconClasses(effectiveTimeMode === 'morning')}`}
              />
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveTimeMode === 'morning'
                )}`}
              >
                De manhã
              </span>
              {effectiveTimeMode === 'morning' && (
                <Check
                  data-testid="card-check-morning"
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
              )}
            </div>
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
        </button>

        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveTimeMode === 'afternoon'}
          onClick={() => onSelectTimeMode('afternoon')}
          className={`${getCardContainerClasses(
            effectiveTimeMode === 'afternoon'
          )} flex h-full items-center justify-center px-4 py-3.5 text-center`}
        >
          <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Sunset
                className={`h-4 w-4 shrink-0 ${getCardIconClasses(
                  effectiveTimeMode === 'afternoon'
                )}`}
              />
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveTimeMode === 'afternoon'
                )}`}
              >
                À tarde
              </span>
              {effectiveTimeMode === 'afternoon' && (
                <Check
                  data-testid="card-check-afternoon"
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
              )}
            </div>
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
        </button>
      <div
        data-testid="card-container-custom-time"
        onClick={() => {
          if (!isScheduleReadOnly && !isCustomTimeSelected) {
            onSelectTimeMode('custom_time');
          }
        }}
        className={`min-w-0 cursor-pointer ${getCardContainerClasses(
          isCustomTimeSelected,
          isCustomTimeInvalid,
          isCustomTimeFilled
        )}`}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={isCustomTimeSelected}
          className="w-full flex items-center justify-center px-4 py-1 text-center"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Clock
              className={`w-4 h-4 shrink-0 ${isCustomTimeInvalid ? 'text-red-600 dark:text-red-400' : getCardIconClasses(
                isCustomTimeSelected,
                isCustomTimeFilled
              )}`}
            />
            <span
              className={`whitespace-nowrap text-sm font-bold ${isCustomTimeInvalid ? 'text-red-600 dark:text-red-400' : getCardTitleClasses(
                isCustomTimeSelected,
                isCustomTimeFilled
              )}`}
            >
              Selecionar horário
            </span>
          </div>
        </button>

        <div id={customTimePanelId} className="flex justify-center px-4 pb-2 pt-0 animate-fade-in">
          <div className="relative w-fit max-w-full">
            <input
              id={`${baseId}-custom-time-input`}
              type="time"
              disabled={isScheduleReadOnly}
              placeholder="HH:mm"
              aria-label="Horário desejado"
              aria-invalid={isCustomTimeInvalid}
              title={isCustomTimeInvalid ? timeError : undefined}
              value={customTimeValue}
              onChange={(e) => {
                if (!isCustomTimeSelected) onSelectTimeMode('custom_time');
                onCustomTimeChange(e.target.value);
              }}
              className={`${customTimeInputClassName} !w-[145px] max-w-full`}
            />
            {isCustomTimeSelected && isCustomTimeValid && (
              <Check
                data-testid="card-check-custom-time"
                aria-hidden="true"
                className="pointer-events-none absolute right-7 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
              />
            )}
          </div>
        </div>
      </div>
      </div>
      </>
      )}

      {isCustomTimeRangeSelected && <div
        data-testid="card-container-custom-time-range"
        className={getCardContainerClasses(
          isCustomTimeRangeSelected,
          isCustomTimeRangeInvalid,
          isCustomTimeRangeFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomTimeRangeExpanded}
          aria-controls={customTimeRangePanelId}
          onClick={() => {
            if (isCustomTimeRangeSelected) {
              setIsCustomTimeRangeExpanded((expanded) => !expanded);
              return;
            }
            onSelectTimeMode('custom_time_range');
            setIsCustomTimeRangeExpanded(true);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Clock
              className={`w-4 h-4 shrink-0 ${isCustomTimeRangeInvalid ? 'text-red-600 dark:text-red-400' : getCardIconClasses(
                isCustomTimeRangeSelected,
                isCustomTimeRangeFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${isCustomTimeRangeInvalid ? 'text-red-600 dark:text-red-400' : getCardTitleClasses(
                isCustomTimeRangeSelected,
                isCustomTimeRangeFilled
              )}`}
            >
              Selecione um período de horário
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomTimeRangeValid && (
              <Check
                data-testid="card-check-custom-time-range"
                className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              />
            )}
            {isCustomTimeRangeExpanded ? (
              <ChevronUp
                className={`w-4 h-4 ${getCardIconClasses(isCustomTimeRangeSelected, isCustomTimeRangeValid)}`}
              />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomTimeRangeSelected && isCustomTimeRangeExpanded && (
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
                title={isCustomTimeRangeStartInvalid ? timeError : undefined}
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
                title={isCustomTimeRangeEndInvalid ? timeError : undefined}
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
      </div>}

      </div>}
    </div>
  );
};
