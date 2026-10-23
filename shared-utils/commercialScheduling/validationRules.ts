import type Shipping from '../../erp/src/pages/types/Shipping.type';
import {
  isValidScheduleDate,
  normalizeScheduleDate,
  isValidScheduleTime,
  extractScheduleTimes,
} from './formattingUtils';
import type { ValidationErrors } from './types';

const hasScheduleOptionInput = (
  option?: Partial<Shipping['scheduling']> | null
): boolean => {
  if (!option) return false;
  const { startTime, endTime } = extractScheduleTimes(option);
  return Boolean(
    String(option.date || '').trim() ||
      String(option.endDate || '').trim() ||
      startTime ||
      endTime
  );
};

const validateScheduleOption = (
  scheduling: Partial<Shipping['scheduling']>
): ValidationErrors => {
  const errors: ValidationErrors = {};
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

const getScheduleOptionSignature = (option: Partial<Shipping['scheduling']>): string => {
  const { startTime, endTime } = extractScheduleTimes(option);
  return JSON.stringify([
    option.dateType,
    option.date,
    option.endDate,
    option.type,
    startTime,
    endTime,
  ]);
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

  const isAlternativesMode = scheduling.scheduleMode === 'alternatives';
  const hasPrimaryInput = hasScheduleOptionInput(scheduling);

  // The primary schedule remains required in alternatives mode too.
  Object.assign(errors, validateScheduleOption(scheduling));

  if (isAlternativesMode) {
    const seen = new Set<string>();
    if (hasPrimaryInput) seen.add(getScheduleOptionSignature(scheduling));

    scheduling.alternatives?.forEach((alternative) => {
      const hasAlternativeInput = hasScheduleOptionInput(alternative);
      const key = getScheduleOptionSignature(alternative);
      const altErrors = validateScheduleOption(alternative);

      if (altErrors['shipping_date']) {
        errors[`shipping_alternative_${alternative.id}_date`] = altErrors['shipping_date'];
      }
      if (altErrors['shipping_time']) {
        errors[`shipping_alternative_${alternative.id}_time`] = altErrors['shipping_time'];
      }
      if (hasAlternativeInput && seen.has(key)) {
        errors[`shipping_alternative_${alternative.id}_duplicate`] =
          'Esta programação duplica outra opção.';
      }
      if (hasAlternativeInput) seen.add(key);
    });
  }

  return errors;
};
