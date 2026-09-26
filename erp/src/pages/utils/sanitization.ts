import Item from "../types/items.type"
import { Payment } from "../types/payments.type";

export const sanitizeItem = (item: Item) => {
    item.quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    item.unitDiscount = item.unitDiscount ?? 0;
    item.unitPrice = item.unitPrice ?? 0;
    return item
}

export const sanitizePayment = (payment: Payment) => {
    payment.amount = payment.amount ?? 0;
    payment.fee = payment.fee ?? 0;

    return payment
}
 
export const sanitizeNumber = (value: string) => value.replace(/\D/g, '')

