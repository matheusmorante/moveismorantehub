import { calcPaymentsSummary, calcItemsSummary } from "./calculations";
import { getSettings } from '@/pages/utils/settingsService';
import CustomerData from "../types/customerData.type";
import { Item } from "../types/items.type"
import { Payment } from "../types/payments.type";
import Shipping from "../types/Shipping.type";
import Order from "../types/order.type";

export type ValidationErrors = Record<string, string>;

export const validateItems = (items: Item[]): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!items || !Array.isArray(items)) return errors;
    items.forEach((item, idx) => {
        if (!item) return;
        if (!item.description || item.description.trim() === "") {
            errors[`item_${idx}_description`] = "A descrição do item é obrigatória.";
        }
    });
    return errors;
}

export const validatePayments = (
    payments: Payment[],
    amountRemaining: number
): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!payments || !Array.isArray(payments)) return errors;

    payments.forEach((payment, idx) => {
        if (!payment) return;
        if (!payment.status) {
            errors[`payment_${idx}_status`] = "O status do pagamento é obrigatório.";
        }
    });

    if (!payments || payments.length === 0) {
        errors['payments_summary'] = "Informe ao menos uma forma de pagamento.";
    } else if (Math.abs(amountRemaining) > 0.01) {
        if (amountRemaining > 0) {
            errors['payments_summary'] = `Ainda há R$ ${amountRemaining.toFixed(2).replace('.', ',')} a ser declarado.`;
        } else {
            errors['payments_summary'] = `O valor pago ultrapassou o total em R$ ${Math.abs(amountRemaining).toFixed(2).replace('.', ',')}.`;
        }
    }

    return errors;
}

export const validateCustomerData = (customer: CustomerData, isPickup: boolean = false): ValidationErrors => {
    const errors: ValidationErrors = {};
    const { requiredFields } = getSettings();

    if (!customer) return { customer: "Dados do cliente ausentes." };
    if (isPickup) return errors; // If pickup, customer info is NOT required per audio instructions

    if (!customer.fullName || !customer.fullName.trim()) {
        errors['customer_fullName'] = "Nome completo é obrigatório.";
    }

    if (requiredFields.customer?.phone && !customer.noPhone && (!customer.phone || !customer.phone.trim())) {
        errors['customer_phone'] = "Telefone/Celular é obrigatório.";
    }

    if (requiredFields.customer?.cpfCnpj && (!customer.cpfCnpj || !customer.cpfCnpj.trim())) {
        errors['customer_cpfCnpj'] = "CPF/CNPJ é obrigatório.";
    }
    // ... remaining checks, but only if NOT pickup ...
    // Wait, the audio said "nem o campo do cliente". So if pickup, I can skip ALL.
    return errors;
}

export const validateShipping = (shipping: Shipping, customer: CustomerData): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!shipping) return { shipping: "Dados de entrega ausentes." };

    const scheduling = shipping.scheduling;
    if (!scheduling) {
        errors['shipping_scheduling'] = "Agendamento é obrigatório.";
    } else {
        const isOptionalPickup = shipping.deliveryMethod === 'pickup' && scheduling.notInformed;
        
        if (!isOptionalPickup) {
            if (!scheduling.date) errors['shipping_date'] = "Data de entrega é obrigatória.";
            if (!scheduling.startTime) errors['shipping_time'] = "Horário/Período é obrigatório.";
        }
    }

    if (shipping.deliveryMethod === 'delivery') {
        if (shipping.useCustomerAddress !== false) {
            // Using customer address
            const addr = customer?.fullAddress;
            if (!addr?.street) errors['customer_street'] = "Rua é obrigatória (Cadastro do Cliente).";
            if (!addr?.number) errors['customer_number'] = "Número é obrigatório (Cadastro do Cliente).";
            if (!addr?.neighborhood) errors['customer_neighborhood'] = "Bairro é obrigatório (Cadastro do Cliente).";
            if (!addr?.city) errors['customer_city'] = "Cidade é obrigatória (Cadastro do Cliente).";
        } else {
            // Using custom delivery address
            const dAddr = shipping.deliveryAddress;
            if (!dAddr?.street) errors['deliveryAddress_street'] = "Rua é obrigatória (Endereço de Entrega).";
            if (!dAddr?.number) errors['deliveryAddress_number'] = "Número é obrigatório (Endereço de Entrega).";
            if (!dAddr?.neighborhood) errors['deliveryAddress_neighborhood'] = "Bairro é obrigatório (Endereço de Entrega).";
            if (!dAddr?.city) errors['deliveryAddress_city'] = "Cidade é obrigatória (Endereço de Entrega).";
        }
    }

    return errors;
}

export const validateSeller = (seller: Order['seller']): ValidationErrors => {
    const errors: ValidationErrors = {};
    const { requiredFields } = getSettings();
    if (requiredFields.salesOrder?.seller && !seller) {
        errors['seller'] = "Vendedor é obrigatório.";
    }
    return errors;
}

