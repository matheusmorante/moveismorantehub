import {
  resolveEffectiveSchedule,
  MORNING_SHIFT,
  AFTERNOON_SHIFT,
} from '../../../../../shared-utils/commercialOrderRules';

export interface DeliverySchedulePeriod {
  label: string;
  isFixed: boolean;
  windowStart?: string;
  windowEnd?: string;
  sortWeight: number;
}

const DEFAULT_START_MINUTES = 480;

const getMinutesFromTime = (time: string, fallback: number): number => {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
};

/**
 * Normaliza a promessa de horário registrada em order_data.shipping.scheduling,
 * respeitando a opção efetiva (avança para alternativas se a principal expirou).
 */
export const getDeliverySchedulePeriod = (
  shippingOrOrder: unknown,
  referenceDate: Date = new Date()
): DeliverySchedulePeriod => {
  const resolution = resolveEffectiveSchedule(shippingOrOrder, referenceDate);
  if (resolution.effective) {
    const eff = resolution.effective;
    const isFixed = eff.type === 'fixed' || (!eff.endTime && Boolean(eff.startTime));
    const label = eff.formattedTime
      ? isFixed
        ? `🔒 ${eff.formattedTime}`
        : eff.formattedTime
      : 'HORÁRIO COMERCIAL';

    return {
      label,
      isFixed,
      windowStart: eff.startTime,
      windowEnd: eff.endTime,
      sortWeight: getMinutesFromTime(eff.startTime || eff.cutoffTime, DEFAULT_START_MINUTES),
    };
  }

  const shipping =
    (shippingOrOrder as any)?.shipping || (shippingOrOrder as any)?.order_data?.shipping || shippingOrOrder;
  const scheduling = (shipping as any)?.scheduling ?? {};
  const rawTime = String(scheduling.time ?? '').trim();
  const startTime = String(scheduling.startTime ?? '').trim();
  const endTime = String(scheduling.endTime ?? '').trim();
  const scheduleType = String(scheduling.type ?? scheduling.dateType ?? '').toLowerCase();

  const hasRange =
    (startTime && endTime && startTime !== endTime) ||
    scheduleType === 'range' ||
    rawTime.includes('-') ||
    rawTime.includes('às') ||
    rawTime.includes('ate');

  if (hasRange) {
    const start = startTime || (rawTime.split('-')[0] || rawTime).trim();
    const end = endTime || (rawTime.split('-')[1] || '').trim();
    return {
      label: start && end ? `${start}–${end}` : start || end || rawTime,
      isFixed: false,
      windowStart: start,
      windowEnd: end,
      sortWeight: getMinutesFromTime(start, DEFAULT_START_MINUTES),
    };
  }

  const isFixed =
    scheduleType === 'fixed' ||
    (startTime && !endTime) ||
    (rawTime.includes(':') && !rawTime.includes('-'));
  if (isFixed) {
    const displayTime = startTime || rawTime || 'Horário Combinado';
    return {
      label: `🔒 ${displayTime}`,
      isFixed: true,
      windowStart: startTime || rawTime,
      windowEnd: endTime,
      sortWeight: getMinutesFromTime(startTime || rawTime, DEFAULT_START_MINUTES),
    };
  }

  const lowerTime = rawTime.toLowerCase();
  if (lowerTime.includes('manhã') || lowerTime.includes('manha')) {
    return {
      label: 'MANHÃ · 08:00–12:00',
      isFixed: false,
      windowStart: MORNING_SHIFT.startTime,
      windowEnd: MORNING_SHIFT.endTime,
      sortWeight: 480,
    };
  }
  if (lowerTime.includes('tarde')) {
    return {
      label: 'TARDE · 13:00–18:00',
      isFixed: false,
      windowStart: AFTERNOON_SHIFT.startTime,
      windowEnd: AFTERNOON_SHIFT.endTime,
      sortWeight: 780,
    };
  }
  if (lowerTime.includes('noite')) {
    return {
      label: 'NOITE · 18:00–21:00',
      isFixed: false,
      windowStart: '18:00',
      windowEnd: '21:00',
      sortWeight: 1080,
    };
  }

  return {
    label: rawTime ? rawTime.toUpperCase() : 'HORÁRIO COMERCIAL',
    isFixed: false,
    sortWeight: DEFAULT_START_MINUTES,
  };
};
