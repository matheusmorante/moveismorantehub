import React, { useEffect, useId, useRef, useState } from 'react';
import Shipping from '../../../types/Shipping.type';
import { ValidationErrors } from '../../../utils/validations';
import {
  AFTERNOON_SHIFT,
  MORNING_SHIFT,
  extractScheduleTimes,
  getSaoPauloDayInfo,
  normalizeScheduleDate,
} from '../../../../../../shared-utils/commercialOrderRules';
import {
  DateScheduleMode,
  SchedulingSessionMemory,
  TimeScheduleMode,
  buildSchedulingSignature,
  createEmptySchedulingSessionMemory,
  deriveSchedulingSessionMemory,
  resolveEffectiveDateMode,
  resolveEffectiveTimeMode,
  resolveSummaryDateText,
  resolveSummaryTimeText,
} from './agendamento/agendamentoSessionMemory';
import { ScheduledDateCardsSection } from './agendamento/ScheduledDateCardsSection';
import { ScheduledTimeCardsSection } from './agendamento/ScheduledTimeCardsSection';

export {
  createEmptySchedulingSessionMemory,
  deriveSchedulingSessionMemory,
  type DateScheduleMode,
  type SchedulingSessionMemory,
  type TimeScheduleMode,
};

interface AgendamentoProps {
  scheduling: Shipping['scheduling'];
  onChangeScheduling: (key: keyof Shipping['scheduling'], value: string | Date | boolean) => void;
  errors: ValidationErrors;
  isPickup?: boolean;
  hideSchedulingShortcuts?: boolean;
  hideNotice?: boolean;
  title?: string;
  sessionMemoryRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
}

