import { PurchaseItem } from '../types/purchase.type';

export const calculateReceiptItems = (items: PurchaseItem[], fallbackIpiPercent: number, fallbackFreightPercent: number) => items.map((item) => {
    const baseCost = item.fiscalBaseCost ?? item.baseCost ?? item.unitCost;
    const quantity = Math.max(1, item.quantity);
    const unitIpi = typeof item.ipiValue === 'number'
        ? item.ipiValue / quantity
        : typeof item.ipiPercent === 'number'
        ? baseCost * item.ipiPercent / 100
        : baseCost * fallbackIpiPercent / 100;
    const unitFreight = typeof item.freightValue === 'number' ? item.freightValue / quantity : baseCost * fallbackFreightPercent / 100;
    const unitCost = baseCost + (item.additionalCostUnit || 0) + unitIpi + unitFreight;
    return { ...item, baseCost, unitCost: Number(unitCost.toFixed(2)), totalCost: Number((item.quantity * unitCost).toFixed(2)) };
});
