import {
    allocateAmountProportionally,
    fromCents,
    toCents,
} from '../proportionalAllocation';

export type AdditionalCostCalculationType = 'percentage' | 'fixed';

export interface AdditionalCostInput {
    id: string;
    description: string;
    calculationType: AdditionalCostCalculationType;
    inputValue: number | null;
}

export interface AdditionalCost extends AdditionalCostInput {
    calculationBase: 'products_base_value';
    calculatedAmount: number;
    calculatedRate: number;
}

export interface AdditionalCostItemAllocation {
    itemNumber: number;
    itemBaseCost: number;
    allocatedFreight?: number;
    allocatedAdditionalCosts: number;
    totalAdditionalCosts: number;
    acquisitionCost: number;
}

export interface AdditionalCostsCalculation {
    productsBaseValue: number;
    costs: AdditionalCost[];
    totalAdditionalCosts: number;
    allocations: AdditionalCostItemAllocation[];
}

type BaseItem = { itemNumber: number; totalCost: number };

const safeAmount = (value: number | null | undefined) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

export const emptyAdditionalCost = (index = 0): AdditionalCostInput => ({
    id: `additional-cost-${Date.now()}-${index}`,
    description: '',
    calculationType: 'percentage',
    inputValue: null,
});

const normalizeStoredCost = (value: any): AdditionalCost => {
    const calculationType = value?.calculationType === 'fixed' ? 'fixed' : 'percentage';
    const inputValue = value?.inputValue ?? (calculationType === 'percentage' ? value?.percentage : value?.fixedAmount);
    const calculatedAmount = safeAmount(value?.calculatedAmount);
    return {
        id: String(value?.id || `additional-cost-${Math.random().toString(36).slice(2)}`),
        description: String(value?.description || ''),
        calculationType,
        inputValue: inputValue === null || inputValue === undefined ? null : safeAmount(inputValue),
        calculationBase: 'products_base_value',
        calculatedAmount,
        calculatedRate: Number(value?.calculatedRate || 0),
    };
};

export const getLegacyCompatibleCosts = (costs: AdditionalCost[] = [], legacyFreight?: AdditionalCost): AdditionalCost[] => {
    const normalized = costs.map(normalizeStoredCost);
    if (normalized.length) return normalized.slice(0, 1);
    if (!legacyFreight || !legacyFreight.calculatedAmount) return [];
    return [{ ...normalizeStoredCost(legacyFreight), description: legacyFreight.description || 'Frete' }];
};

export const isBlankAdditionalCost = (cost: AdditionalCostInput) => !cost.description.trim() && cost.inputValue === null;

const calculateCost = (cost: AdditionalCostInput, productsBaseValue: number): AdditionalCost => {
    const inputValue = cost.inputValue === null ? null : safeAmount(cost.inputValue);
    const calculatedAmount = cost.calculationType === 'percentage'
        ? fromCents(Math.round((toCents(productsBaseValue) * (inputValue || 0)) / 100))
        : fromCents(toCents(inputValue || 0));
    const calculatedRate = productsBaseValue > 0 ? calculatedAmount / productsBaseValue : 0;

    return {
        ...cost,
        inputValue,
        calculationBase: 'products_base_value',
        calculatedAmount,
        calculatedRate: Number(calculatedRate.toFixed(8)),
    };
};

const allocate = (totalAmount: number, items: BaseItem[]): number[] => {
    const bases = items.map((item) => item.totalCost);
    return allocateAmountProportionally(totalAmount, bases).map((val) => Math.round(val * 100));
};

export const calculateAdditionalCosts = (
    items: BaseItem[],
    costInputs: AdditionalCostInput[] = [],
): AdditionalCostsCalculation => {
    const productsBaseValue = fromCents(items.reduce((sum, item) => sum + Math.max(0, toCents(item.totalCost)), 0));
    const costs = costInputs.filter((cost) => !isBlankAdditionalCost(cost)).map((cost) => calculateCost(cost, productsBaseValue));
    const allocationsByCost = costs.map((cost) => allocate(cost.calculatedAmount, items));
    const allocations = items.map((item, index) => {
        const allocatedAdditionalCosts = fromCents(allocationsByCost.reduce((sum, values) => sum + (values[index] || 0), 0));
        const itemBaseCost = fromCents(toCents(item.totalCost));
        return {
            itemNumber: item.itemNumber,
            itemBaseCost,
            allocatedAdditionalCosts,
            totalAdditionalCosts: allocatedAdditionalCosts,
            acquisitionCost: fromCents(toCents(itemBaseCost) + toCents(allocatedAdditionalCosts)),
        };
    });

    return {
        productsBaseValue,
        costs,
        totalAdditionalCosts: fromCents(costs.reduce((sum, cost) => sum + toCents(cost.calculatedAmount), 0)),
        allocations,
    };
};
