import { calcPaymentsSummary, calcItemsSummary } from "./calculations";
import { getSettings } from '@/pages/utils/settingsService';
import CustomerData from "../types/customerData.type";
import { Item } from "../types/items.type"
import { Payment } from "../types/payments.type";
import Shipping from "../types/Shipping.type";
import Order from "../types/order.type";

export type ValidationErrors = Record<string, string>;

export const validateItems = (items: Item[], isBudget: boolean = false): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!items || !Array.isArray(items)) return errors;
    items.forEach((item, idx) => {
        if (!item) return;
        if (!item.description || item.description.trim() === "") {
            errors[`item_${idx}_description`] = "A descrição do item é obrigatória.";
        }
        // No longer has default, must be explicitly selected
        if (!isBudget && (!item.handlingType || item.handlingType.trim() === "")) {
            errors[`item_${idx}_handlingType`] = "O manuseio do item é obrigatório.";
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

    if (!customer.fullName || !customer.fullName.trim()) {
        errors['customer_fullName'] = "Nome completo é obrigatório.";
    }

    if (!customer.noPhone && (!customer.phone || !customer.phone.trim())) {
        errors['customer_phone'] = "Telefone/Celular é obrigatório.";
    }

    if (requiredFields.customer?.cpfCnpj && (!customer.cpfCnpj || !customer.cpfCnpj.trim())) {
        errors['customer_cpfCnpj'] = "CPF/CNPJ é obrigatório.";
    }

    return errors;
}

export const validateShipping = (shipping: Shipping, customer: CustomerData): ValidationErrors => {
    const errors: ValidationErrors = {};
    if (!shipping) return { shipping: "Dados de entrega ausentes." };

    const scheduling = shipping.scheduling;
    if (!scheduling) {
        errors['shipping_scheduling'] = "Agendamento é obrigatório.";
    } else {
        // Date and time are always required for delivery.
        // For pickup, it's optional ONLY if notInformed is true (which means immediate pickup in the UX)
        const isDelivery = shipping.deliveryMethod === 'delivery';
        const isOptionalPickup = !isDelivery && scheduling.notInformed;
        
        if (!isOptionalPickup) {
            if (!scheduling.date) errors['shipping_date'] = "Data é obrigatória.";
            if (!scheduling.startTime) errors['shipping_time'] = "Horário/Período é obrigatório.";
        }
    }

    if (shipping.deliveryMethod === 'delivery') {
        if (shipping.useCustomerAddress !== false) {
            // Using customer address
            const addr = customer?.fullAddress;
            if (!addr?.street) errors['customer_street'] = "Rua é obrigatória.";
            if (!addr?.number) errors['customer_number'] = "Número é obrigatório.";
            if (!addr?.city) errors['customer_city'] = "Cidade é obrigatória.";
        } else {
            // Using custom delivery address
            const dAddr = shipping.deliveryAddress;
            if (!dAddr?.street) errors['deliveryAddress_street'] = "Rua é obrigatória.";
            if (!dAddr?.number) errors['deliveryAddress_number'] = "Número é obrigatório.";
            if (!dAddr?.city) errors['deliveryAddress_city'] = "Cidade é obrigatória.";
        }
    }

    return errors;
}

export const validateSeller = (seller: Order['seller']): ValidationErrors => {
    const errors: ValidationErrors = {};
    // Seller is always mandatory now, ignoring settings toggle as per request
    if (!seller) {
        errors['seller'] = "Selecione o atendente responsável.";
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

    const isBudget = order.orderType === 'budget';
    const errors: ValidationErrors = {
        ...validateItems(items, isBudget),
        ...(!isBudget ? validateCustomerData(order.customerData, isPickup) : {}),
        ...validateSeller(order.seller)
    };

    // If it's not a draft and not a budget, we require full validation
    if (!isDraft && !isBudget) {
        Object.assign(errors, {
            ...validateShipping(order.shipping, order.customerData),
            ...validatePayments(payments, amountRemaining)
        });
    }

    // Items presence validation (required for both non-draft sales and non-draft budgets)
    if (!isDraft) {
        const hasRegularItems = items.length > 0;
        const hasAssistanceItems = order.assistanceItems && order.assistanceItems.length > 0;
        
        if (!hasRegularItems && !hasAssistanceItems) {
            if (isAssistance) {
                errors['items_summary'] = "O pedido de assistência deve conter pelo menos um item.";
            } else {
                errors['items_summary'] = "O pedido/orçamento deve conter pelo menos um produto.";
            }
        }
    }

    // For budgets, we still want to validate shipping but without date/time requirements
    if (isBudget && order.shipping?.deliveryMethod === 'delivery') {
        const s = order.shipping;
        if (s.useCustomerAddress !== false) {
            const addr = order.customerData?.fullAddress;
            if (!addr?.street) errors['customer_street'] = "Rua é obrigatória (para frete).";
            if (!addr?.city) errors['customer_city'] = "Cidade é obrigatória (para frete).";
        } else {
            const dAddr = s.deliveryAddress;
            if (!dAddr?.street) errors['deliveryAddress_street'] = "Rua é obrigatória (para frete).";
            if (!dAddr?.city) errors['deliveryAddress_city'] = "Cidade é obrigatória (para frete).";
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

    if (order.status === 'draft') return errors;

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
