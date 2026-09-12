import { PurchaseItem } from '../types/purchase.type';
import {
    allocateAmountProportionally,
    allocateParameterProportionally,
    fromCents,
    round2,
    round4,
    toCents,
} from './proportionalAllocation';

export { allocateAmountProportionally };

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

    // Base padrão de rateio: valorBrutoItem = quantidade * valorUnitario
    const itemsBaseSubtotals = items.map((item) => {
        const baseCost = item.fiscalBaseCost ?? item.baseCost ?? item.unitCost;
        const quantity = Math.max(1, item.quantity);
        return round2(baseCost * quantity);
    });

    const productsTotalBase = itemsBaseSubtotals.reduce((sum, val) => sum + val, 0);

    // 1. Rateio do Desconto Não Fiscal (independente sobre valor bruto dos itens)
    const nonFiscalDiscountAllocations = options.nonFiscalDiscount && options.nonFiscalDiscount.value > 0
        ? allocateParameterProportionally(options.nonFiscalDiscount.mode, options.nonFiscalDiscount.value, itemsBaseSubtotals)
        : items.map(() => 0);

    // 2. Rateio do Frete Não Fiscal (independente sobre valor bruto dos itens)
    const nonFiscalFreightAllocations = options.nonFiscalFreight && options.nonFiscalFreight.value > 0
        ? allocateParameterProportionally(options.nonFiscalFreight.mode, options.nonFiscalFreight.value, itemsBaseSubtotals)
        : items.map(() => 0);

    // 3. Rateio de Outras Despesas Não Fiscais (independente sobre valor bruto dos itens)
    const nonFiscalOtherExpensesAllocations = options.nonFiscalOtherExpenses && options.nonFiscalOtherExpenses.value > 0
        ? allocateParameterProportionally(options.nonFiscalOtherExpenses.mode, options.nonFiscalOtherExpenses.value, itemsBaseSubtotals)
        : items.map(() => 0);

    // 4. Rateio de Desconto Fiscal Global (quando a nota vem com vDesc global)
    const fiscalDiscountAllocations = options.fiscalDiscount && options.fiscalDiscount.value > 0
        ? allocateParameterProportionally(options.fiscalDiscount.mode, options.fiscalDiscount.value, itemsBaseSubtotals)
        : items.map(() => 0);

    // 5. Rateio de Outras Despesas Fiscais Globais
    const fiscalOtherExpensesAllocations = options.fiscalOtherExpenses && options.fiscalOtherExpenses.value > 0
        ? allocateParameterProportionally(options.fiscalOtherExpenses.mode, options.fiscalOtherExpenses.value, itemsBaseSubtotals)
        : items.map(() => 0);

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
