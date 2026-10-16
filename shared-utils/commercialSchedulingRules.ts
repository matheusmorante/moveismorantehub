import type Shipping from '../erp/src/pages/types/Shipping.type';

export type ValidationErrors = Record<string, string>;

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

export interface SaoPauloDayInfo {
  /** YYYY-MM-DD */
  isoDate: string;
  /** DD/MM/YYYY */
  brDate: string;
  /** DD/MM/YYYY */
  formattedDate: string;
  /** Dia da semana em português (ex.: "quinta-feira", "sexta-feira") */
  weekday: string;
}

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

export const validateShippingScheduling = (
  scheduling?: Shipping['scheduling'] | null,
  deliveryMethod: Shipping['deliveryMethod'] = 'delivery',
  isBudget: boolean = false
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (isBudget) return errors;
  if (!scheduling) {
    errors['shipping_scheduling'] = 'Agendamento é obrigatório.';
    return errors;
  }

  const isDelivery = deliveryMethod === 'delivery';
  const isOptionalPickup = !isDelivery && (scheduling.notInformed || scheduling.immediatePickup);
  const isPending = Boolean(scheduling.pendingScheduling);

  if (isOptionalPickup || isPending) {
    return errors;
  }

  const isDateRange = scheduling.dateType === 'range';
  const rawStartDate = String(scheduling.date || '').trim();
  const rawEndDate = String(scheduling.endDate || '').trim();

  if (isDateRange) {
    if (!rawStartDate || !rawEndDate) {
      errors['shipping_date'] = 'Preencha a data inicial e a data final.';
    } else if (!isValidScheduleDate(rawStartDate) || !isValidScheduleDate(rawEndDate)) {
      errors['shipping_date'] = 'Preencha a data inicial e a data final.';
    } else {
      const normStart = normalizeScheduleDate(rawStartDate);
      const normEnd = normalizeScheduleDate(rawEndDate);
      if (normEnd < normStart) {
        errors['shipping_date'] = 'A data final não pode ser anterior à data inicial.';
      }
    }
  } else if (!rawStartDate || !isValidScheduleDate(rawStartDate)) {
    errors['shipping_date'] = 'Selecione uma data específica.';
  }

  const isTimeRange = scheduling.type === 'range';
  const { startTime: rawStartTime, endTime: rawEndTime } = extractScheduleTimes(scheduling);

  if (isTimeRange) {
    if (!rawStartTime || !rawEndTime) {
      errors['shipping_time'] = 'Preencha o horário inicial e o horário final.';
    } else if (!isValidScheduleTime(rawStartTime) || !isValidScheduleTime(rawEndTime)) {
      errors['shipping_time'] = 'Informe um horário válido.';
    } else if (rawEndTime <= rawStartTime) {
      errors['shipping_time'] = 'O horário final deve ser posterior ao horário inicial.';
    }
  } else if (!rawStartTime) {
    errors['shipping_time'] = 'Selecione um horário específico.';
  } else if (!isValidScheduleTime(rawStartTime)) {
    errors['shipping_time'] = 'Informe um horário válido.';
  }

  return errors;
};
