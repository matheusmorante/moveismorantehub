type DiscountType = 'percentage' | 'fixed';

export type Item = {
    productId?: string;
    variationId?: string;
    code?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    costPrice?: number;
    unitDiscount: number;
    discountType: DiscountType;
    handlingType: string;
    condition?: 'novo' | 'usado' | 'salvado' | '';
    deliveryMethod?: 'delivery' | 'pickup';
    isCombo?: boolean;
    isComboItem?: boolean;
    currentStock?: number;
    minStock?: number;
}

export type ItemsSummary = {
    totalQuantity: number,
    itemsSubtotal: number,
    totalFixedDiscount: number,
    itemsTotalValue: number,
    totalItemsCost: number
}

export default Item;
