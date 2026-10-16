import Shipping from '../../../../types/Shipping.type';
import {
  AFTERNOON_SHIFT,
  MORNING_SHIFT,
  extractScheduleTimes,
  formatScheduleDateBr,
  getSaoPauloDayInfo,
  isValidScheduleDate,
  isValidScheduleTime,
  normalizeScheduleDate,
  normalizeScheduleTime,
} from '../../../../../../../shared-utils/commercialOrderRules';

export type DateScheduleMode = 'today' | 'tomorrow' | 'custom_date' | 'custom_date_range' | null;
export type TimeScheduleMode = 'morning' | 'afternoon' | 'custom_time' | 'custom_time_range' | null;

export interface SchedulingSessionMemory {
  initialized: boolean;
  lastHydratedSignature: string;
  dateMode: DateScheduleMode;
  timeMode: TimeScheduleMode;
  customDate: string;
  customRangeStartDate: string;
  customRangeEndDate: string;
  customTime: string;
  customRangeStartTime: string;
  customRangeEndTime: string;
}

export const createEmptySchedulingSessionMemory = (): SchedulingSessionMemory => ({
  initialized: false,
  lastHydratedSignature: '',
  dateMode: null,
  timeMode: null,
  customDate: '',
  customRangeStartDate: '',
  customRangeEndDate: '',
  customTime: '',
  customRangeStartTime: '',
  customRangeEndTime: '',
});

export const buildSchedulingSignature = (scheduling: Shipping['scheduling']): string => {
  const date = normalizeScheduleDate(scheduling?.date);
  const endDate = normalizeScheduleDate(scheduling?.endDate);
  const dateType = scheduling?.dateType || 'fixed';
  const { startTime, endTime } = extractScheduleTimes(scheduling || {});
  const type = scheduling?.type || 'fixed';
  const pending = Boolean(scheduling?.pendingScheduling);
  const immediate = Boolean(scheduling?.immediatePickup);
  const notInformed = Boolean(scheduling?.notInformed);
  return `${date}|${endDate}|${dateType}|${startTime}|${endTime}|${type}|${pending}|${immediate}|${notInformed}`;
};

export const deriveSchedulingSessionMemory = (
  scheduling: Shipping['scheduling']
): SchedulingSessionMemory => {
  const memory = createEmptySchedulingSessionMemory();
  memory.initialized = true;
  memory.lastHydratedSignature = buildSchedulingSignature(scheduling);

  const date = normalizeScheduleDate(scheduling?.date);
  const endDate = normalizeScheduleDate(scheduling?.endDate);
  const isDateRange = scheduling?.dateType === 'range' || Boolean(endDate);

  if (isDateRange && (date || endDate)) {
    memory.dateMode = 'custom_date_range';
    memory.customRangeStartDate = date;
    memory.customRangeEndDate = endDate;
  } else if (date) {
    memory.dateMode = 'custom_date';
    memory.customDate = date;
  }

  const { startTime, endTime } = extractScheduleTimes(scheduling || {});
  const isTimeRange = scheduling?.type === 'range' || Boolean(endTime);

  if (isTimeRange && (startTime || endTime)) {
    if (startTime === MORNING_SHIFT.startTime && endTime === MORNING_SHIFT.endTime) {
      memory.timeMode = 'morning';
    } else if (startTime === AFTERNOON_SHIFT.startTime && endTime === AFTERNOON_SHIFT.endTime) {
      memory.timeMode = 'afternoon';
    } else {
      memory.timeMode = 'custom_time_range';
      memory.customRangeStartTime = startTime;
      memory.customRangeEndTime = endTime;
    }
  } else if (startTime) {
    memory.timeMode = 'custom_time';
    memory.customTime = startTime;
  }

  return memory;
};

export const resolveEffectiveDateMode = (
  memory: SchedulingSessionMemory,
  scheduling: Shipping['scheduling'],
  dateError?: string
): DateScheduleMode => {
  if (memory.dateMode) return memory.dateMode;
  if (scheduling.dateType === 'range' && (scheduling.date || scheduling.endDate || dateError)) {
    return 'custom_date_range';
  }
  if (scheduling.date) {
    return 'custom_date';
  }
  return null;
};

export const resolveEffectiveTimeMode = (
  memory: SchedulingSessionMemory,
  scheduling: Shipping['scheduling']
): TimeScheduleMode => {
  if (memory.timeMode) return memory.timeMode;
  const { startTime, endTime } = extractScheduleTimes(scheduling);
  if (scheduling.type === 'range' || endTime) {
    if (startTime === MORNING_SHIFT.startTime && endTime === MORNING_SHIFT.endTime) {
      return 'morning';
    }
    if (startTime === AFTERNOON_SHIFT.startTime && endTime === AFTERNOON_SHIFT.endTime) {
      return 'afternoon';
    }
    if (startTime || endTime) {
      return 'custom_time_range';
    }
  } else if (startTime) {
    return 'custom_time';
  }
  return null;
};

