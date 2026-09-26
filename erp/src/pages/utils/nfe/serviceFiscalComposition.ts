import type { Item } from '@/pages/types/items.type';
const toCents = (value: number) => Math.round((Number(value) || 0) * 100);
const fromCents = (value: number) => value / 100;
const getItemNetCents = (item: Item) => {
    const unitPrice = Number(item.unitPrice) || 0;
    const quantity = Number(item.quantity) || 1;
    const unitDiscount = Number(item.unitDiscount) || 0;
    const fixedDiscount = item.discountType === 'fixed'
        ? unitDiscount
        : (unitPrice * unitDiscount) / 100;
    return toCents(Math.max(0, unitPrice - fixedDiscount) * quantity);
};

export interface FiscalProductItem {
    item: Item;
    itemIndex: number;
    vProdCents: number;
    vDescCents: number;
}

export interface ServiceFiscalComposition {
    products: FiscalProductItem[];
    vOutroCents: number;
}

/** Redistribui os serviços no XML sem alterar os itens/preços comerciais do pedido. */
export function composeServiceFiscalValues(items: Item[] = []): ServiceFiscalComposition {
    const products = items
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => item.itemType !== 'service');
    const services = items.filter(item => item.itemType === 'service');
    const linkedServiceCents = new Map<string, number>();
    let vOutroCents = 0;

    for (const service of services) {
        const netCents = getItemNetCents(service);
        const targetId = service.linkedProductOrderItemId;
        if (targetId && products.some(({ item }) => item.orderItemId === targetId)) {
            linkedServiceCents.set(targetId, (linkedServiceCents.get(targetId) || 0) + netCents);
        } else {
            // Referência antiga/orfã é tratada como sem vínculo, nunca é perdida.
            vOutroCents += netCents;
        }
    }

    return {
        products: products.map(({ item, itemIndex }) => {
            const quantity = item.quantity || 1;
            const grossCents = toCents((Number(item.unitPrice) || 0) * quantity);
            const netCents = getItemNetCents(item);
            const discountCents = Math.max(0, grossCents - netCents);
            return {
                item,
                itemIndex,
                vProdCents: grossCents + (item.orderItemId ? linkedServiceCents.get(item.orderItemId) || 0 : 0),
                vDescCents: discountCents,
            };
        }),
        vOutroCents,
    };
}

export const fiscalMoneyFromCents = fromCents;
