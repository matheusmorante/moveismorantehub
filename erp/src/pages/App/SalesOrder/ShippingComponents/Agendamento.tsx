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
import { AlternativesAccordion } from './agendamento/AlternativesAccordion';
import { SchedulingSummaryBox } from './agendamento/SchedulingSummaryBox';

export {
  createEmptySchedulingSessionMemory,
  deriveSchedulingSessionMemory,
  type DateScheduleMode,
  type SchedulingSessionMemory,
  type TimeScheduleMode,
};

const emptyAlternative = (): NonNullable<Shipping['scheduling']['alternatives']>[number] => ({
  id: crypto.randomUUID(),
  date: '',
  endDate: '',
  dateType: 'fixed',
  time: '',
  startTime: '',
  endTime: '',
  type: 'fixed',
});

interface AgendamentoProps {
  scheduling: Shipping['scheduling'];
  onChangeScheduling: (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean | NonNullable<Shipping['scheduling']['alternatives']>
  ) => void;
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
  const optionMemoryRefs = useRef<Map<string, React.MutableRefObject<SchedulingSessionMemory | null>>>(
    new Map()
  );
  const [scheduleMode, setScheduleMode] = useState<'defined' | 'alternatives'>(
    scheduling?.scheduleMode || 'defined'
  );
  const [expandedOptionId, setExpandedOptionId] = useState('primary');
  const alternatives = scheduling?.alternatives || [];
  const activeOptionId = scheduleMode === 'alternatives' ? expandedOptionId : 'primary';
  const hasExpandedOption = scheduleMode !== 'alternatives' || Boolean(expandedOptionId);
  const expandedOptionIndex =
    expandedOptionId === 'primary'
      ? 0
      : alternatives.findIndex((option) => option.id === expandedOptionId) + 1;
  const activeScheduling =
    activeOptionId === 'primary'
      ? scheduling
      : alternatives.find((option) => option.id === activeOptionId) || scheduling;

  let activeMemoryRef =
    activeOptionId === 'primary'
      ? sessionMemoryRef || fallbackMemoryRef
      : optionMemoryRefs.current.get(activeOptionId);

  if (!activeMemoryRef) {
    activeMemoryRef = { current: null };
    optionMemoryRefs.current.set(activeOptionId, activeMemoryRef);
  }

  const baseId = useId();

  useEffect(() => {
    setScheduleMode(scheduling?.scheduleMode || 'defined');
  }, [scheduling?.scheduleMode]);

  if (!activeMemoryRef.current || !activeMemoryRef.current.initialized) {
    activeMemoryRef.current = deriveSchedulingSessionMemory(activeScheduling);
  }

  const [, setRenderTick] = useState(0);
  const forceRender = () => setRenderTick((prev) => prev + 1);

  const currentSignature = buildSchedulingSignature(activeScheduling);

  useEffect(() => {
    const mem = activeMemoryRef.current;
    if (!mem) return;

    if (mem.lastHydratedSignature !== currentSignature) {
      const hasExternalData = Boolean(
        normalizeScheduleDate(activeScheduling?.date) ||
          normalizeScheduleDate(activeScheduling?.endDate) ||
          extractScheduleTimes(activeScheduling || {}).startTime ||
          extractScheduleTimes(activeScheduling || {}).endTime
      );
      if (hasExternalData && mem.dateMode === null && mem.timeMode === null) {
        activeMemoryRef.current = deriveSchedulingSessionMemory(activeScheduling);
        forceRender();
      } else {
        mem.lastHydratedSignature = currentSignature;
      }
    }
  }, [currentSignature, activeScheduling, activeMemoryRef]);

  if (!scheduling) return null;

  const memory = activeMemoryRef.current!;
  const isImmediatePickup = Boolean(isPickup && scheduling.immediatePickup);
  const isPendingScheduling = Boolean(scheduling.pendingScheduling && !isImmediatePickup);
  const isScheduleReadOnly = isPendingScheduling || isImmediatePickup;
  const dateError = !isScheduleReadOnly
    ? activeOptionId === 'primary'
      ? errors['shipping_date']
      : errors[`shipping_alternative_${activeOptionId}_date`]
    : undefined;
  const timeError = !isScheduleReadOnly
    ? activeOptionId === 'primary'
      ? errors['shipping_time']
      : errors[`shipping_alternative_${activeOptionId}_time`]
    : undefined;

  type ScheduleOptionField = 'date' | 'endDate' | 'dateType' | 'type' | 'startTime' | 'endTime';
  type ScheduleOptionFields = Partial<Pick<Shipping['scheduling'], ScheduleOptionField>>;

