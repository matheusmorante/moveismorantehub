import type Shipping from '../../erp/src/pages/types/Shipping.type';
import { MORNING_SHIFT, AFTERNOON_SHIFT } from './timezoneUtils';
import type { ScheduleOptionLike } from './types';

export const normalizeScheduleDate = (raw?: string | null): string => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return trimmed.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
};

export const isValidScheduleDate = (raw?: string | null): boolean => {
  const norm = normalizeScheduleDate(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(norm)) return false;
  const [y, m, d] = norm.split('-').map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

export const formatScheduleDateBr = (raw?: string | null): string => {
  if (!isValidScheduleDate(raw)) return '';
  const [y, m, d] = normalizeScheduleDate(raw).split('-');
  return `${d}/${m}/${y}`;
};

export const normalizeScheduleTime = (raw?: string | null): string => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';
  if (/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return trimmed;
};

export const isValidScheduleTime = (raw?: string | null): boolean => {
  const norm = normalizeScheduleTime(raw);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(norm);
};

export const extractScheduleTimes = (
  scheduling?: Partial<Shipping['scheduling']> | null
): { startTime: string; endTime: string } => {
  if (!scheduling) return { startTime: '', endTime: '' };
  let startTime = normalizeScheduleTime(scheduling.startTime);
  let endTime = normalizeScheduleTime(scheduling.endTime);

  const period = String((scheduling as any).period || '').trim().toLowerCase();
  if (!startTime && !endTime && period) {
    if (period === 'morning') {
      startTime = MORNING_SHIFT.startTime;
      endTime = MORNING_SHIFT.endTime;
    } else if (period === 'afternoon') {
      startTime = AFTERNOON_SHIFT.startTime;
      endTime = AFTERNOON_SHIFT.endTime;
    }
  }

  if (!startTime && !endTime && scheduling.time) {
    const rawTime = String(scheduling.time).trim();
    const rangeMatch = rawTime.match(/^(\d{2}:\d{2})\s*(?:às|até|-)\s*(\d{2}:\d{2})$/i);
    if (rangeMatch) {
      startTime = normalizeScheduleTime(rangeMatch[1]);
      endTime = normalizeScheduleTime(rangeMatch[2]);
    } else if (scheduling.type !== 'range') {
      startTime = normalizeScheduleTime(rawTime);
    }
  }

  return { startTime, endTime };
};

export const formatScheduleOptionDateBr = (option?: ScheduleOptionLike | null): string => {
  if (!option || !isValidScheduleDate(option.date)) return '';
  const startNorm = normalizeScheduleDate(option.date);
  const startBr = formatScheduleDateBr(startNorm);
  const endNorm = normalizeScheduleDate(option.endDate);
  if (option.dateType === 'range' && isValidScheduleDate(endNorm) && endNorm !== startNorm) {
    return `${startBr} a ${formatScheduleDateBr(endNorm)}`;
  }
  return startBr;
};

export const formatScheduleOptionTime = (option?: ScheduleOptionLike | null): string => {
  if (!option) return '';
  const { startTime, endTime } = extractScheduleTimes(option as any);
  if (option.type === 'range' && startTime && endTime) {
    return `${startTime} às ${endTime}`;
  }
  if (startTime && endTime && startTime !== endTime) {
    return `${startTime} às ${endTime}`;
  }
  if (startTime) return startTime;
  const period = String(option.period || '').trim().toLowerCase();
  if (period === 'morning') return 'Manhã (09:00 às 12:00)';
  if (period === 'afternoon') return 'Tarde (13:00 às 18:00)';
  if (period === 'full_day') return 'Horário Comercial';
  return String(option.time || '').trim();
};
