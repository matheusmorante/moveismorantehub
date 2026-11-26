import React, { useId, useRef, useState } from 'react';
import type Shipping from '../../../../types/Shipping.type';
import type { ValidationErrors } from '../../../../utils/sales/validations';
import {
  AFTERNOON_SHIFT,
  MORNING_SHIFT,
  extractScheduleTimes,
  getSaoPauloDayInfo,
  normalizeScheduleDate,
} from '../../../../../../../shared-utils/commercialOrderRules';
import {
  type DateScheduleMode,
  type SchedulingSessionMemory,
  type TimeScheduleMode,
  resolveEffectiveDateMode,
  resolveEffectiveTimeMode,
} from './agendamentoSessionMemory';
import { ScheduledDateCardsSection } from './ScheduledDateCardsSection';
import { ScheduledTimeCardsSection } from './ScheduledTimeCardsSection';
import { useSchedulingMemoryHydration } from './useSchedulingMemoryHydration';

type AlternativeScheduling = NonNullable<Shipping['scheduling']['alternatives']>[number];
type ScheduleOptionField = 'date' | 'endDate' | 'dateType' | 'type' | 'startTime' | 'endTime';
type ScheduleOptionFields = Partial<Pick<Shipping['scheduling'], ScheduleOptionField>>;

interface AlternativeScheduleFieldsProps {
  id: string;
  scheduling: AlternativeScheduling;
  errors: ValidationErrors;
  isScheduleReadOnly: boolean;
  onChange: (fields: ScheduleOptionFields) => void;
}

export const AlternativeScheduleFields: React.FC<AlternativeScheduleFieldsProps> = ({
  id,
  scheduling,
  errors,
  isScheduleReadOnly,
  onChange,
}) => {
  const memoryRef = useRef<SchedulingSessionMemory | null>(null);
  const forceRender = useSchedulingMemoryHydration(memoryRef, scheduling);
  const [expandedScheduleSection, setExpandedScheduleSection] = useState<'date' | 'time' | null>(null);
  const baseId = useId();
  const memory = memoryRef.current!;
  const dateError = !isScheduleReadOnly
    ? errors[`shipping_alternative_${id}_date`] || errors[`shipping_alternative_${id}_duplicate`]
    : undefined;
  const timeError = !isScheduleReadOnly
    ? errors[`shipping_alternative_${id}_time`]
    : undefined;

  const updateScheduleFields = (fields: ScheduleOptionFields) => onChange(fields);

  const handleSelectDateMode = (mode: NonNullable<DateScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.dateMode = mode;

    if (mode === 'today') {
      updateScheduleFields({ dateType: 'fixed', date: getSaoPauloDayInfo(0).isoDate, endDate: '' });
    } else if (mode === 'tomorrow') {
      updateScheduleFields({ dateType: 'fixed', date: getSaoPauloDayInfo(1).isoDate, endDate: '' });
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
    if (field === 'date') memory.customRangeStartDate = value;
    else memory.customRangeEndDate = value;
    updateScheduleFields({ dateType: 'range', [field]: value });
    forceRender();
  };

  const handleSelectTimeMode = (mode: NonNullable<TimeScheduleMode>) => {
    if (isScheduleReadOnly) return;
    memory.timeMode = mode;

    if (mode === 'morning') {
      updateScheduleFields({ type: 'range', startTime: MORNING_SHIFT.startTime, endTime: MORNING_SHIFT.endTime });
    } else if (mode === 'afternoon') {
      updateScheduleFields({ type: 'range', startTime: AFTERNOON_SHIFT.startTime, endTime: AFTERNOON_SHIFT.endTime });
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
    if (field === 'startTime') memory.customRangeStartTime = value;
    else memory.customRangeEndTime = value;
    updateScheduleFields({ type: 'range', [field]: value });
    forceRender();
  };

  const effectiveDateMode = resolveEffectiveDateMode(memory, scheduling, dateError);
  const effectiveTimeMode = resolveEffectiveTimeMode(memory, scheduling);
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
    effectiveTimeMode === 'custom_time' ? currentStartTime || memory.customTime : memory.customTime;
  const customRangeStartTimeValue =
    effectiveTimeMode === 'custom_time_range'
      ? currentStartTime || memory.customRangeStartTime
      : memory.customRangeStartTime;
  const customRangeEndTimeValue =
    effectiveTimeMode === 'custom_time_range'
      ? currentEndTime || memory.customRangeEndTime
      : memory.customRangeEndTime;

  return (
    <div className={`flex flex-col gap-6 w-full ${isScheduleReadOnly ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
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
  );
};
