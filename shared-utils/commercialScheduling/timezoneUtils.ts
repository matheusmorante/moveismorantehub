import type { SaoPauloDayInfo } from './types';

export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

export const MORNING_SHIFT = {
  startTime: '09:00',
  endTime: '12:00',
  label: '09:00 às 12:00',
} as const;

export const AFTERNOON_SHIFT = {
  startTime: '13:00',
  endTime: '18:00',
  label: '13:00 às 18:00',
} as const;

export const getSaoPauloDateParts = (
  referenceDate: Date = new Date()
): { year: number; month: number; day: number } => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(referenceDate);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { year, month, day };
};

export const getSaoPauloDateTimeParts = (
  referenceDate: Date = new Date()
): {
  isoDate: string;
  timeHHMM: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} => {
  const { year, month, day } = getSaoPauloDateParts(referenceDate);
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: SAO_PAULO_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const timeParts = timeFormatter.formatToParts(referenceDate);
  const rawHour = Number(timeParts.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const rawMinute = Number(timeParts.find((p) => p.type === 'minute')?.value ?? 0);
  const timeHHMM = `${String(rawHour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;
  return { isoDate, timeHHMM, year, month, day, hour: rawHour, minute: rawMinute };
};

export const getSaoPauloDayInfo = (
  offsetDays: number = 0,
  referenceDate: Date = new Date()
): SaoPauloDayInfo => {
  const { year, month, day } = getSaoPauloDateParts(referenceDate);
  const targetUtcNoon = new Date(Date.UTC(year, month - 1, day + offsetDays, 12, 0, 0));
  const y = targetUtcNoon.getUTCFullYear();
  const m = String(targetUtcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(targetUtcNoon.getUTCDate()).padStart(2, '0');
  const isoDate = `${y}-${m}-${d}`;
  const brDate = `${d}/${m}/${y}`;
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    weekday: 'long',
  })
    .format(targetUtcNoon)
    .toLowerCase();

  return { isoDate, brDate, formattedDate: brDate, weekday };
};
