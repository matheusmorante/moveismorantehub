/**
 * Utilitário Canônico e Centralizado de Rateio Proporcional
 * 
 * Regra padrão:
 * - Para cada item: valorBrutoItem = quantidade * valorUnitario
 * - Para o conjunto: valorBrutoTotalItens = soma(valorBrutoItem)
 * - Frete, Despesas e Desconto rateiam independentemente sobre o valor bruto dos itens (sem encadear bases).
 * - Fechamento perfeito em centavos (soma dos rateios = valor global).
 */

export const toCents = (value: number): number => Math.round((Number.isFinite(value) ? value : 0) * 100);
export const fromCents = (cents: number): number => Number((cents / 100).toFixed(2));
export const round2 = (value: number): number => Number((Number.isFinite(value) ? value : 0).toFixed(2));
export const round4 = (value: number): number => Number((Number.isFinite(value) ? value : 0).toFixed(4));

export type AllocationMode = 'percent' | 'fixed' | 'percentage';

/**
 * Calcula o valor bruto de um item: quantidade * valorUnitario
 */
export function calculateItemGrossValue(quantity: number, unitCost: number): number {
    const qty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
    const cost = Math.max(0, Number.isFinite(unitCost) ? unitCost : 0);
    return fromCents(Math.round(toCents(cost) * qty));
}

/**
 * Rateia um valor total em R$ proporcionalmente às bases brutas de cada item,
 * garantindo fechamento perfeito em centavos.
 * 
 * @param totalAmount Valor total em R$ a ser rateado
 * @param itemsBase Array com os valores brutos de cada item
 * @returns Array com o valor rateado (em R$) de cada item
 */
export function allocateAmountProportionally(totalAmount: number, itemsBase: number[]): number[] {
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

/**
 * Rateia um parâmetro (que pode ser informado em % ou em R$ fixo) sobre as bases dos itens.
 * Ambas as formas (% ou R$) produzem o mesmo resultado matemático com fechamento de centavos.
 */
export function allocateParameterProportionally(
    mode: AllocationMode,
    value: number,
    itemsBase: number[]
): number[] {
    if (!value || value <= 0 || !itemsBase.length) {
        return itemsBase.map(() => 0);
    }

    const baseCentsList = itemsBase.map((b) => Math.max(0, toCents(b)));
    const totalBaseCents = baseCentsList.reduce((sum, c) => sum + c, 0);
    if (totalBaseCents <= 0) {
        return itemsBase.map(() => 0);
    }

    let totalAmountInReais: number;
    if (mode === 'percent' || mode === 'percentage') {
        const totalAmountInCents = Math.round((totalBaseCents * value) / 100);
        totalAmountInReais = fromCents(totalAmountInCents);
    } else {
        totalAmountInReais = value;
    }

    return allocateAmountProportionally(totalAmountInReais, itemsBase);
}