export const validateOrder = (order: Order): ValidationErrors => {
    if (!order) return { order: "Pedido não encontrado." };

    const isDraft = order.status === 'draft';
    const isAssistance = order.orderType === 'assistance' || (order.assistanceItems && order.assistanceItems.length > 0);
    const isPickup = order.shipping?.deliveryMethod === 'pickup';

    // Filter out genuinely empty items (no productId and no description)
    const validItems = (order.items || []).filter(item => item.productId || item.description);
    const items = validItems;

    const payments = order.payments || [];
    const shippingValue = order.shipping?.value || 0;
    const itemsSummary = calcItemsSummary(items);
    
    // For assistance orders, we must include the service value in the total to validate payments correctly
    let effectiveItemsTotalValue = itemsSummary.itemsTotalValue;
    if (order.orderType === 'assistance' && order.assistanceServiceValue) {
        effectiveItemsTotalValue += order.assistanceServiceValue;
    }

    const { amountRemaining } = calcPaymentsSummary(
        payments,
        { ...itemsSummary, itemsTotalValue: effectiveItemsTotalValue },
        shippingValue
    );

    const errors: ValidationErrors = {
        ...validateItems(items),
        ...validateCustomerData(order.customerData, isPickup)
    };

    // If it's not a draft, we require full validation
    if (!isDraft) {
        Object.assign(errors, {
            ...validateSeller(order.seller),
            ...validateShipping(order.shipping, order.customerData),
            ...validatePayments(payments, amountRemaining)
        });

        // Validate items presence for non-drafts. Must have either regular items or assistance items.
        const hasRegularItems = items.length > 0;
        const hasAssistanceItems = order.assistanceItems && order.assistanceItems.length > 0;
        
        if (!hasRegularItems && !hasAssistanceItems) {
            if (isAssistance) {
                errors['items_summary'] = "O pedido de assistência deve conter pelo menos um item (vinculado ao pedido original ou peça avulsa).";
            } else {
                errors['items_summary'] = "O pedido deve conter pelo menos um produto para ser finalizado.";
            }
        }
    }

    // Order Date is always important but for draft we could potentially skip it if we auto-fill, 
    // but here let's keep it as is or fill it in the service.
    if (!order.date || order.date.trim() === '') {
        errors['order_date'] = "A data do pedido é obrigatória.";
    }

    return errors;
}

// Keeping legacy validateBase for compatibility if needed, but updated to use new logic
export const validateBase = (order: Order) => {
    const errors = validateOrder(order);
    return Object.keys(errors).length === 0;
}

export const validateAssistanceOrder = (order: Order): ValidationErrors => {
    const errors: ValidationErrors = {};
    const { requiredFields } = getSettings();

    if (!order.customerData?.fullName && requiredFields.assistanceOrder?.customer) {
        errors['customer_fullName'] = "Nome do cliente é obrigatório.";
    }

    if (requiredFields.customer?.phone && (!order.customerData?.phone || !order.customerData.phone.trim())) {
        errors['customer_phone'] = "Telefone é obrigatório.";
    }

    if (!order.assistanceDescription) {
        errors['assistanceDescription'] = "Descrição do serviço é obrigatória.";
    }

    if (!order.seller && requiredFields.assistanceOrder?.seller) {
        errors['seller'] = "Vendedor é obrigatório.";
    }

    if (order.scheduledDate || order.scheduledTime) {
        if (!order.scheduledDate) errors['shipping_date'] = "Data é obrigatória.";
        if (!order.scheduledTime) errors['shipping_time'] = "Horário é obrigatório.";
    }

    // Check for items in assistance too
    const hasRegularItems = (order.items || []).some(item => !!item.productId);
    const hasAssistanceItems = (order.assistanceItems || []).length > 0;
    if (!hasRegularItems && !hasAssistanceItems) {
        errors['items_summary'] = "Selecione pelo menos um item do pedido original ou adicione uma peça/serviço avulso.";
    }

    return errors;
};

export const isOrderIncomplete = (order: Order) => {
    if (!order) return true;
    // Assistance orders have different required fields. 
    // We check either the explicit type or the presence of assistance items as a fallback.
    const isAssistance = order.orderType === 'assistance' || (order.assistanceItems && order.assistanceItems.length > 0);
    
    if (isAssistance) {
        return Object.keys(validateAssistanceOrder(order)).length > 0;
    }
    // All other order types use the full validation
    return !validateBase(order);
};

export const validateReviews = (order: Order): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!order || !order.customerData) return { order: "Dados insuficientes." };

    if (!order.customerData.fullName) {
        errors['customer_fullName'] = "Nome completo é obrigatório para o pedido de avaliação.";
    }
    return errors;
}
