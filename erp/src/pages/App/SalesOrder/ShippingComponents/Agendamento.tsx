import React, { useId, useRef, useState } from 'react';
import Shipping from '../../../types/Shipping.type';
import { ValidationErrors } from '../../../utils/sales/validations';
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
import { SchedulingControls } from './agendamento/SchedulingControls';
import { useSchedulingMemoryHydration } from './agendamento/useSchedulingMemoryHydration';

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
  hideTitle?: boolean;
  title?: string;
  operationNoun?: string;
  headerActions?: React.ReactNode;
  modeSelector?: React.ReactNode;
  groupPrimarySections?: boolean;
  primarySectionExpanded?: boolean;
  onTogglePrimarySection?: () => void;
  sessionMemoryRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
}

const Agendamento = ({
  scheduling,
  onChangeScheduling,
  errors,
  isPickup,
  hideSchedulingShortcuts,
  hideNotice,
  hideTitle,
  title,
  operationNoun,
  headerActions,
  modeSelector,
  groupPrimarySections,
  primarySectionExpanded,
  onTogglePrimarySection,
  sessionMemoryRef,
}: AgendamentoProps) => {
  const fallbackMemoryRef = useRef<SchedulingSessionMemory | null>(null);
  const [expandedAlternativeId, setExpandedAlternativeId] = useState<string | null>(null);
  const [isPrimaryExpanded, setIsPrimaryExpanded] = useState(true);
  const isPrimarySectionExpanded = primarySectionExpanded ?? isPrimaryExpanded;
  const togglePrimarySection = onTogglePrimarySection ?? (() => setIsPrimaryExpanded((current) => !current));
  const [expandedScheduleSection, setExpandedScheduleSection] = useState<
    'date' | 'time' | 'alternatives' | null
  >(null);
  const isAlternativesExpanded = expandedScheduleSection === 'alternatives';
  const alternatives = scheduling?.alternatives || [];
  const activeScheduling = scheduling;
  const activeMemoryRef = sessionMemoryRef || fallbackMemoryRef;

  const baseId = useId();

  const forceRender = useSchedulingMemoryHydration(activeMemoryRef, activeScheduling);

  if (!scheduling) return null;

  const memory = activeMemoryRef.current!;
  const isImmediatePickup = Boolean(isPickup && scheduling.immediatePickup);
  const scheduledOperationNoun = operationNoun || (isPickup ? 'retirada' : 'entrega');
  const isPendingScheduling = Boolean(scheduling.pendingScheduling && !isImmediatePickup);
  const hasExplicitModeSelector = modeSelector !== undefined;
  const isScheduleReadOnly = isPendingScheduling || isImmediatePickup;
  const dateError = !isScheduleReadOnly ? errors['shipping_date'] : undefined;
  const timeError = !isScheduleReadOnly ? errors['shipping_time'] : undefined;

  type ScheduleOptionField = 'date' | 'endDate' | 'dateType' | 'type' | 'startTime' | 'endTime';
  type ScheduleOptionFields = Partial<Pick<Shipping['scheduling'], ScheduleOptionField>>;

  const updateScheduleFields = (fields: ScheduleOptionFields) => {
    onChangeScheduling('immediatePickup', false);
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        onChangeScheduling(key as ScheduleOptionField, value as string);
      }
    });
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

  const handlePendingSchedulingToggle = () => {
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
    <div className="flex-1 flex flex-col min-w-0 gap-3">
      <SchedulingControls
        title={hideTitle ? '' : title || (isPickup ? 'Agendamento da Retirada' : 'Agendamento da Entrega')}
        headerActions={headerActions}
        isPickup={isPickup}
        hideSchedulingShortcuts={hideSchedulingShortcuts}
        isImmediatePickup={isImmediatePickup}
        isPendingScheduling={isPendingScheduling}
        onTogglePending={handlePendingSchedulingToggle}
        onToggleImmediatePickup={handleImmediatePickupToggle}
        isPrimaryExpanded={groupPrimarySections ? isPrimarySectionExpanded : undefined}
        onTogglePrimary={groupPrimarySections ? togglePrimarySection : undefined}
      />

      {(!groupPrimarySections || isPrimarySectionExpanded) && modeSelector}

      {(!groupPrimarySections || isPrimarySectionExpanded) && (
        hasExplicitModeSelector && isImmediatePickup ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-900/50 dark:bg-purple-900/10">
            <span className="inline-flex shrink-0 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              Retirada imediata
            </span>
          </div>
        ) : isPendingScheduling ? (
          hasExplicitModeSelector ? (
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/10">
              <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                Agendamento pendente
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-4 py-4 animate-fade-in dark:border-orange-800 dark:bg-orange-900/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                <i className="bi bi-clock-history text-xl" />
              </div>
              <div className="flex flex-col">
                <h4 className="mb-1 text-[11px] font-black uppercase leading-none tracking-widest text-orange-700 dark:text-orange-400">
                  Agendamento em Aberto
                </h4>
                <p className="text-[9px] font-bold uppercase leading-tight text-orange-600/70 dark:text-orange-500/70">
                  Este pedido será agendado em breve.
                </p>
              </div>
            </div>
          )
        ) : !scheduling.notInformed || hideNotice ? (
          <div
            className={`flex w-full flex-col gap-6 transition-all duration-300 ${
              isScheduleReadOnly ? 'pointer-events-none opacity-40 grayscale-[0.5]' : ''
            }`}
          >
            <ScheduledDateCardsSection
              baseId={baseId}
              isExpanded={expandedScheduleSection === 'date'}
              onToggleExpanded={() =>
                setExpandedScheduleSection((current) => (current === 'date' ? null : 'date'))
              }
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
              isExpanded={expandedScheduleSection === 'time'}
              onToggleExpanded={() =>
                setExpandedScheduleSection((current) => (current === 'time' ? null : 'time'))
              }
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
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 px-6 py-4 dark:border-amber-900/30 dark:bg-amber-900/10">
            <div className="flex h-10 w-10 shrink-0 grow-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
              <i className="bi bi-exclamation-triangle-fill text-xl" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Aviso de Agendamento
              </span>
              <span className="text-[11px] font-medium uppercase tracking-tight text-amber-600/80 dark:text-amber-500/80">
                Data e horário não serão informados para esta {scheduledOperationNoun}
              </span>
            </div>
          </div>
        )
      )}

      {(!groupPrimarySections || isPrimarySectionExpanded) &&
        (!hasExplicitModeSelector || (!isPendingScheduling && !isImmediatePickup)) && (
          <AlternativesAccordion
            alternatives={alternatives}
            isExpanded={isAlternativesExpanded}
            expandedAlternativeId={expandedAlternativeId}
            errors={errors}
            isScheduleReadOnly={isScheduleReadOnly}
            onToggleExpanded={() =>
              setExpandedScheduleSection((current) =>
                current === 'alternatives' ? null : 'alternatives'
              )
            }
            onToggleAlternative={(id) =>
              setExpandedAlternativeId((current) => (current === id ? null : id))
            }
            onRemoveAlternative={(id) => {
              onChangeScheduling(
                'alternatives',
                alternatives.filter((item) => item.id !== id)
              );
              if (expandedAlternativeId === id) setExpandedAlternativeId(null);
            }}
            onAddAlternative={() => {
              const alternative = emptyAlternative();
              onChangeScheduling('alternatives', [...alternatives, alternative]);
              setExpandedAlternativeId(alternative.id);
              setExpandedScheduleSection('alternatives');
            }}
            onChangeAlternative={(id, fields) =>
              onChangeScheduling(
                'alternatives',
                alternatives.map((option) =>
                  option.id === id ? { ...option, ...fields } : option
                )
              )
            }
          />
        )}

      {!isPendingScheduling && (!scheduling.notInformed || hideNotice) && (!hasExplicitModeSelector || !isImmediatePickup) && (
        <SchedulingSummaryBox
          summaryDateText={summaryDateText}
          summaryTimeText={summaryTimeText}
        />
      )}
    </div>
  );
};

export default Agendamento;
