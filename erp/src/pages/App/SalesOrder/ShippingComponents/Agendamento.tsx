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
import { ChevronDown, Plus, Trash2 } from 'lucide-react';

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

const summarizeOption = (option: Shipping['scheduling']) => {
  const date = option.date
    ? option.date.split('-').reverse().join('/') + (option.dateType === 'range' && option.endDate ? ` a ${option.endDate.split('-').reverse().join('/')}` : '')
    : 'Data não definida';
  const start = option.startTime || (option.type === 'fixed' ? option.time : '');
  const time = start
    ? `${start}${option.endTime ? ` às ${option.endTime}` : ''}`
    : 'Horário não definido';
  return `${date} · ${time}`;
};

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
  const optionMemoryRefs = useRef(new Map<string, React.MutableRefObject<SchedulingSessionMemory | null>>());
  const [scheduleMode, setScheduleMode] = useState<'defined' | 'alternatives'>(
    scheduling?.scheduleMode || 'defined'
  );
  const [expandedOptionId, setExpandedOptionId] = useState('primary');
  const alternatives = scheduling?.alternatives || [];
  const activeOptionId = scheduleMode === 'alternatives' ? expandedOptionId : 'primary';
  const hasExpandedOption = scheduleMode !== 'alternatives' || Boolean(expandedOptionId);
  const expandedOptionIndex = expandedOptionId === 'primary'
    ? 0
    : alternatives.findIndex((option) => option.id === expandedOptionId) + 1;
  const activeScheduling =
    activeOptionId === 'primary'
      ? scheduling
      : (alternatives.find((option) => option.id === activeOptionId) || scheduling);
  let activeMemoryRef = activeOptionId === 'primary' ? sessionMemoryRef || fallbackMemoryRef : optionMemoryRefs.current.get(activeOptionId);
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
    ? activeOptionId === 'primary' ? errors['shipping_date'] : errors[`shipping_alternative_${activeOptionId}_date`]
    : undefined;
  const timeError = !isScheduleReadOnly
    ? activeOptionId === 'primary' ? errors['shipping_time'] : errors[`shipping_alternative_${activeOptionId}_time`]
    : undefined;

  const updateScheduleField = (
    key: keyof Shipping['scheduling'],
    value: string | Date | boolean
  ) => {
    if (activeOptionId === 'primary') {
      if (key !== 'immediatePickup') onChangeScheduling('immediatePickup', false);
      onChangeScheduling(key, value);
    } else {
      onChangeScheduling(
        'alternatives',
        alternatives.map((option) => option.id === activeOptionId ? { ...option, [key]: value } : option)
      );
    }
  };

  const effectiveDateMode = resolveEffectiveDateMode(memory, activeScheduling, dateError);
  const effectiveTimeMode = resolveEffectiveTimeMode(memory, activeScheduling);

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

  const { startTime: currentStartTime, endTime: currentEndTime } = extractScheduleTimes(activeScheduling);

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
        <div className="mb-4 ml-1 flex w-fit rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800" role="tablist" aria-label="Tipo de agendamento">
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
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${scheduleMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
            >
              {mode === 'defined' ? 'Data definida' : 'Datas alternativas'}
            </button>
          ))}
        </div>
      )}

      {scheduleMode === 'alternatives' && (
        <div className="contents">
          {[{ id: 'primary', option: scheduling, primary: true }, ...alternatives.map((option) => ({ id: option.id, option, primary: false }))].map(({ id, option, primary }, index) => {
            const expanded = expandedOptionId === id;
            const optionHasError = primary
              ? Boolean(errors['shipping_date'] || errors['shipping_time'])
              : Boolean(errors[`shipping_alternative_${id}_date`] || errors[`shipping_alternative_${id}_time`] || errors[`shipping_alternative_${id}_duplicate`]);
            return (
              <div key={id} style={{ order: index * 2 }} className={`overflow-hidden border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${expanded ? 'rounded-t-2xl border-b-0' : 'rounded-2xl'}`}>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedOptionId(expanded ? '' : id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">{index + 1}ª opção — {primary ? 'Principal' : 'Alternativa'}</span>
                    <span className="truncate text-xs text-slate-500 dark:text-slate-400">{summarizeOption(option)}</span>
                    {optionHasError && <span className="shrink-0 text-[10px] font-bold text-red-600">Erro</span>}
                  </button>
                  {!primary && (
                    <button type="button" aria-label={`Remover ${index + 1}ª opção`} onClick={() => {
                      const next = alternatives.filter((item) => item.id !== id);
                      onChangeScheduling('alternatives', next);
                      if (expanded) setExpandedOptionId('primary');
                    }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasExpandedOption && <div style={scheduleMode === 'alternatives' ? { order: expandedOptionIndex * 2 + 1 } : undefined} className={`w-full transition-opacity ${isScheduleReadOnly ? 'opacity-90' : ''} ${scheduleMode === 'alternatives' ? 'rounded-b-2xl border border-t-0 border-slate-200 p-4 dark:border-slate-700' : ''}`}>
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
              key={activeOptionId}
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
              key={activeOptionId}
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

            {scheduleMode === 'defined' && <div
              data-testid="scheduling-summary"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-4 py-3.5 flex flex-col gap-1.5"
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Resumo da programação
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-xs">
                {scheduleMode === 'defined' ? <><div className="flex items-center gap-1.5">
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
                </div></> : <div className="flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {[{ id: 'primary', option: scheduling }, ...alternatives.map((option) => ({ id: option.id, option }))].map(({ option }, index) => <div key={index}>{index + 1}ª opção: {summarizeOption(option)}</div>)}
                </div>}
              </div>
            </div>}
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
      </div>}
      {scheduleMode === 'alternatives' && (
        <>
          <button style={{ order: (alternatives.length + 1) * 2 }}
            type="button"
            onClick={() => {
              const next = [...alternatives, emptyAlternative()];
              onChangeScheduling('alternatives', next);
              setExpandedOptionId(next[next.length - 1].id);
            }}
            className="ml-1 inline-flex w-fit items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-orange-950/20"
          >
            <Plus className="h-4 w-4" /> Adicionar alternativa
          </button>
          <div style={{ order: (alternatives.length + 1) * 2 + 1 }} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Resumo da programação</span>
            <div className="mt-2 flex flex-col gap-1 text-xs font-bold text-slate-700 dark:text-slate-200">
              {[{ option: scheduling }, ...alternatives.map((option) => ({ option }))].map(({ option }, index) => <div key={index}>{index + 1}ª opção — {index === 0 ? 'Principal' : 'Alternativa'}: {summarizeOption(option)}</div>)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Agendamento;
