import type CustomerData from '../erp/src/pages/types/customerData.type';
import type Shipping from '../erp/src/pages/types/Shipping.type';
import type { CommercialRequiredFields } from './commercialDomainTypes';
import {
  validateShippingScheduling,
  type ValidationErrors,
} from './commercialSchedulingRules';
import type { AppointmentItem } from './commercialScheduling/validationRules';

export * from './commercialSchedulingRules';

export const validateCustomerData = (
  customer: CustomerData,
  isPickup: boolean = false,
  requiredFields: CommercialRequiredFields = {}
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!customer) return { customer: 'Dados do cliente ausentes.' };

  if (!customer.fullName || !customer.fullName.trim()) {
    errors['customer_fullName'] = 'Nome completo é obrigatório.';
  }

  const isFinalConsumer =
    !customer.id && String(customer.fullName || '').trim().toLowerCase() === 'consumidor final';

  if (!customer.noPhone && !isPickup && (!customer.phone || !customer.phone.trim())) {
    errors['customer_phone'] = 'Telefone/Celular é obrigatório.';
  }

  if (
    !isFinalConsumer &&
    requiredFields.customer?.cpfCnpj &&
    (!customer.cpfCnpj || !customer.cpfCnpj.trim())
  ) {
    errors['customer_cpfCnpj'] = 'CPF/CNPJ é obrigatório.';
  }

  return errors;
};

export const validateShipping = (
  shipping: Shipping,
  customer: CustomerData,
  isBudget: boolean = false,
  items?: ReadonlyArray<AppointmentItem>,
  isSale: boolean = false,
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!shipping) return { shipping: 'Dados de entrega ausentes.' };

  Object.assign(
    errors,
    validateShippingScheduling(shipping.scheduling, shipping.deliveryMethod, isBudget, items)
  );

  if (isSale && !isBudget) {
    const appointments = shipping.scheduling?.appointments;
    const deliveryAppointments = appointments?.filter(
      (appointment) => appointment.deliveryMethod === 'delivery' ||
        (!appointment.deliveryMethod && shipping.deliveryMethod === 'delivery')
    );
    const requiredNotices = [
      ['callBeforeDelivery', 'Selecione se é necessário ligar antes da entrega.'],
      ['bringCardMachine', 'Selecione se é necessário levar máquina de cartão.'],
      ['callOnArrival', 'Selecione se é necessário ligar ao chegar.'],
    ] as const;

    if (deliveryAppointments?.length) {
      for (const appointment of deliveryAppointments) {
        for (const [field, message] of requiredNotices) {
          if (appointment.notices?.[field] === undefined) {
            errors[`shipping_appointment_${appointment.id}_notices_${field}`] = message;
          }
        }
      }
    } else if (!appointments?.length && shipping.deliveryMethod === 'delivery') {
      for (const [field, message] of requiredNotices) {
        if (shipping[field] === undefined) errors[`shipping_${field}`] = message;
      }
    }
  }

  const noAddressRequired =
    shipping.noAddress || (shipping.useCustomerAddress !== false && customer?.noAddress);

  const appointments = shipping.scheduling?.appointments;
  const deliveryAppointments = appointments?.filter(
    (appointment) => appointment.deliveryMethod === 'delivery'
  );

  if (isSale && !isBudget && deliveryAppointments?.length) {
      for (const appointment of deliveryAppointments) {
        const useCustomerAddress = appointment.useCustomerAddress !== false;
        const distanceNotRequired = useCustomerAddress && (shipping.noAddress || customer?.noAddress);
        if (!distanceNotRequired && (!Number.isFinite(appointment.distance) || (appointment.distance ?? 0) <= 0)) {
          errors[`shipping_appointment_${appointment.id}_distance`] =
            'Distância da entrega é obrigatória e deve ser maior que zero.';
        }
      }
  } else if (
      !isBudget && shipping.deliveryMethod === 'delivery' &&
      (!isSale || !appointments?.length) &&
      (!Number.isFinite(shipping.distance) || (shipping.distance ?? 0) <= 0)
  ) {
    errors['shipping_distance'] = 'Distância da entrega é obrigatória e deve ser maior que zero.';
  }

  if (isSale && !isBudget && deliveryAppointments?.length) {
      for (const appointment of deliveryAppointments) {
        const useCustomerAddress = appointment.useCustomerAddress !== false;
        const addressNotRequired = useCustomerAddress && (shipping.noAddress || customer?.noAddress);
        if (addressNotRequired) continue;

        const address = useCustomerAddress ? customer?.fullAddress : appointment.deliveryAddress;
        const prefix = `shipping_appointment_${appointment.id}_address`;
        if (!address?.street?.trim()) errors[`${prefix}_street`] = 'Rua é obrigatória.';
        if (!address?.number?.trim()) errors[`${prefix}_number`] = 'Número é obrigatório.';
        if (!address?.city?.trim()) errors[`${prefix}_city`] = 'Cidade é obrigatória.';
      }
  } else if (
    !isBudget && shipping.deliveryMethod === 'delivery' &&
    (!isSale || !appointments?.length) && !noAddressRequired
  ) {
    if (shipping.useCustomerAddress !== false) {
      const addr = customer?.fullAddress;
      if (!addr?.street?.trim()) errors['customer_street'] = 'Rua é obrigatória.';
      if (!addr?.number?.trim()) errors['customer_number'] = 'Número é obrigatório.';
      if (!addr?.city?.trim()) errors['customer_city'] = 'Cidade é obrigatória.';
    } else {
      const dAddr = shipping.deliveryAddress;
      if (!dAddr?.street?.trim()) errors['deliveryAddress_street'] = 'Rua é obrigatória.';
      if (!dAddr?.number?.trim()) errors['deliveryAddress_number'] = 'Número é obrigatório.';
      if (!dAddr?.city?.trim()) errors['deliveryAddress_city'] = 'Cidade é obrigatória.';
    }
  }

  return errors;
};
