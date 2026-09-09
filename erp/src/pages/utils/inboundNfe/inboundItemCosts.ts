import { InboundInvoiceItem } from './inboundNfeTypes';

const amount = (value: number | undefined) => Math.max(0, Number(value) || 0);

/** Valores da própria NF que aumentam o custo de aquisição do item. */
export const fiscalAdditionalCost = (item: InboundInvoiceItem) => (
    amount(item.ipiValue)
    + amount(item.icmsStValue)
    + amount(item.freightValue)
    + amount(item.insuranceValue)
    + amount(item.otherExpensesValue)
);

/** Rateio de despesas lançadas fora da NF, como frete complementar. */
export const nonFiscalAdditionalCost = (item: InboundInvoiceItem) => (
    amount(item.totalAdditionalCosts ?? item.allocatedAdditionalCosts)
);

export const itemFreightCost = (item: InboundInvoiceItem) => amount(item.freightValue);
export const itemIpiCost = (item: InboundInvoiceItem) => amount(item.ipiValue);
/** Valores acessórios extraídos da própria NF, distintos de frete e IPI. */
export const itemFiscalOtherExpensesCost = (item: InboundInvoiceItem) => (
    amount(item.icmsStValue) + amount(item.insuranceValue) + amount(item.otherExpensesValue)
);

/** Custos informados pelo operador fora do documento fiscal. */
export const itemNonFiscalOtherExpensesCost = (item: InboundInvoiceItem) => nonFiscalAdditionalCost(item);

export const itemOtherExpensesCost = (item: InboundInvoiceItem) => (
    itemFiscalOtherExpensesCost(item) + itemNonFiscalOtherExpensesCost(item)
);

export const itemCostRate = (componentCost: number, item: InboundInvoiceItem) => {
    const base = amount(item.totalCost);
    return base > 0 ? componentCost / base : 0;
};

export const itemAdditionalCost = (item: InboundInvoiceItem) => (
    fiscalAdditionalCost(item) + nonFiscalAdditionalCost(item)
);

export const itemCostWithAdditionalCosts = (item: InboundInvoiceItem) => {
    const quantity = Math.max(1, amount(item.quantity));
    return item.unitCost + itemAdditionalCost(item) / quantity;
};
