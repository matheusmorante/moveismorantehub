import type Shipping from '../../erp/src/pages/types/Shipping.type';
import {
  MORNING_SHIFT,
  AFTERNOON_SHIFT,
  getSaoPauloDateTimeParts,
} from './timezoneUtils';
import {
  normalizeScheduleDate,
  isValidScheduleDate,
  normalizeScheduleTime,
  isValidScheduleTime,
  extractScheduleTimes,
  formatScheduleOptionDateBr,
  formatScheduleOptionTime,
} from './formattingUtils';
import type {
  ScheduleOptionLike,
  ResolvedScheduleOption,
  EffectiveScheduleResolution,
} from './types';

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
  'atendido',
  'entregue',
  'retirado',
  'cancelado',
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
  if (
    deliveryStatus === 'delivered' ||
    deliveryStatus === 'completed' ||
    deliveryStatus === 'entregue'
  ) {
    return true;
  }
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
 * 3. Quando a data e o período da programação definida passam e o pedido NÃO foi atendido,
 *    o posicionamento efetivo do card avança automaticamente para o próximo agendamento alternativo válido.
 * 4. Se o pedido foi atendido (status = fulfilled), ele permanece fixado e não avança para alternativas.
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

  // Se todas as opções já passaram e o pedido não foi atendido:
  // Se existirem alternativas, mantém o agendamento na última alternativa tentada com o rótulo de ALTERNATIVO
  if (sortedAlternatives.length > 0) {
    const lastAlternative = sortedAlternatives[sortedAlternatives.length - 1];
    return {
      primary,
      defined: primary,
      alternatives,
      hasAlternatives: true,
      allOptions,
      effective: lastAlternative,
      isUsingAlternative: true,
      isRepositioned: true,
      repositionedFrom: primary,
      alternativesSummaryText,
    };
  }

  // Sem alternativas, mantém a programação principal definida
  return {
    primary,
    defined: primary,
    alternatives,
    hasAlternatives: false,
    allOptions,
    effective: primary,
    isUsingAlternative: false,
    isRepositioned: false,
    repositionedFrom: null,
    alternativesSummaryText,
  };
};
