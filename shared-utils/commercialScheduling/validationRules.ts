import type Shipping from '../../erp/src/pages/types/Shipping.type';
import {
  isValidScheduleDate,
  normalizeScheduleDate,
  isValidScheduleTime,
  extractScheduleTimes,
} from './formattingUtils';
import type { ValidationErrors } from './types';
import { requiresAssemblyResponsible } from '../orderHandlingRules';

export type AppointmentItem = {
  orderItemId?: string;
  quantity: number;
  itemType?: 'product' | 'service';
  isComboItem?: boolean;
  handlingType?: string;
  assemblyResponsible?: 'Nossa equipe' | 'Montador terceirizado' | '';
};

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

const validateSingleScheduling = (
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

  const hasAlternatives = Boolean(scheduling.alternatives?.length);
  const hasPrimaryInput = hasScheduleOptionInput(scheduling);

  Object.assign(errors, validateScheduleOption(scheduling));

  if (hasAlternatives) {
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

export const validateShippingScheduling = (
  scheduling?: Shipping['scheduling'] | null,
  deliveryMethod: Shipping['deliveryMethod'] = 'delivery',
  isBudget: boolean = false,
  items?: ReadonlyArray<AppointmentItem>
): ValidationErrors => {
  const firstDeliveryMethod = scheduling?.appointments?.[0]?.deliveryMethod ?? deliveryMethod;
  const errors = validateSingleScheduling(scheduling, firstDeliveryMethod, isBudget);
  if (!scheduling || isBudget) return errors;

  const totals = new Map<string, number>();
  const available = items && new Map(items.filter((item) => item.orderItemId).map((item) => [item.orderItemId!, item.quantity]));
  const itemsById = items && new Map(items.filter((item) => item.orderItemId).map((item) => [item.orderItemId!, item]));
  scheduling.appointments?.forEach((appointment, index) => {
    const prefix = `shipping_appointment_${appointment.id}`;
    if (!appointment.deliveryMethod) {
      errors[`${prefix}_deliveryMethod`] = 'Selecione Entrega ou Retirada para este agendamento.';
    }
    if (appointment.itemIds.length === 0) {
      errors[`${prefix}_items`] = 'Selecione os itens deste agendamento.';
    }
    if (new Set(appointment.itemIds).size !== appointment.itemIds.length) {
      errors[`${prefix}_items`] = 'Um item não pode ser selecionado duas vezes no mesmo agendamento.';
    }
    appointment.itemIds.forEach((itemId) => {
      if (available && !available.has(itemId)) {
        errors[`${prefix}_items`] = 'Um item selecionado não está mais no pedido.';
      }
      const hasExplicitQuantity = Boolean(
        appointment.itemQuantities &&
          Object.prototype.hasOwnProperty.call(appointment.itemQuantities, itemId)
      );
      if (hasExplicitQuantity) {
        const quantity = appointment.itemQuantities?.[itemId];
        if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
          errors[`${prefix}_items`] = 'Informe uma quantidade maior que zero para cada item selecionado.';
        } else {
          totals.set(itemId, (totals.get(itemId) || 0) + quantity);
        }
      } else if (available?.has(itemId)) {
        // Older/partial snapshots can contain itemIds before quantities were persisted.
        // In that case the selected item represents its full order quantity.
        totals.set(itemId, (totals.get(itemId) || 0) + available.get(itemId)!);
      }
      const item = itemsById?.get(itemId);
      if (item && item.itemType !== 'service' && !item.isComboItem) {
        const handling = appointment.itemHandlings === undefined
          ? { handlingType: item.handlingType, assemblyResponsible: item.assemblyResponsible }
          : appointment.itemHandlings[itemId];
        if (!handling?.handlingType?.trim()) {
          errors[`${prefix}_handling_${itemId}`] = 'Selecione o manuseio do item.';
        } else if (
          requiresAssemblyResponsible(handling.handlingType, appointment.deliveryMethod ?? deliveryMethod) &&
          !handling.assemblyResponsible
        ) {
          errors[`${prefix}_assembly_${itemId}`] = 'Selecione o responsável pela montagem.';
        }
      }
    });
    if (appointment.itemQuantities && Object.keys(appointment.itemQuantities).some((id) => !appointment.itemIds.includes(id))) {
      errors[`${prefix}_items`] = 'Há quantidade informada para um item não selecionado.';
    }
    // The first appointment is mirrored at the root for legacy consumers.
    if (index === 0) return;
    const appointmentErrors = validateSingleScheduling(
      appointment.scheduling,
      appointment.deliveryMethod ?? deliveryMethod,
      false
    );
    Object.entries(appointmentErrors).forEach(([key, message]) => {
      const suffix = key.startsWith('shipping_') ? key.slice('shipping_'.length) : key;
      errors[`${prefix}_${suffix}`] = message;
    });
  });

  if (available) {
    scheduling.appointments?.forEach((appointment) => {
      if (appointment.itemIds.some((id) => (totals.get(id) || 0) > (available.get(id) ?? Infinity) + 1e-9)) {
        errors[`shipping_appointment_${appointment.id}_items`] = 'A quantidade agendada supera a quantidade do pedido.';
      }
    });
    if (scheduling.appointments?.length) {
      const missing = [...available.entries()].some(([id, quantity]) =>
        (totals.get(id) || 0) + 1e-9 < quantity
      );
      if (missing) {
        const last = scheduling.appointments[scheduling.appointments.length - 1];
        errors[`shipping_appointment_${last.id}_items`] ||= 'Distribua todas as unidades dos itens entre os agendamentos.';
      }
    }
  }

  return errors;
};
