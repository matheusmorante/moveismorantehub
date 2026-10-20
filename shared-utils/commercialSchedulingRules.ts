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

  if (scheduling.scheduleMode === 'alternatives') {
    const seen = new Set<string>([
      JSON.stringify([scheduling.dateType, scheduling.date, scheduling.endDate, scheduling.type, rawStartTime, rawEndTime]),
    ]);
    scheduling.alternatives?.forEach((alternative) => {
      const key = JSON.stringify([
        alternative.dateType,
        alternative.date,
        alternative.endDate,
        alternative.type,
        alternative.startTime || alternative.time,
        alternative.endTime,
      ]);
      const altErrors = validateShippingScheduling(
        { ...alternative, pendingScheduling: false, notInformed: false, immediatePickup: false },
        deliveryMethod,
        false
      );
      if (altErrors['shipping_date']) errors[`shipping_alternative_${alternative.id}_date`] = altErrors['shipping_date'];
      if (altErrors['shipping_time']) errors[`shipping_alternative_${alternative.id}_time`] = altErrors['shipping_time'];
      if (seen.has(key)) {
        errors[`shipping_alternative_${alternative.id}_duplicate`] = 'Esta programação duplica outra opção.';
      }
      seen.add(key);
    });
  }

  return errors;
};

export interface ScheduleOptionLike {
  id?: string;
  date?: string | null;
  endDate?: string | null;
  dateType?: 'fixed' | 'range' | string | null;
  time?: string | null;
  period?: 'morning' | 'afternoon' | 'full_day' | string | null;
  scheduleMode?: 'period' | 'time' | string | null;
  startTime?: string | null;
  endTime?: string | null;
  type?: 'fixed' | 'range' | string | null;
  notes?: string | null;
}

export interface ResolvedScheduleOption {
  id: string;
  index: number;
  isAlternative: boolean;
  label: string;
  shortLabel: string;
  date: string;
  endDate: string;
  dateType: 'fixed' | 'range';
  time: string;
  period?: string;
  startTime: string;
  endTime: string;
  type: 'fixed' | 'range';
  notes?: string;
  formattedDate: string;
  formattedTime: string;
  formattedSummary: string;
  cutoffDate: string;
  cutoffTime: string;
  hasPassed: boolean;
}

export interface EffectiveScheduleResolution {
  primary: ResolvedScheduleOption | null;
  defined: ResolvedScheduleOption | null;
  alternatives: ResolvedScheduleOption[];
  hasAlternatives: boolean;
  allOptions: ResolvedScheduleOption[];
  effective: ResolvedScheduleOption | null;
  isUsingAlternative: boolean;
  isRepositioned: boolean;
  repositionedFrom: ResolvedScheduleOption | null;
  alternativesSummaryText: string;
}

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

export const resolveScheduleOptionCutoffTime = (option?: ScheduleOptionLike | null): string => {
  if (!option) return '23:59';
  const { startTime, endTime } = extractScheduleTimes(option as any);
  if (isValidScheduleTime(endTime)) return endTime;
  if (isValidScheduleTime(startTime)) return startTime;
  const rawPeriod = String(option.period || '').trim().toLowerCase();
  if (rawPeriod === 'morning') return MORNING_SHIFT.endTime;
  if (rawPeriod === 'afternoon') return AFTERNOON_SHIFT.endTime;
  if (rawPeriod === 'full_day') return '23:59';
  const rawTime = String(option.time || '').trim().toLowerCase();
  if (rawTime.includes('manhã') || rawTime.includes('manha')) return MORNING_SHIFT.endTime;
  if (rawTime.includes('tarde') || rawTime.includes('comercial')) return AFTERNOON_SHIFT.endTime;
  if (rawTime.includes('noite')) return '22:00';
  if (isValidScheduleTime(rawTime)) return normalizeScheduleTime(rawTime);
  return '23:59';
};