const Agendamento = ({
  scheduling,
  onChangeScheduling,
  errors,
  isPickup,
  hideSchedulingShortcuts,
  hideNotice,
  title,
  sessionMemoryRef,
}: AgendamentoProps) => {
  const fallbackMemoryRef = useRef<SchedulingSessionMemory | null>(null);
  const activeMemoryRef = sessionMemoryRef || fallbackMemoryRef;
  const baseId = useId();

  if (!activeMemoryRef.current || !activeMemoryRef.current.initialized) {
    activeMemoryRef.current = deriveSchedulingSessionMemory(scheduling);
  }

  const [, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick((prev) => prev + 1);

  const currentSignature = buildSchedulingSignature(scheduling);

  useEffect(() => {
    const mem = activeMemoryRef.current;
    if (!mem) return;

    if (mem.lastHydratedSignature !== currentSignature) {
      const hasExternalData = Boolean(
        normalizeScheduleDate(scheduling?.date) ||
          normalizeScheduleDate(scheduling?.endDate) ||
          extractScheduleTimes(scheduling || {}).startTime ||
          extractScheduleTimes(scheduling || {}).endTime
      );
      if (hasExternalData && mem.dateMode === null && mem.timeMode === null) {
        activeMemoryRef.current = deriveSchedulingSessionMemory(scheduling);
        forceRender();
      } else {
        mem.lastHydratedSignature = currentSignature;
      }
    }
  }, [currentSignature, scheduling, activeMemoryRef]);

  if (!scheduling) return null;

  const memory = activeMemoryRef.current!;
  const isImmediatePickup = Boolean(isPickup && scheduling.immediatePickup);
  const isPendingScheduling = Boolean(scheduling.pendingScheduling && !isImmediatePickup);
  const isScheduleReadOnly = isPendingScheduling || isImmediatePickup;
  const dateError = !isScheduleReadOnly ? errors['shipping_date'] : undefined;
  const timeError = !isScheduleReadOnly ? errors['shipping_time'] : undefined;

  const updateScheduleField = (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean
  ) => {
    if (key !== 'immediatePickup') onChangeScheduling('immediatePickup', false);
    onChangeScheduling(key, value);
  };

  const effectiveDateMode = resolveEffectiveDateMode(memory, scheduling, dateError);
  const effectiveTimeMode = resolveEffectiveTimeMode(memory, scheduling);

  const handleSelectDateMode = (mode: NonNullable<DateScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.dateMode = mode;

    if (mode === 'today') {
      updateScheduleField('dateType', 'fixed');
      updateScheduleField('date', getSaoPauloDayInfo(0).isoDate);
      updateScheduleField('endDate', '');
    } else if (mode === 'tomorrow') {
      updateScheduleField('dateType', 'fixed');
      updateScheduleField('date', getSaoPauloDayInfo(1).isoDate);
      updateScheduleField('endDate', '');
    } else if (mode === 'custom_date') {
      updateScheduleField('dateType', 'fixed');
      updateScheduleField('date', memory.customDate);
      updateScheduleField('endDate', '');
    } else if (mode === 'custom_date_range') {
      updateScheduleField('dateType', 'range');
      updateScheduleField('date', memory.customRangeStartDate);
      updateScheduleField('endDate', memory.customRangeEndDate);
    }

    forceRender();
  };

  const handleCustomDateChange = (value: string) => {
    memory.dateMode = 'custom_date';
    memory.customDate = value;
    updateScheduleField('dateType', 'fixed');
    updateScheduleField('date', value);
    updateScheduleField('endDate', '');
    forceRender();
  };

  const handleCustomDateRangeChange = (field: 'date' | 'endDate', value: string) => {
    memory.dateMode = 'custom_date_range';
    if (field === 'date') {
      memory.customRangeStartDate = value;
    } else {
      memory.customRangeEndDate = value;
    }
    updateScheduleField('dateType', 'range');
    updateScheduleField(field, value);
    forceRender();
  };

  const handleSelectTimeMode = (mode: NonNullable<TimeScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.timeMode = mode;

    if (mode === 'morning') {
      updateScheduleField('type', 'range');
      updateScheduleField('startTime', MORNING_SHIFT.startTime);
      updateScheduleField('endTime', MORNING_SHIFT.endTime);
    } else if (mode === 'afternoon') {
      updateScheduleField('type', 'range');
      updateScheduleField('startTime', AFTERNOON_SHIFT.startTime);
      updateScheduleField('endTime', AFTERNOON_SHIFT.endTime);
    } else if (mode === 'custom_time') {
      updateScheduleField('type', 'fixed');
      updateScheduleField('startTime', memory.customTime);
      updateScheduleField('endTime', '');
    } else if (mode === 'custom_time_range') {
      updateScheduleField('type', 'range');
      updateScheduleField('startTime', memory.customRangeStartTime);
      updateScheduleField('endTime', memory.customRangeEndTime);
    }

    forceRender();
  };

  const handleCustomTimeChange = (value: string) => {
    memory.timeMode = 'custom_time';
    memory.customTime = value;
    updateScheduleField('type', 'fixed');
    updateScheduleField('startTime', value);
    updateScheduleField('endTime', '');
    forceRender();
  };

  const handleCustomTimeRangeChange = (field: 'startTime' | 'endTime', value: string) => {
    memory.timeMode = 'custom_time_range';
    if (field === 'startTime') {
      memory.customRangeStartTime = value;
    } else {
      memory.customRangeEndTime = value;
    }
    updateScheduleField('type', 'range');
    updateScheduleField(field, value);
    forceRender();
  };

  const handleImmediatePickupToggle = () => {
    if (scheduling.immediatePickup) {
      memory.dateMode = null;
      memory.timeMode = null;
      onChangeScheduling('immediatePickup', false);
      onChangeScheduling('date', '');
      onChangeScheduling('endDate', '');
      onChangeScheduling('startTime', '');
      onChangeScheduling('endTime', '');
      forceRender();
      return;
    }

    const nowInfo = getSaoPauloDayInfo(0);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    memory.dateMode = 'today';
    memory.timeMode = 'custom_time';
    memory.customTime = time;

    onChangeScheduling('pendingScheduling', false);
    onChangeScheduling('immediatePickup', true);
    onChangeScheduling('notInformed', false);
    onChangeScheduling('date', nowInfo.isoDate);
    onChangeScheduling('endDate', '');
    onChangeScheduling('dateType', 'fixed');
    onChangeScheduling('type', 'fixed');
    onChangeScheduling('startTime', time);
    onChangeScheduling('endTime', '');
    forceRender();
  };

  const customDateValue =
    effectiveDateMode === 'custom_date'
      ? normalizeScheduleDate(scheduling.date) || memory.customDate
      : memory.customDate;

  const customRangeStartDateValue =
    effectiveDateMode === 'custom_date_range'
      ? normalizeScheduleDate(scheduling.date) || memory.customRangeStartDate
      : memory.customRangeStartDate;

  const customRangeEndDateValue =
    effectiveDateMode === 'custom_date_range'
      ? normalizeScheduleDate(scheduling.endDate) || memory.customRangeEndDate
      : memory.customRangeEndDate;

  const { startTime: currentStartTime, endTime: currentEndTime } = extractScheduleTimes(scheduling);

  const customTimeValue =
    effectiveTimeMode === 'custom_time'
      ? currentStartTime || memory.customTime
      : memory.customTime;

  const customRangeStartTimeValue =
    effectiveTimeMode === 'custom_time_range'
      ? currentStartTime || memory.customRangeStartTime
      : memory.customRangeStartTime;

  const customRangeEndTimeValue =
    effectiveTimeMode === 'custom_time_range'
      ? currentEndTime || memory.customRangeEndTime
      : memory.customRangeEndTime;

  const summaryDateText = resolveSummaryDateText(
    effectiveDateMode,
    customDateValue,
    customRangeStartDateValue,
    customRangeEndDateValue
  );

  const summaryTimeText = resolveSummaryTimeText(
    effectiveTimeMode,
    customTimeValue,
    customRangeStartTimeValue,
    customRangeEndTimeValue
  );

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
                    memory.dateMode = null;
                    memory.timeMode = null;
                    onChangeScheduling('date', '');
                    onChangeScheduling('endDate', '');
                    onChangeScheduling('startTime', '');
                    onChangeScheduling('endTime', '');
                    onChangeScheduling('notInformed', false);
                  }
                  forceRender();
                }}
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
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      scheduling.immediatePickup ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`w-full transition-opacity ${isScheduleReadOnly ? 'opacity-90' : ''}`}>
        {isPendingScheduling ? (
          <div className="flex items-center gap-4 py-4 px-4 bg-orange-50/50 dark:bg-orange-900/10 border border-dashed border-orange-200 dark:border-orange-800 rounded-2xl animate-fade-in">
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
        ) : !scheduling.notInformed || hideNotice ? (
          <div
            className={`flex flex-col gap-6 w-full transition-all duration-300 ${
              isScheduleReadOnly ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''
            }`}
          >
            <ScheduledDateCardsSection
              baseId={baseId}
              isScheduleReadOnly={isScheduleReadOnly}
              isRequired={!isScheduleReadOnly}
              effectiveDateMode={effectiveDateMode}
              dateError={dateError}
              customDateValue={customDateValue}
              customRangeStartDateValue={customRangeStartDateValue}
              customRangeEndDateValue={customRangeEndDateValue}
              onSelectDateMode={handleSelectDateMode}
              onCustomDateChange={handleCustomDateChange}
              onCustomDateRangeChange={handleCustomDateRangeChange}
            />

            <ScheduledTimeCardsSection
              baseId={baseId}
              isScheduleReadOnly={isScheduleReadOnly}
              isRequired={!isScheduleReadOnly}
              effectiveTimeMode={effectiveTimeMode}
              timeError={timeError}
              customTimeValue={customTimeValue}
              customRangeStartTimeValue={customRangeStartTimeValue}
              customRangeEndTimeValue={customRangeEndTimeValue}
              onSelectTimeMode={handleSelectTimeMode}
              onCustomTimeChange={handleCustomTimeChange}
              onCustomTimeRangeChange={handleCustomTimeRangeChange}
            />

            <div
              data-testid="scheduling-summary"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3.5 flex flex-col gap-1.5"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Resumo da programação
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Data:</span>
                  <span
                    data-testid="scheduling-summary-date"
                    className={`font-bold ${
                      summaryDateText === 'Não definido'
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {summaryDateText}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Horário:</span>
                  <span
                    data-testid="scheduling-summary-time"
                    className={`font-bold ${
                      summaryTimeText === 'Não definido'
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {summaryTimeText}
                  </span>
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
