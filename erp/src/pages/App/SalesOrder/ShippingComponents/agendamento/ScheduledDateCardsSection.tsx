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

interface ScheduledDateCardsSectionProps {
  baseId: string;
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
  const todayInfo = getSaoPauloDayInfo(0);
  const tomorrowInfo = getSaoPauloDayInfo(1);
  const customDatePanelId = `${baseId}-custom-date-panel`;
  const customDateRangePanelId = `${baseId}-custom-date-range-panel`;

  const isCustomDateSelected = effectiveDateMode === 'custom_date';
  const isCustomDateFilled = isValidScheduleDate(customDateValue);
  const isCustomDateRangeSelected = effectiveDateMode === 'custom_date_range';
  const isCustomRangeStartFilled = isValidScheduleDate(customRangeStartDateValue);
  const isCustomRangeEndFilled = isValidScheduleDate(customRangeEndDateValue);
  const isCustomDateRangeFilled = isCustomRangeStartFilled && isCustomRangeEndFilled;

  const isCustomDateInvalid = Boolean(dateError && isCustomDateSelected);
  const isCustomRangeStartInvalid = Boolean(
    dateError && isCustomDateRangeSelected && !isCustomRangeStartFilled
  );
  const isCustomRangeEndInvalid = Boolean(
    dateError &&
      isCustomDateRangeSelected &&
      (!isCustomRangeEndFilled ||
        (isCustomRangeStartFilled && customRangeEndDateValue < customRangeStartDateValue))
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between ml-1">
        <span
          className={`text-xs font-black uppercase tracking-widest ${
            dateError ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          Data programada {isRequired && <span className="text-red-500">*</span>}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveDateMode === 'today'}
          onClick={() => onSelectDateMode('today')}
          className={`${getCardContainerClasses(
            effectiveDateMode === 'today'
          )} flex items-center justify-between px-4 py-3.5 text-left`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Calendar
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(effectiveDateMode === 'today')}`}
            />
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveDateMode === 'today'
                )}`}
              >
                Hoje
              </span>
              <span
                className={`text-xs font-medium ${
                  effectiveDateMode === 'today'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ({todayInfo.weekday}, {todayInfo.formattedDate})
              </span>
            </div>
          </div>
          {effectiveDateMode === 'today' && (
            <Check
              data-testid="card-check-today"
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
          )}
        </button>

        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-pressed={effectiveDateMode === 'tomorrow'}
          onClick={() => onSelectDateMode('tomorrow')}
          className={`${getCardContainerClasses(
            effectiveDateMode === 'tomorrow'
          )} flex items-center justify-between px-4 py-3.5 text-left`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Calendar
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                effectiveDateMode === 'tomorrow'
              )}`}
            />
            <div className="flex flex-col min-w-0">
              <span
                className={`text-sm font-bold leading-tight ${getCardTitleClasses(
                  effectiveDateMode === 'tomorrow'
                )}`}
              >
                Amanhã
              </span>
              <span
                className={`text-xs font-medium ${
                  effectiveDateMode === 'tomorrow'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                ({tomorrowInfo.weekday}, {tomorrowInfo.formattedDate})
              </span>
            </div>
          </div>
          {effectiveDateMode === 'tomorrow' && (
            <Check
              data-testid="card-check-tomorrow"
              className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
            />
          )}
        </button>
      </div>

      <div
        data-testid="card-container-custom-date"
        className={getCardContainerClasses(
          isCustomDateSelected,
          isCustomDateInvalid,
          isCustomDateFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomDateSelected}
          aria-controls={customDatePanelId}
          onClick={() => onSelectDateMode('custom_date')}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CalendarDays
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                isCustomDateSelected,
                isCustomDateFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${getCardTitleClasses(
                isCustomDateSelected,
                isCustomDateFilled
              )}`}
            >
              Data específica
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomDateSelected ? (
              <>
                <Check
                  data-testid="card-check-custom-date"
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomDateFilled)}`}
                />
                <ChevronUp className={`w-4 h-4 ${getCardIconClasses(true, isCustomDateFilled)}`} />
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomDateSelected && (
          <div id={customDatePanelId} className="px-4 pb-4 pt-1 animate-fade-in">
            <label
              htmlFor={`${baseId}-custom-date-input`}
              className={`block text-[11px] font-bold mb-1 ${getCardFieldLabelClasses(
                isCustomDateInvalid,
                isCustomDateFilled
              )}`}
            >
              Data desejada
            </label>
            <input
              id={`${baseId}-custom-date-input`}
              type="date"
              disabled={isScheduleReadOnly}
              placeholder="Selecione uma data"
              aria-invalid={isCustomDateInvalid}
              value={customDateValue}
              onChange={(e) => onCustomDateChange(e.target.value)}
              className={getBottomBorderInputClasses(isCustomDateInvalid, isCustomDateFilled)}
            />
          </div>
        )}
      </div>

      <div
        data-testid="card-container-custom-date-range"
        className={getCardContainerClasses(
          isCustomDateRangeSelected,
          Boolean(dateError && isCustomDateRangeSelected),
          isCustomDateRangeFilled
        )}
      >
        <button
          type="button"
          disabled={isScheduleReadOnly}
          aria-expanded={isCustomDateRangeSelected}
          aria-controls={customDateRangePanelId}
          onClick={() => onSelectDateMode('custom_date_range')}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CalendarRange
              className={`w-4 h-4 shrink-0 ${getCardIconClasses(
                isCustomDateRangeSelected,
                isCustomDateRangeFilled
              )}`}
            />
            <span
              className={`text-sm font-bold ${getCardTitleClasses(
                isCustomDateRangeSelected,
                isCustomDateRangeFilled
              )}`}
            >
              Período de data específico
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCustomDateRangeSelected ? (
              <>
                <Check
                  data-testid="card-check-custom-date-range"
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomDateRangeFilled)}`}
                />
                <ChevronUp
                  className={`w-4 h-4 ${getCardIconClasses(true, isCustomDateRangeFilled)}`}
                />
              </>
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </button>

        {isCustomDateRangeSelected && (
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
      </div>

      {dateError && (
        <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400 ml-1 mt-0.5">
          {dateError}
        </p>
      )}
    </div>
  );
};
