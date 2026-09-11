import { PurchaseItem } from '../types/purchase.type';

export type CalculationMode = 'percent' | 'fixed';

export interface RateioParameter {
    mode: CalculationMode;
    value: number;
}

export interface ReceiptCalculationOptions {
    fallbackIpiPercent?: number;
    fallbackFreightPercent?: number;
    // Parâmetros não fiscais
    nonFiscalDiscount?: RateioParameter;
    nonFiscalFreight?: RateioParameter;
    nonFiscalOtherExpenses?: RateioParameter;
    // Parâmetros fiscais globais (quando não detalhados item a item na NF)
    fiscalDiscount?: RateioParameter;
    fiscalOtherExpenses?: RateioParameter;
}

const toCents = (val: number) => Math.round((Number.isFinite(val) ? val : 0) * 100);
const fromCents = (val: number) => Number((val / 100).toFixed(2));
const round4 = (val: number) => Number(val.toFixed(4));
const round2 = (val: number) => Number(val.toFixed(2));

/**
 * Rateia um valor total em R$ proporcionalmente ao subtotal de custo base de cada item,
 * garantindo fechamento perfeito em centavos.
 */
function allocateAmountProportionally(totalAmount: number, itemsBase: number[]): number[] {
    const totalCents = toCents(totalAmount);
    const baseCentsList = itemsBase.map((b) => Math.max(0, toCents(b)));
    const totalBaseCents = baseCentsList.reduce((sum, c) => sum + c, 0);
    const allocations = itemsBase.map(() => 0);

    if (totalCents <= 0 || totalBaseCents <= 0) return allocations;

    let allocated = 0;
    let lastEligible = -1;

    baseCentsList.forEach((base, idx) => {
        if (base <= 0) return;
        lastEligible = idx;
        const share = Math.floor((totalCents * base) / totalBaseCents);
        allocations[idx] = share;
        allocated += share;
    });

    if (lastEligible >= 0) {
        allocations[lastEligible] += totalCents - allocated;
    }

    return allocations.map(fromCents);
}

