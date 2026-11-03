import {
  differenceInCalendarDays,
  endOfDay,
  startOfDay,
  subDays,
  subMonths,
} from 'date-fns';
import type { Period } from './useDashboardData';

export interface DashboardInterval {
  start: Date;
  end: Date;
}

const localDate = (year: number, month: number, day: number) =>
  new Date(year, month, day);

const parseLocalDateInput = (value?: string): Date | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth) - 1;
  const day = Number(rawDay);
  const date = localDate(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
};

const sameDayOfPreviousYear = (date: Date): Date => {
  const year = date.getFullYear() - 1;
  const day = Math.min(date.getDate(), new Date(year, date.getMonth() + 1, 0).getDate());
  return localDate(year, date.getMonth(), day);
};

export const toLocalDateInputValue = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function buildDashboardIntervals(
  period: Period,
  now: Date,
  customStartDate?: string,
  customEndDate?: string,
  specificMonth?: string,
): { current: DashboardInterval; prev: DashboardInterval } {
  switch (period) {
    case 'today': {
      const today = startOfDay(now);
      const yesterday = subDays(today, 1);
      return { current: { start: today, end: endOfDay(now) }, prev: { start: yesterday, end: endOfDay(yesterday) } };
    }
    case 'yesterday': {
      const yesterday = subDays(startOfDay(now), 1);
      const dayBefore = subDays(yesterday, 1);
      return { current: { start: yesterday, end: endOfDay(yesterday) }, prev: { start: dayBefore, end: endOfDay(dayBefore) } };
    }
    case 'month': {
      const currentStart = localDate(now.getFullYear(), now.getMonth(), 1);
      const previousStart = localDate(now.getFullYear(), now.getMonth() - 1, 1);
      const previousEnd = localDate(
        previousStart.getFullYear(),
        previousStart.getMonth(),
        Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()),
      );
      return {
        current: { start: currentStart, end: endOfDay(now) },
        prev: { start: previousStart, end: endOfDay(previousEnd) },
      };
    }
    case 'last_30_days': {
      return {
        current: { start: startOfDay(subDays(now, 29)), end: endOfDay(now) },
        prev: { start: startOfDay(subDays(now, 59)), end: endOfDay(subDays(now, 30)) },
      };
    }
    case 'specific_month': {
      const match = specificMonth?.match(/^(\d{4})-(\d{2})$/);
      const year = match ? Number(match[1]) : now.getFullYear();
      const month = match ? Number(match[2]) - 1 : now.getMonth();
      const validMonth = month >= 0 && month <= 11 ? month : now.getMonth();
      const validYear = month >= 0 && month <= 11 ? year : now.getFullYear();
      const currentStart = localDate(validYear, validMonth, 1);
      const currentEnd = endOfDay(localDate(validYear, validMonth + 1, 0));
      const previousStart = localDate(validYear, validMonth - 1, 1);
      const previousEnd = localDate(
        previousStart.getFullYear(),
        previousStart.getMonth(),
        Math.min(currentEnd.getDate(), new Date(previousStart.getFullYear(), previousStart.getMonth() + 1, 0).getDate()),
      );
      return {
        current: { start: currentStart, end: currentEnd },
        prev: { start: previousStart, end: endOfDay(previousEnd) },
      };
    }
    case 'last_semester': {
      const currentStart = startOfDay(subMonths(now, 6));
      const currentEnd = endOfDay(now);
      const durationDays = differenceInCalendarDays(currentEnd, currentStart) + 1;
      const previousEndDay = subDays(currentStart, 1);
      return {
        current: { start: currentStart, end: currentEnd },
        prev: { start: startOfDay(subDays(previousEndDay, durationDays - 1)), end: endOfDay(previousEndDay) },
      };
    }
    case 'year': {
      const currentStart = localDate(now.getFullYear(), 0, 1);
      const previousStart = localDate(now.getFullYear() - 1, 0, 1);
      return {
        current: { start: currentStart, end: endOfDay(now) },
        prev: { start: previousStart, end: endOfDay(sameDayOfPreviousYear(now)) },
      };
    }
    case 'custom': {
      const rawStart = parseLocalDateInput(customStartDate) ?? startOfDay(subDays(now, 7));
      const rawEndDay = parseLocalDateInput(customEndDate) ?? startOfDay(now);
      const start = rawStart <= rawEndDay ? rawStart : rawEndDay;
      const end = endOfDay(rawStart <= rawEndDay ? rawEndDay : rawStart);
      const durationDays = differenceInCalendarDays(end, start) + 1;
      return {
        current: { start, end },
        prev: { start: startOfDay(subDays(start, durationDays)), end: endOfDay(subDays(start, 1)) },
      };
    }
    default: {
      const start = startOfDay(subDays(now, 7));
      return {
        current: { start, end: endOfDay(now) },
        prev: { start: startOfDay(subDays(now, 14)), end: endOfDay(subDays(now, 8)) },
      };
    }
  }
}
