import React from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getSaoPauloDayInfo,
  isValidScheduleDate,
} from '../../../../../../../shared-utils/commercialOrderRules';
import {
  DateScheduleMode,
  getBottomBorderInputClasses,
  getCardContainerClasses,
  getCardFieldLabelClasses,
  getCardIconClasses,
  getCardTitleClasses,
} from './agendamentoSessionMemory';
import { ScheduleModeToggle } from './ScheduleModeToggle';

interface ScheduledDateCardsSectionProps {
  baseId: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  isScheduleReadOnly: boolean;
  isRequired: boolean;
  effectiveDateMode: DateScheduleMode;
  dateError?: string;
  customDateValue: string;
  customRangeStartDateValue: string;
  customRangeEndDateValue: string;
  onSelectDateMode: (mode: NonNullable<DateScheduleMode>) => void;
  onCustomDateChange: (value: string) => void;
  onCustomDateRangeChange: (field: 'date' | 'endDate', value: string) => void;
}

export const ScheduledDateCardsSection = ({
  baseId,
  isExpanded,
  onToggleExpanded,
  isScheduleReadOnly,
  isRequired,
  effectiveDateMode,
  dateError,
  customDateValue,
  customRangeStartDateValue,
  customRangeEndDateValue,
  onSelectDateMode,
  onCustomDateChange,
  onCustomDateRangeChange,
}: ScheduledDateCardsSectionProps) => {
  const [isCustomDateRangeExpanded, setIsCustomDateRangeExpanded] = React.useState(
    effectiveDateMode === 'custom_date_range'
  );
  const [lastFixedDateMode, setLastFixedDateMode] = React.useState<
    Exclude<NonNullable<DateScheduleMode>, 'custom_date_range'>
  >(
    effectiveDateMode && effectiveDateMode !== 'custom_date_range'
      ? effectiveDateMode
      : 'custom_date'
  );
  const todayInfo = getSaoPauloDayInfo(0);
  const tomorrowInfo = getSaoPauloDayInfo(1);
  const customDatePanelId = `${baseId}-custom-date-panel`;
  const customDateRangePanelId = `${baseId}-custom-date-range-panel`;

  const isCustomDateSelected = effectiveDateMode === 'custom_date';
  React.useEffect(() => {
    setIsCustomDateRangeExpanded(effectiveDateMode === 'custom_date_range');
    if (effectiveDateMode && effectiveDateMode !== 'custom_date_range') {
      setLastFixedDateMode(effectiveDateMode);
    }
  }, [effectiveDateMode]);

  const isCustomDateFilled = isValidScheduleDate(customDateValue);
  const isCustomDateRangeSelected = effectiveDateMode === 'custom_date_range';
  const dateModeType = isCustomDateRangeSelected ? 'period' : 'fixed';
  const isCustomRangeStartFilled = isValidScheduleDate(customRangeStartDateValue);
  const isCustomRangeEndFilled = isValidScheduleDate(customRangeEndDateValue);
  const isCustomDateRangeFilled = isCustomRangeStartFilled && isCustomRangeEndFilled;
  const isCustomDateInvalid = Boolean(
    dateError && (isCustomDateSelected || (!effectiveDateMode && !isCustomDateRangeSelected))
  );
  const customDateInputClassName = isCustomDateSelected || isCustomDateInvalid
    ? getBottomBorderInputClasses(isCustomDateInvalid, isCustomDateFilled)
    : 'w-full border-0 border-b-2 border-slate-300 rounded-none bg-transparent px-1 py-2 text-sm font-bold text-slate-500 outline-none shadow-none focus:border-slate-400 focus:ring-0 transition-colors [color-scheme:light] dark:border-slate-600 dark:text-slate-400 dark:focus:border-slate-500 dark:[color-scheme:dark]';
  const isCustomDateRangeInvalid = Boolean(dateError && isCustomDateRangeSelected);
  const isCustomRangeStartInvalid = Boolean(
    dateError && isCustomDateRangeSelected && !isCustomRangeStartFilled
  );
  const isCustomRangeEndInvalid = Boolean(
    dateError &&
      isCustomDateRangeSelected &&
      (!isCustomRangeEndFilled ||
        (isCustomRangeStartFilled && customRangeEndDateValue < customRangeStartDateValue))
  );
  const isCustomDateRangeValid = Boolean(
    isCustomDateRangeFilled &&
      customRangeEndDateValue >= customRangeStartDateValue &&
      !isCustomRangeStartInvalid &&
      !isCustomRangeEndInvalid
  );
  const isDateSummaryDefined =
    effectiveDateMode === 'today' ||
    effectiveDateMode === 'tomorrow' ||
    (isCustomDateSelected && isCustomDateFilled && !isCustomDateInvalid) ||
    isCustomDateRangeValid;
  const selectionSummary = effectiveDateMode === 'today'
    ? `Hoje · ${todayInfo.formattedDate}`
    : effectiveDateMode === 'tomorrow'
      ? `Amanhã · ${tomorrowInfo.formattedDate}`
      : isCustomDateSelected && isCustomDateFilled
        ? customDateValue.split('-').reverse().join('/')
        : isCustomDateRangeValid
          ? `${customRangeStartDateValue.split('-').reverse().join('/')} a ${customRangeEndDateValue.split('-').reverse().join('/')}`
          : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`${baseId}-scheduled-date-content`}
          title={dateError || undefined}
          onClick={onToggleExpanded}
          className="flex min-h-10 min-w-[220px] flex-1 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <span
            className={`shrink-0 text-[13px] font-semibold ${
              dateError ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            Data programada {isRequired && <span className="text-red-500">*</span>}
          </span>
          {!isExpanded && (
            isDateSummaryDefined ? (
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
            mode={dateModeType}
            specificLabel="Específico"
            ariaLabel="Tipo de data programada"
            disabled={isScheduleReadOnly}
            onChange={(mode) => {
              if (mode === 'period' && !isCustomDateRangeSelected) {
                onSelectDateMode('custom_date_range');
              } else if (mode === 'fixed' && isCustomDateRangeSelected) {
                onSelectDateMode(lastFixedDateMode);
              }
            }}
          />
        )}
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`${baseId}-scheduled-date-content`}
          aria-label={isExpanded ? 'Recolher datas programadas' : 'Expandir datas programadas'}
          title={dateError || undefined}
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

      {isExpanded && <div id={`${baseId}-scheduled-date-content`} className="flex flex-col gap-4 animate-fade-in">
      {!isCustomDateRangeSelected && (
      <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveDateMode === 'today'}
          onClick={() => onSelectDateMode('today')}
          className={`${getCardContainerClasses(
            effectiveDateMode === 'today'
          )} flex h-full flex-col items-center justify-center px-4 py-3.5 text-center`}
        >
          <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Calendar
                className={`h-4 w-4 shrink-0 ${getCardIconClasses(
                  effectiveDateMode === 'today'
                )}`}
              />
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveDateMode === 'today'
                )}`}
              >
                Hoje
              </span>
              {effectiveDateMode === 'today' && (
                <Check
                  data-testid="card-check-today"
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
              )}
            </div>
              <span
                className={`block text-xs font-medium ${
                  effectiveDateMode === 'today'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ({todayInfo.weekday}, {todayInfo.formattedDate})
              </span>
          </div>
        </button>

        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveDateMode === 'tomorrow'}
          onClick={() => onSelectDateMode('tomorrow')}
          className={`${getCardContainerClasses(
            effectiveDateMode === 'tomorrow'
          )} flex h-full flex-col items-center justify-center px-4 py-3.5 text-center`}
        >
          <div className="flex min-w-0 flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Calendar
                className={`h-4 w-4 shrink-0 ${getCardIconClasses(
                  effectiveDateMode === 'tomorrow'
                )}`}
              />
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveDateMode === 'tomorrow'
                )}`}
              >
                Amanhã
              </span>
              {effectiveDateMode === 'tomorrow' && (
                <Check
                  data-testid="card-check-tomorrow"
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
              )}
            </div>
              <span
                className={`block text-xs font-medium ${
                  effectiveDateMode === 'tomorrow'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ({tomorrowInfo.weekday}, {tomorrowInfo.formattedDate})
              </span>
          </div>
        </button>
      <div
        data-testid="card-container-custom-date"
        onClick={() => {
          if (!isScheduleReadOnly && !isCustomDateSelected) {
            onSelectDateMode('custom_date');
          }
        }}
        className={`col-span-2 min-w-0 cursor-pointer md:col-span-1 ${getCardContainerClasses(
          isCustomDateSelected,
          isCustomDateInvalid,
          isCustomDateFilled
        )}`}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={isCustomDateSelected}
          className="w-full flex items-center justify-center px-4 py-1 text-center"
        >
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays
              className={`h-4 w-4 shrink-0 ${isCustomDateInvalid ? 'text-red-600 dark:text-red-400' : getCardIconClasses(
                isCustomDateSelected,
                isCustomDateFilled
              )}`}
            />
            <span
              className={`whitespace-nowrap text-sm font-bold ${isCustomDateInvalid ? 'text-red-600 dark:text-red-400' : getCardTitleClasses(
                isCustomDateSelected,
                isCustomDateFilled
              )}`}
            >
              Selecionar uma data
            </span>
          </div>
        </button>

        <div id={customDatePanelId} className="flex justify-center px-4 pb-2 pt-0 animate-fade-in">
          <div className="relative w-fit max-w-full">
            <input
              id={`${baseId}-custom-date-input`}
              type="date"
              disabled={isScheduleReadOnly}
              placeholder="Selecione uma data"
              aria-label="Data desejada"
              aria-invalid={isCustomDateInvalid}
              title={isCustomDateInvalid ? dateError : undefined}
              value={customDateValue}
              onChange={(e) => {
                if (!isCustomDateSelected) onSelectDateMode('custom_date');
                onCustomDateChange(e.target.value);
              }}
              className={`${customDateInputClassName} !w-[170px] max-w-full`}
            />
            {isCustomDateSelected && isCustomDateFilled && !isCustomDateInvalid && (
              <Check
                data-testid="card-check-custom-date"
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

      {isCustomDateRangeSelected && <div
        data-testid="card-container-custom-date-range"
        className={getCardContainerClasses(
          isCustomDateRangeSelected,
          isCustomDateRangeInvalid,
          isCustomDateRangeFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomDateRangeExpanded}
          aria-controls={customDateRangePanelId}
          onClick={() => {
            if (isCustomDateRangeSelected) {
              setIsCustomDateRangeExpanded((expanded) => !expanded);
              return;
            }
            onSelectDateMode('custom_date_range');
            setIsCustomDateRangeExpanded(true);
          }}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CalendarRange
              className={`w-4 h-4 shrink-0 ${isCustomDateRangeInvalid ? 'text-red-600 dark:text-red-400' : getCardIconClasses(
                isCustomDateRangeSelected,
                isCustomDateRangeFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${isCustomDateRangeInvalid ? 'text-red-600 dark:text-red-400' : getCardTitleClasses(
                isCustomDateRangeSelected,
                isCustomDateRangeFilled
              )}`}
            >
              Selecione um período de data
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomDateRangeValid && (
                <Check
                  data-testid="card-check-custom-date-range"
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                />
            )}
            {isCustomDateRangeExpanded ? (
              <ChevronUp
                  className={`w-4 h-4 ${getCardIconClasses(isCustomDateRangeSelected, isCustomDateRangeValid)}`}
                />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomDateRangeSelected && isCustomDateRangeExpanded && (
          <div
            id={customDateRangePanelId}
            className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in"
          >
            <div>
              <label
                htmlFor={`${baseId}-range-start-date-input`}
                className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                  isCustomRangeStartInvalid,
                  isCustomDateRangeFilled
                )}`}
              >
                Data inicial
              </label>
              <input
                id={`${baseId}-range-start-date-input`}
                type="date"
                disabled={isScheduleReadOnly}
                placeholder="Selecione uma data"
                aria-invalid={isCustomRangeStartInvalid}
                title={isCustomRangeStartInvalid ? dateError : undefined}
                value={customRangeStartDateValue}
                onChange={(e) => onCustomDateRangeChange('date', e.target.value)}
                className={getBottomBorderInputClasses(
                  isCustomRangeStartInvalid,
                  isCustomDateRangeFilled
                )}
              />
            </div>
            <div>
              <label
                htmlFor={`${baseId}-range-end-date-input`}
                className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                  isCustomRangeEndInvalid,
                  isCustomDateRangeFilled
                )}`}
              >
                Data final
              </label>
              <input
                id={`${baseId}-range-end-date-input`}
                type="date"
                disabled={isScheduleReadOnly}
                placeholder="Selecione uma data"
                aria-invalid={isCustomRangeEndInvalid}
                title={isCustomRangeEndInvalid ? dateError : undefined}
                value={customRangeEndDateValue}
                onChange={(e) => onCustomDateRangeChange('endDate', e.target.value)}
                className={getBottomBorderInputClasses(
                  isCustomRangeEndInvalid,
                  isCustomDateRangeFilled
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