  const updateScheduleFields = (fields: ScheduleOptionFields) => {
    if (activeOptionId === 'primary') {
      onChangeScheduling('immediatePickup', false);
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined) {
          onChangeScheduling(
            key as ScheduleOptionField,
            value as string
          );
        }
      });
    } else {
      onChangeScheduling(
        'alternatives',
        alternatives.map((option) => {
          if (option.id !== activeOptionId) return option;
          return {
            ...option,
            date: fields.date ?? option.date,
            endDate: fields.endDate ?? option.endDate,
            dateType: fields.dateType ?? option.dateType,
            type: fields.type ?? option.type,
            startTime: fields.startTime ?? option.startTime,
            endTime: fields.endTime ?? option.endTime,
          };
        })
      );
    }
  };

  const updateScheduleField = (key: ScheduleOptionField, value: string) => {
    updateScheduleFields({ [key]: value });
  };

  const effectiveDateMode = resolveEffectiveDateMode(memory, activeScheduling, dateError);
  const effectiveTimeMode = resolveEffectiveTimeMode(memory, activeScheduling);

  const handleSelectDateMode = (mode: NonNullable<DateScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.dateMode = mode;

    if (mode === 'today') {
      updateScheduleFields({
        dateType: 'fixed',
        date: getSaoPauloDayInfo(0).isoDate,
        endDate: '',
      });
    } else if (mode === 'tomorrow') {
      updateScheduleFields({
        dateType: 'fixed',
        date: getSaoPauloDayInfo(1).isoDate,
        endDate: '',
      });
    } else if (mode === 'custom_date') {
      updateScheduleFields({ dateType: 'fixed', date: memory.customDate, endDate: '' });
    } else if (mode === 'custom_date_range') {
      updateScheduleFields({
        dateType: 'range',
        date: memory.customRangeStartDate,
        endDate: memory.customRangeEndDate,
      });
    }

    forceRender();
  };

  const handleCustomDateChange = (value: string) => {
    memory.dateMode = 'custom_date';
    memory.customDate = value;
    updateScheduleFields({ dateType: 'fixed', date: value, endDate: '' });
    forceRender();
  };

  const handleCustomDateRangeChange = (field: 'date' | 'endDate', value: string) => {
    memory.dateMode = 'custom_date_range';
    if (field === 'date') {
      memory.customRangeStartDate = value;
    } else {
      memory.customRangeEndDate = value;
    }
    updateScheduleFields({ dateType: 'range', [field]: value });
    forceRender();
  };

  const handleSelectTimeMode = (mode: NonNullable<TimeScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.timeMode = mode;

    if (mode === 'morning') {
      updateScheduleFields({
        type: 'range',
        startTime: MORNING_SHIFT.startTime,
        endTime: MORNING_SHIFT.endTime,
      });
    } else if (mode === 'afternoon') {
      updateScheduleFields({
        type: 'range',
        startTime: AFTERNOON_SHIFT.startTime,
        endTime: AFTERNOON_SHIFT.endTime,
      });
    } else if (mode === 'custom_time') {
      updateScheduleFields({ type: 'fixed', startTime: memory.customTime, endTime: '' });
    } else if (mode === 'custom_time_range') {
      updateScheduleFields({
        type: 'range',
        startTime: memory.customRangeStartTime,
        endTime: memory.customRangeEndTime,
      });
    }

    forceRender();
  };

  const handleCustomTimeChange = (value: string) => {
    memory.timeMode = 'custom_time';
    memory.customTime = value;
    updateScheduleFields({ type: 'fixed', startTime: value, endTime: '' });
    forceRender();
  };

  const handleCustomTimeRangeChange = (field: 'startTime' | 'endTime', value: string) => {
    memory.timeMode = 'custom_time_range';
    if (field === 'startTime') {
      memory.customRangeStartTime = value;
    } else {
      memory.customRangeEndTime = value;
    }
    updateScheduleFields({ type: 'range', [field]: value });
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
      ? normalizeScheduleDate(activeScheduling.date) || memory.customDate
      : memory.customDate;

  const customRangeStartDateValue =
    effectiveDateMode === 'custom_date_range'
      ? normalizeScheduleDate(activeScheduling.date) || memory.customRangeStartDate
      : memory.customRangeStartDate;

  const customRangeEndDateValue =
    effectiveDateMode === 'custom_date_range'
      ? normalizeScheduleDate(activeScheduling.endDate) || memory.customRangeEndDate
      : memory.customRangeEndDate;

  const { startTime: currentStartTime, endTime: currentEndTime } = extractScheduleTimes(
    activeScheduling
  );

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
    <div className="flex-1 flex flex-col min-w-0 gap-2">
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
              onClick={() => {
                setScheduleMode(mode);
                onChangeScheduling('scheduleMode', mode);
                if (mode === 'alternatives' && !expandedOptionId) setExpandedOptionId('primary');
              }}
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

      {scheduleMode === 'alternatives' && (
        <AlternativesAccordion
          scheduling={scheduling}
          alternatives={alternatives}
          expandedOptionId={expandedOptionId}
          errors={errors}
          onToggleExpand={(id) => setExpandedOptionId(expandedOptionId === id ? '' : id)}
          onRemoveAlternative={(id) => {
            const next = alternatives.filter((item) => item.id !== id);
            onChangeScheduling('alternatives', next);
            if (expandedOptionId === id) setExpandedOptionId('primary');
          }}
          onAddAlternative={() => {
            const next = [...alternatives, emptyAlternative()];
            onChangeScheduling('alternatives', next);
            setExpandedOptionId(next[next.length - 1].id);
          }}
        />
      )}

      {hasExpandedOption && (
        <div
          style={scheduleMode === 'alternatives' ? { order: expandedOptionIndex * 2 + 1 } : undefined}
          className={`w-full transition-opacity ${isScheduleReadOnly ? 'opacity-90' : ''} ${
            scheduleMode === 'alternatives'
              ? 'rounded-b-2xl border border-t-0 border-slate-200 p-4 dark:border-slate-700'
              : ''
          }`}
        >
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
                key={`date-${activeOptionId}`}
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
                key={`time-${activeOptionId}`}
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

              <SchedulingSummaryBox
                scheduleMode={scheduleMode}
                scheduling={scheduling}
                summaryDateText={summaryDateText}
                summaryTimeText={summaryTimeText}
                alternatives={alternatives}
              />
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
      )}
    </div>
  );
};

export default Agendamento;