export const hasScheduleOptionPassed = (
  option?: ScheduleOptionLike | null,
  referenceDate: Date = new Date()
): boolean => {
  if (!option || !isValidScheduleDate(option.date)) return false;
  const startNorm = normalizeScheduleDate(option.date);
  const endNorm = normalizeScheduleDate(option.endDate);
  const cutoffDate =
    option.dateType === 'range' && isValidScheduleDate(endNorm) && endNorm >= startNorm
      ? endNorm
      : startNorm;
  const cutoffTime = resolveScheduleOptionCutoffTime(option);
  const nowSp = getSaoPauloDateTimeParts(referenceDate);
  if (nowSp.isoDate > cutoffDate) return true;
  if (nowSp.isoDate < cutoffDate) return false;
  return nowSp.timeHHMM > cutoffTime;
};

const TERMINAL_ORDER_STATUSES = new Set([
  'fulfilled',
  'completed',
  'cancelled',
  'canceled',
  'delivered',
  'picked_up',
]);

export const isTerminalOrderForScheduling = (input: any): boolean => {
  if (!input || typeof input !== 'object') return false;
  const status = String(input.status || input.order_data?.status || '')
    .trim()
    .toLowerCase();
  if (TERMINAL_ORDER_STATUSES.has(status)) return true;
  const deliveryStatus = String(
    input.delivery_status ||
      input.deliveryStatus ||
      input.shipping?.deliveryStatus?.status ||
      input.order_data?.shipping?.deliveryStatus?.status ||
      input.order_data?.deliveryStatus?.status ||
      input.order_data?.deliveryStatus ||
      ''
  )
    .trim()
    .toLowerCase();
  if (deliveryStatus === 'delivered' || deliveryStatus === 'completed') return true;
  const handlingStatus = String(
    input.handling?.status || input.order_data?.handling?.status || ''
  )
    .trim()
    .toLowerCase();
  if (handlingStatus === 'completed') return true;
  return false;
};

export const extractRawSchedulingObject = (
  input: any
): Partial<Shipping['scheduling']> | null => {
  if (!input || typeof input !== 'object') return null;
  const fromOrderData =
    input.order_data?.shipping?.scheduling || input.order_data?.scheduling || null;
  const fromShipping = input.shipping?.scheduling || null;
  const fromDirectScheduling = input.scheduling || null;

  const looksLikeScheduling =
    !fromOrderData &&
    !fromShipping &&
    !fromDirectScheduling &&
    ('date' in input ||
      'startDate' in input ||
      'alternatives' in input ||
      'pendingScheduling' in input ||
      'immediatePickup' in input ||
      'notInformed' in input ||
      'startTime' in input ||
      'time' in input);

  const mergedOrderScheduling =
    fromOrderData || fromShipping
      ? {
          ...(fromOrderData || {}),
          ...(fromShipping || {}),
          alternatives: fromShipping?.alternatives ?? fromOrderData?.alternatives,
          scheduleMode: fromShipping?.scheduleMode ?? fromOrderData?.scheduleMode,
        }
      : null;

  const rawSched: any =
    mergedOrderScheduling || fromDirectScheduling || (looksLikeScheduling ? input : {}) || {};

  const fallbackDate =
    rawSched.date ||
    rawSched.startDate ||
    rawSched.scheduledDate ||
    rawSched.scheduled_date ||
    input.scheduled_date ||
    input.scheduledDate ||
    input.order_data?.scheduled_date ||
    input.order_data?.scheduledDate ||
    '';

  const fallbackTime =
    rawSched.time ||
    input.scheduled_time ||
    input.scheduledTime ||
    input.order_data?.scheduled_time ||
    input.order_data?.scheduledTime ||
    '';

  const fallbackPeriod =
    rawSched.period ||
    input.scheduled_period ||
    input.scheduledPeriod ||
    input.order_data?.scheduled_period ||
    input.order_data?.scheduledPeriod ||
    '';

  const fallbackStartTime =
    rawSched.startTime ||
    input.scheduled_start_time ||
    input.schedule_start_time ||
    input.scheduledStartTime ||
    '';

  const fallbackEndTime =
    rawSched.endTime ||
    input.scheduled_end_time ||
    input.schedule_end_time ||
    input.scheduledEndTime ||
    '';

  if (
    !fallbackDate &&
    !fallbackStartTime &&
    !fallbackEndTime &&
    !fallbackTime &&
    !fallbackPeriod &&
    !rawSched.time &&
    !rawSched.pendingScheduling &&
    !rawSched.immediatePickup &&
    !rawSched.notInformed &&
    (!Array.isArray(rawSched.alternatives) || rawSched.alternatives.length === 0)
  ) {
    return null;
  }

  return {
    ...rawSched,
    date: fallbackDate ? normalizeScheduleDate(String(fallbackDate)) : rawSched.date || '',
    time: fallbackTime ? String(fallbackTime) : rawSched.time || '',
    period: fallbackPeriod || rawSched.period,
    startTime: fallbackStartTime
      ? normalizeScheduleTime(String(fallbackStartTime))
      : rawSched.startTime || '',
    endTime: fallbackEndTime
      ? normalizeScheduleTime(String(fallbackEndTime))
      : rawSched.endTime || '',
  };
};

