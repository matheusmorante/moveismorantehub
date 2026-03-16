import { Item, ItemsSummary } from "../types/items.type";
import { Payment, PaymentsSummary } from "../types/payments.type";
import Shipping from "../types/Shipping.type";

export const calcItemTotalValue = (item: Item): number => {
    const fixedDiscount = getFixedDiscount(item);
    return (item.unitPrice - fixedDiscount) * item.quantity
};

export const calcItemsTotalValue = (items: Item[]) => {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((acc, item) => {
        return acc + calcItemTotalValue(item)
    }, 0)
};

export const getFixedDiscount = (item: Item) => {
    if (item.discountType === 'fixed') return item.unitDiscount;
    else return (item.unitPrice * item.unitDiscount) / 100;
};

export const getFixedFee = (payment: Payment) => {
    if (payment.feeType === 'fixed') return payment.fee;
    else return (payment.amount * payment.fee) / 100;
};

export function sumKeyValues<T extends Record<string, any>>(
    array: T[],
    key: keyof T
): number {
    if (!array || !Array.isArray(array)) return 0;
    return array.reduce((acc, item) => {
        const value = item && item[key];
        return acc + (typeof value === "number" ? value : 0);
    }, 0);
};

export const calcPaymentTotalValue = (payment: Payment): number => {
    const fixedFee = getFixedFee(payment);
    return payment.amount + fixedFee
};

export const calcPaymentsTotalValue = (payments: Payment[]): number => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments.reduce((acc, payment) => {
        return acc + calcPaymentTotalValue(payment)
    }, 0)
}

const calcPaymentsTotalFee = (payments: Payment[]): number => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments.reduce((acc, payment) => {
        return acc + getFixedFee(payment)
    }, 0)
}

export const calcPaymentsSummary = (
    payments: Payment[],
    itemsSummary: ItemsSummary,
    shippingValue: Shipping['value']
): PaymentsSummary => {
    const totalPaymentsFee = calcPaymentsTotalFee(payments);

    const totalOrderValue = itemsSummary.itemsTotalValue + shippingValue
        + totalPaymentsFee;
    const totalAmountPaid = calcPaymentsTotalValue(payments);
    const amountRemaining = totalOrderValue - totalAmountPaid;

    return {
        totalPaymentsFee,
        totalOrderValue,
        totalAmountPaid,
        amountRemaining
    }
};

export const calcItemsSummary = (items: Item[]): ItemsSummary => {
    if (!items || !Array.isArray(items)) {
        return {
            totalQuantity: 0,
            itemsSubtotal: 0,
            totalFixedDiscount: 0,
            itemsTotalValue: 0,
            totalItemsCost: 0
        };
    }
    const totalQuantity = sumKeyValues(items, 'quantity');
    const totalFixedDiscount = items.reduce((acc, item) => {
        if (!item) return acc;
        const discount = getFixedDiscount(item);
        return acc + (discount * (item.quantity || 0));
    }, 0);
    const itemsTotalValue = calcItemsTotalValue(items);
    const itemsSubtotal = itemsTotalValue + totalFixedDiscount;
    const totalItemsCost = items.reduce((acc, item) => acc + (item?.costPrice || 0) * (item?.quantity || 0), 0);

    return {
        totalQuantity,
        itemsSubtotal,
        totalFixedDiscount,
        itemsTotalValue,
        totalItemsCost
    };
};

export const currencyToNumber = (currency: string): number => {
    if (typeof currency !== 'string') return 0;
    const num = Number(currency.replace(/[^\d.]/g, ''));
    return isNaN(num) ? 0 : num;
};

/**
 * Calcula o Peso Cubado (Dimensional Weight)
 * @param height Altura em cm
 * @param width Largura em cm
 * @param depth Profundidade em cm
 * @param divisor Divisor volumétrico (padrão 6000 para a maioria das transportadoras)
 */
export const calculateDIM = (height: number, width: number, depth: number, divisor: number = 6000): number => {
    if (!height || !width || !depth) return 0;
    return (height * width * depth) / divisor;
};

/**
 * Verifica se o produto exige envio via Transportadora de Carga Pesada (LTL)
 */
export const checkLTLRequirement = (data: { 
    height?: number, 
    width?: number, 
    depth?: number, 
    weight?: number 
}): { required: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    const h = data.height || 0;
    const w = data.width || 0;
    const d = data.depth || 0;
    const weight = data.weight || 0;

    // Critérios básicos para LTL (Móveis/Carga Pesada)
    if (weight > 30) reasons.push("Peso superior a 30kg");
    if (h > 150 || w > 150 || d > 150) reasons.push("Dimensão superior a 150cm");
    
    // Volume em m3
    const volumeM3 = (h * w * d) / 1000000;
    if (volumeM3 > 0.25) reasons.push("Volume superior a 0.25m³");

    // Peso Cubado
    const dimWeight = calculateDIM(h, w, d);
    if (dimWeight > 30) reasons.push(`Peso cubado (${dimWeight.toFixed(1)}kg) superior a 30kg`);

    return {
        required: reasons.length > 0,
        reasons
    };
};
