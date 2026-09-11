import CustomerData from "../types/customerData.type";
import Shipping from "../types/Shipping.type";
import { getSettings } from './settingsService';

export type ValidationErrors = Record<string, string>;

export const validateCustomerData = (customer: CustomerData, isPickup: boolean = false): ValidationErrors => {
    const errors: ValidationErrors = {};
    const { requiredFields } = getSettings();

    if (!customer) return { customer: "Dados do cliente ausentes." };

    if (!customer.fullName || !customer.fullName.trim()) {
        errors['customer_fullName'] = "Nome completo é obrigatório.";
    }

    if (!customer.noPhone && !isPickup && (!customer.phone || !customer.phone.trim())) {
        errors['customer_phone'] = "Telefone/Celular é obrigatório.";
    }

    if (requiredFields.customer?.cpfCnpj && (!customer.cpfCnpj || !customer.cpfCnpj.trim())) {
        errors['customer_cpfCnpj'] = "CPF/CNPJ é obrigatório.";
    }

    return errors;
};

export const validateShipping = (shipping: Shipping, customer: CustomerData, isBudget: boolean = false): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!shipping) return { shipping: "Dados de entrega ausentes." };

    const scheduling = shipping.scheduling;
    if (!scheduling && !isBudget) {
        errors['shipping_scheduling'] = "Agendamento é obrigatório.";
    } else if (scheduling) {
        const isDelivery = shipping.deliveryMethod === 'delivery';
        const isOptionalPickup = !isDelivery && scheduling.notInformed;
        const isPending = scheduling.pendingScheduling;
        
        if (!isOptionalPickup && !isBudget && !isPending) {
            if (!scheduling.date) errors['shipping_date'] = "Data é obrigatória.";
            if (!scheduling.startTime) errors['shipping_time'] = "Horário/Período é obrigatório.";
        }
    }

    const noAddressRequired = shipping.noAddress || (shipping.useCustomerAddress !== false && customer?.noAddress);
    
    if (shipping.deliveryMethod === 'delivery' && !noAddressRequired && !isBudget) {
        if (shipping.useCustomerAddress !== false) {
            const addr = customer?.fullAddress;
            if (!addr?.street) errors['customer_street'] = "Rua é obrigatória.";
            if (!addr?.number) errors['customer_number'] = "Número é obrigatório.";
            if (!addr?.city) errors['customer_city'] = "Cidade é obrigatória.";
        } else {
            const dAddr = shipping.deliveryAddress;
            if (!dAddr?.street) errors['deliveryAddress_street'] = "Rua é obrigatória.";
            if (!dAddr?.number) errors['deliveryAddress_number'] = "Número é obrigatório.";
            if (!dAddr?.city) errors['deliveryAddress_city'] = "Cidade é obrigatória.";
        }
    }

    return errors;
};