export const buildResolvedScheduleOption = (
  option?: ScheduleOptionLike | null,
  index: number = 0,
  referenceDate: Date = new Date()
): ResolvedScheduleOption | null => {
  if (!option || !isValidScheduleDate(option.date)) return null;
  const date = normalizeScheduleDate(option.date);
  const rawEndDate = normalizeScheduleDate(option.endDate);
  const dateType: 'fixed' | 'range' =
    option.dateType === 'range' && isValidScheduleDate(rawEndDate) && rawEndDate >= date
      ? 'range'
      : 'fixed';
  const endDate = dateType === 'range' ? rawEndDate : '';
  const { startTime, endTime } = extractScheduleTimes(option as any);
  const type: 'fixed' | 'range' =
    option.type === 'range' || Boolean(startTime && endTime && startTime !== endTime)
      ? 'range'
      : 'fixed';
  const formattedDate = formatScheduleOptionDateBr({ ...option, date, endDate, dateType });
  const formattedTime = formatScheduleOptionTime({
    ...option,
    startTime,
    endTime,
    type,
  });
  const time = formattedTime || String(option.time || '').trim();
  const formattedSummary = formattedTime ? `${formattedDate} • ${formattedTime}` : formattedDate;
  const cutoffDate = dateType === 'range' && endDate ? endDate : date;
  const cutoffTime = resolveScheduleOptionCutoffTime({
    ...option,
    startTime,
    endTime,
    type,
  });
  const isAlternative = index > 0;
  const label = isAlternative ? `${index}ª alternativa` : 'Data definida';
  const shortLabel = isAlternative ? `Alt. ${index}` : 'Definida';
  const hasPassed = hasScheduleOptionPassed(
    { date, endDate, dateType, time, startTime, endTime, type, period: option.period },
    referenceDate
  );

  return {
    id: option.id || (isAlternative ? `alt-${index}` : 'primary'),
    index,
    isAlternative,
    label,
    shortLabel,
    date,
    endDate,
    dateType,
    time,
    period: option.period || undefined,
    startTime,
    endTime,
    type,
    notes: option.notes || undefined,
    formattedDate,
    formattedTime,
    formattedSummary,
    cutoffDate,
    cutoffTime,
    hasPassed,
  };
};

/**
 * Resolve a programação definida (principal), as datas alternativas informativas
 * e a opção efetiva de posicionamento na agenda/cronograma (ERP e Mobile).
 *
 * Regras:
 * 1. As datas/horários definidos e alternativos são estritamente informativos (nunca bloqueiam a entrega).
 * 2. Cada pedido possui um único card (nunca duplica cards por alternativa).
 * 3. Quando a data e o período da programação definida passam (e o pedido ainda não foi concluído/cancelado),
 *    o posicionamento efetivo do card avança automaticamente para o próximo agendamento alternativo válido.
 */