export const resolveSummaryDateText = (
  effectiveDateMode: DateScheduleMode,
  customDateValue: string,
  customRangeStartDateValue: string,
  customRangeEndDateValue: string
): string => {
  const todayInfo = getSaoPauloDayInfo(0);
  const tomorrowInfo = getSaoPauloDayInfo(1);

  if (effectiveDateMode === 'today') return `Hoje, ${todayInfo.formattedDate}`;
  if (effectiveDateMode === 'tomorrow') return `Amanhã, ${tomorrowInfo.formattedDate}`;
  if (effectiveDateMode === 'custom_date') {
    return isValidScheduleDate(customDateValue)
      ? formatScheduleDateBr(customDateValue)
      : 'Não definido';
  }
  if (effectiveDateMode === 'custom_date_range') {
    if (
      isValidScheduleDate(customRangeStartDateValue) &&
      isValidScheduleDate(customRangeEndDateValue) &&
      customRangeEndDateValue >= customRangeStartDateValue
    ) {
      return `${formatScheduleDateBr(customRangeStartDateValue)} a ${formatScheduleDateBr(customRangeEndDateValue)}`;
    }
    return 'Não definido';
  }
  return 'Não definido';
};

export const resolveSummaryTimeText = (
  effectiveTimeMode: TimeScheduleMode,
  customTimeValue: string,
  customRangeStartTimeValue: string,
  customRangeEndTimeValue: string
): string => {
  if (effectiveTimeMode === 'morning') return MORNING_SHIFT.label;
  if (effectiveTimeMode === 'afternoon') return AFTERNOON_SHIFT.label;
  if (effectiveTimeMode === 'custom_time') {
    return isValidScheduleTime(customTimeValue)
      ? normalizeScheduleTime(customTimeValue)
      : 'Não definido';
  }
  if (effectiveTimeMode === 'custom_time_range') {
    if (
      isValidScheduleTime(customRangeStartTimeValue) &&
      isValidScheduleTime(customRangeEndTimeValue) &&
      normalizeScheduleTime(customRangeEndTimeValue) >
        normalizeScheduleTime(customRangeStartTimeValue)
    ) {
      return `${normalizeScheduleTime(customRangeStartTimeValue)} às ${normalizeScheduleTime(customRangeEndTimeValue)}`;
    }
    return 'Não definido';
  }
  return 'Não definido';
};

export const getCardContainerClasses = (
  isSelected: boolean,
  hasCardError?: boolean,
  isFilled: boolean = true
) => {
  if (isSelected) {
    if (!isFilled) {
      return `rounded-2xl border-2 transition-all duration-200 ${
        hasCardError
          ? 'border-amber-500 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-950/20 ring-1 ring-red-500/30'
          : 'border-amber-500 bg-amber-50/40 dark:border-amber-500 dark:bg-amber-950/20 shadow-sm'
      }`;
    }
    return `rounded-2xl border-2 transition-all duration-200 ${
      hasCardError
        ? 'border-emerald-500 bg-emerald-50/30 dark:border-emerald-500 dark:bg-emerald-950/20 ring-1 ring-red-500/30'
        : 'border-emerald-500 bg-emerald-50/40 dark:border-emerald-500 dark:bg-emerald-950/20 shadow-sm'
    }`;
  }
  return 'rounded-2xl border border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition-all duration-200';
};

export const getCardIconClasses = (isSelected: boolean, isFilled: boolean = true) => {
  if (!isSelected) return 'text-slate-400 dark:text-slate-500';
  return isFilled
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';
};

export const getCardTitleClasses = (isSelected: boolean, isFilled: boolean = true) => {
  if (!isSelected) return 'text-slate-700 dark:text-slate-200';
  return isFilled
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-amber-700 dark:text-amber-400';
};

export const getCardFieldLabelClasses = (isInvalid: boolean, isFilled: boolean) => {
  if (isInvalid) return 'text-red-600 dark:text-red-400';
  return isFilled
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-amber-700 dark:text-amber-400';
};

export const getBottomBorderInputClasses = (isInvalid: boolean, isFilled: boolean = true) =>
  `w-full border-0 border-b-2 rounded-none bg-transparent px-1 py-2 text-sm font-bold outline-none shadow-none focus:ring-0 transition-colors [color-scheme:light] dark:[color-scheme:dark] ${
    isInvalid
      ? 'border-red-500 text-red-600 focus:border-red-600 dark:border-red-500 dark:text-red-400 dark:focus:border-red-400'
      : isFilled
        ? 'border-emerald-500 text-slate-800 focus:border-emerald-600 dark:border-emerald-600 dark:text-slate-100 dark:focus:border-emerald-400'
        : 'border-amber-400 text-slate-800 focus:border-amber-600 dark:border-amber-600 dark:text-slate-100 dark:focus:border-amber-400'
  }`;
