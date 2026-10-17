import type { MappingItem } from './types';

export const amount = (value: unknown): number => Math.max(0, Number(value) || 0);

export const formatMoney = (value: number): string =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const landedUnitCost = (item: MappingItem): number => {
  const quantity = Math.max(1, amount(item.quantity));
  const extra =
    amount(item.ipiValue) +
    amount(item.icmsStValue) +
    amount(item.freightValue) +
    amount(item.insuranceValue) +
    amount(item.otherExpensesValue) +
    amount(item.totalAdditionalCosts ?? item.allocatedAdditionalCosts);
  return amount(item.unitCost) + extra / quantity;
};