export const calculateReceiptItems = (
    items: PurchaseItem[],
    fallbackIpiPercentOrOptions: number | ReceiptCalculationOptions = 0,
    legacyFallbackFreightPercent = 0
): PurchaseItem[] => {
    const options: ReceiptCalculationOptions = typeof fallbackIpiPercentOrOptions === 'number'
        ? { fallbackIpiPercent: fallbackIpiPercentOrOptions, fallbackFreightPercent: legacyFallbackFreightPercent }
        : fallbackIpiPercentOrOptions;

    const fallbackIpiPercent = options.fallbackIpiPercent || 0;
    const fallbackFreightPercent = options.fallbackFreightPercent || 0;

    const itemsBaseSubtotals = items.map((item) => {
        const baseCost = item.fiscalBaseCost ?? item.baseCost ?? item.unitCost;
        const quantity = Math.max(1, item.quantity);
        return baseCost * quantity;
    });

    const productsTotalBase = itemsBaseSubtotals.reduce((sum, val) => sum + val, 0);

    // 1. Rateio do Desconto Não Fiscal
    let nonFiscalDiscountAllocations = items.map(() => 0);
    if (options.nonFiscalDiscount && options.nonFiscalDiscount.value > 0) {
        if (options.nonFiscalDiscount.mode === 'percent') {
            nonFiscalDiscountAllocations = items.map((_, i) => round2(itemsBaseSubtotals[i] * (options.nonFiscalDiscount!.value / 100)));
        } else {
            nonFiscalDiscountAllocations = allocateAmountProportionally(options.nonFiscalDiscount.value, itemsBaseSubtotals);
        }
    }

    // 2. Rateio do Frete Não Fiscal
    let nonFiscalFreightAllocations = items.map(() => 0);
    if (options.nonFiscalFreight && options.nonFiscalFreight.value > 0) {
        if (options.nonFiscalFreight.mode === 'percent') {
            nonFiscalFreightAllocations = items.map((_, i) => round2(itemsBaseSubtotals[i] * (options.nonFiscalFreight!.value / 100)));
        } else {
            nonFiscalFreightAllocations = allocateAmountProportionally(options.nonFiscalFreight.value, itemsBaseSubtotals);
        }
    }

    // 3. Rateio de Outras Despesas Não Fiscais
    let nonFiscalOtherExpensesAllocations = items.map(() => 0);
    if (options.nonFiscalOtherExpenses && options.nonFiscalOtherExpenses.value > 0) {
        if (options.nonFiscalOtherExpenses.mode === 'percent') {
            nonFiscalOtherExpensesAllocations = items.map((_, i) => round2(itemsBaseSubtotals[i] * (options.nonFiscalOtherExpenses!.value / 100)));
        } else {
            nonFiscalOtherExpensesAllocations = allocateAmountProportionally(options.nonFiscalOtherExpenses.value, itemsBaseSubtotals);
        }
    }

    // 4. Rateio de Desconto Fiscal Global (quando a nota vem com vDesc global)
    let fiscalDiscountAllocations = items.map(() => 0);
    if (options.fiscalDiscount && options.fiscalDiscount.value > 0) {
        if (options.fiscalDiscount.mode === 'percent') {
            fiscalDiscountAllocations = items.map((_, i) => round2(itemsBaseSubtotals[i] * (options.fiscalDiscount!.value / 100)));
        } else {
            fiscalDiscountAllocations = allocateAmountProportionally(options.fiscalDiscount.value, itemsBaseSubtotals);
        }
    }

    // 5. Rateio de Outras Despesas Fiscais Globais
    let fiscalOtherExpensesAllocations = items.map(() => 0);
    if (options.fiscalOtherExpenses && options.fiscalOtherExpenses.value > 0) {
        if (options.fiscalOtherExpenses.mode === 'percent') {
            fiscalOtherExpensesAllocations = items.map((_, i) => round2(itemsBaseSubtotals[i] * (options.fiscalOtherExpenses!.value / 100)));
        } else {
            fiscalOtherExpensesAllocations = allocateAmountProportionally(options.fiscalOtherExpenses.value, itemsBaseSubtotals);
        }
    }

    return items.map((item, index) => {
        const baseCost = item.fiscalBaseCost ?? item.baseCost ?? item.unitCost;
        const quantity = Math.max(1, item.quantity);

        // Desconto Fiscal (do próprio item ou rateado global)
        const itemFiscalDiscount = typeof item.discountFiscalUnit === 'number'
            ? item.discountFiscalUnit
            : round4(fiscalDiscountAllocations[index] / quantity);

        // Desconto Não Fiscal rateado
        const itemNonFiscalDiscount = round4(nonFiscalDiscountAllocations[index] / quantity);
        const discountUnit = round4(itemFiscalDiscount + itemNonFiscalDiscount);

        // Custo Líquido Unitário (Base - Desconto)
        const netBaseCost = Math.max(0, round4(baseCost - discountUnit));

        // IPI Fiscal Unitário
        const unitIpi = typeof item.ipiValue === 'number'
            ? round4(item.ipiValue / quantity)
            : typeof item.ipiPercent === 'number'
            ? round4((baseCost * item.ipiPercent) / 100)
            : round4((baseCost * fallbackIpiPercent) / 100);

        // Frete Fiscal Unitário
        const freightFiscalUnit = typeof item.freightValue === 'number'
            ? round4(item.freightValue / quantity)
            : round4((baseCost * fallbackFreightPercent) / 100);

        // Frete Não Fiscal Unitário
        const freightNonFiscalUnit = round4(nonFiscalFreightAllocations[index] / quantity);
        const freightUnit = round4(freightFiscalUnit + freightNonFiscalUnit);

        // Outras Despesas Fiscais Unitárias (seguro, ICMS-ST, outras despesas acessórias)
        const otherExpensesFiscalUnit = typeof item.otherExpensesFiscalUnit === 'number'
            ? item.otherExpensesFiscalUnit
            : round4(fiscalOtherExpensesAllocations[index] / quantity);

        // Outras Despesas Não Fiscais Unitárias
        const otherExpensesNonFiscalUnit = round4((item.additionalCostUnit || 0) + (nonFiscalOtherExpensesAllocations[index] / quantity));
        const otherExpensesUnit = round4(otherExpensesFiscalUnit + otherExpensesNonFiscalUnit);

        // CUSTO UNITÁRIO FINAL
        // Custo unitário final = custo unitário − desconto + IPI + frete + outras despesas
        const finalUnitCost = Math.max(0, round2(baseCost - discountUnit + unitIpi + freightUnit + otherExpensesUnit));

        // TOTAL DO ITEM = Custo unitário final × quantidade recebida
        const totalCost = round2(quantity * finalUnitCost);

        return {
            ...item,
            baseCost: round2(baseCost),
            netBaseCost: round2(netBaseCost),
            discountFiscalUnit: round2(itemFiscalDiscount),
            discountNonFiscalUnit: round2(itemNonFiscalDiscount),
            discountUnit: round2(discountUnit),
            ipiPercent: typeof item.ipiPercent === 'number' ? item.ipiPercent : fallbackIpiPercent,
            ipiValue: round2(unitIpi * quantity),
            freightFiscalUnit: round2(freightFiscalUnit),
            freightNonFiscalUnit: round2(freightNonFiscalUnit),
            freightUnit: round2(freightUnit),
            otherExpensesFiscalUnit: round2(otherExpensesFiscalUnit),
            otherExpensesNonFiscalUnit: round2(otherExpensesNonFiscalUnit),
            otherExpensesUnit: round2(otherExpensesUnit),
            unitCost: finalUnitCost,
            totalCost,
        };
    });
};