export const resolveEffectiveSchedule = (
  input: any,
  referenceDate: Date = new Date()
): EffectiveScheduleResolution => {
  const rawSched = extractRawSchedulingObject(input);
  if (!rawSched || (rawSched.pendingScheduling && !rawSched.immediatePickup)) {
    return {
      primary: null,
      defined: null,
      alternatives: [],
      hasAlternatives: false,
      allOptions: [],
      effective: null,
      isUsingAlternative: false,
      isRepositioned: false,
      repositionedFrom: null,
      alternativesSummaryText: '',
    };
  }

  const primary = buildResolvedScheduleOption(
    {
      id: 'primary',
      date: rawSched.date,
      endDate: rawSched.endDate,
      dateType: rawSched.dateType,
      time: rawSched.time,
      period: rawSched.period,
      startTime: rawSched.startTime,
      endTime: rawSched.endTime,
      type: rawSched.type,
      notes: (rawSched as any).notes,
    },
    0,
    referenceDate
  );

  const rawAlternatives = Array.isArray(rawSched.alternatives) ? rawSched.alternatives : [];
  const alternatives: ResolvedScheduleOption[] = [];
  rawAlternatives.forEach((alt) => {
    const resolvedAlt = buildResolvedScheduleOption(alt, alternatives.length + 1, referenceDate);
    if (resolvedAlt) {
      alternatives.push(resolvedAlt);
    }
  });

  const allOptions = [...(primary ? [primary] : []), ...alternatives];

  const alternativesSummaryText = alternatives
    .map((alt) =>
      alt.formattedTime ? `${alt.formattedDate} (${alt.formattedTime})` : alt.formattedDate
    )
    .join(' • ');

  if (allOptions.length === 0) {
    return {
      primary: null,
      defined: null,
      alternatives: [],
      hasAlternatives: false,
      allOptions: [],
      effective: null,
      isUsingAlternative: false,
      isRepositioned: false,
      repositionedFrom: null,
      alternativesSummaryText: '',
    };
  }

  const isTerminal = isTerminalOrderForScheduling(input);

  if (isTerminal || alternatives.length === 0 || (primary && !primary.hasPassed)) {
    const effective = primary || alternatives[0] || null;
    return {
      primary,
      defined: primary,
      alternatives,
      hasAlternatives: alternatives.length > 0,
      allOptions,
      effective,
      isUsingAlternative: Boolean(effective && effective !== primary),
      isRepositioned: Boolean(effective && effective !== primary),
      repositionedFrom: effective && effective !== primary ? primary : null,
      alternativesSummaryText,
    };
  }

  // Ordena alternativas cronologicamente por data inicial e horário
  const sortedAlternatives = [...alternatives].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const aStart = a.startTime || a.cutoffTime;
    const bStart = b.startTime || b.cutoffTime;
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    return a.index - b.index;
  });

  const nextUpcomingAlternative = sortedAlternatives.find((alt) => !alt.hasPassed);
  if (nextUpcomingAlternative) {
    return {
      primary,
      defined: primary,
      alternatives,
      hasAlternatives: alternatives.length > 0,
      allOptions,
      effective: nextUpcomingAlternative,
      isUsingAlternative: true,
      isRepositioned: true,
      repositionedFrom: primary,
      alternativesSummaryText,
    };
  }

  // Se todas as opções já passaram, mantém a programação original definida para fins informativos
  const fallback = primary || alternatives[0] || null;
  return {
    primary,
    defined: primary,
    alternatives,
    hasAlternatives: alternatives.length > 0,
    allOptions,
    effective: fallback,
    isUsingAlternative: false,
    isRepositioned: false,
    repositionedFrom: null,
    alternativesSummaryText,
  };
};
