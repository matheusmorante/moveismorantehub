import { useMemo } from 'react';
import { formatCurrency } from '@/pages/utils/formatters';
import { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
    AdditionalCostInput,
    calculateAdditionalCosts,
    emptyAdditionalCost,
    getLegacyCompatibleCosts,
    isBlankAdditionalCost,
} from '@/pages/utils/inboundNfe/additionalCosts';

type Props = {
    invoice: InboundInvoice;
    onChange: (update: Partial<InboundInvoice>) => void;
};

const asNumber = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export function InboundAdditionalCostsSection({ invoice, onChange }: Props) {
    const storedCosts = getLegacyCompatibleCosts(invoice.additionalCosts || [], invoice.additionalFreight)
        .filter((cost) => !isBlankAdditionalCost(cost));
    const emptyRow = useMemo(() => emptyAdditionalCost(0), []);
    const cost = storedCosts[0] || emptyRow;
    const calculation = useMemo(
        () => calculateAdditionalCosts(invoice.items, storedCosts),
        [invoice.items, storedCosts],
    );

    const updateCost = (update: Partial<AdditionalCostInput>) => {
        const nextCost = { ...cost, ...update };
        const persistedCosts = isBlankAdditionalCost(nextCost) ? [] : [nextCost];
        const nextCalculation = calculateAdditionalCosts(invoice.items, persistedCosts);
        onChange({
            additionalCosts: persistedCosts.length ? nextCalculation.costs : [],
            additionalCostsTotal: nextCalculation.totalAdditionalCosts,
            additionalFreight: undefined,
            additionalCostAllocations: undefined,
        });
    };

    return (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/10">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-900 dark:text-amber-200">Outras despesas não fiscais</h3>
            <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-300/80">Valores pagos por fora da NF. Não alteram os totais fiscais e serão compostos no recebimento.</p>

            <div className="mt-4">
                        <div className="grid gap-2 rounded-xl border border-white/80 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)]">
                            <input
                                value={cost.description}
                                onChange={(event) => updateCost({ description: event.target.value })}
                                placeholder="Descrição da despesa"
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                            <select
                                value={cost.calculationType}
                                onChange={(event) => updateCost({ calculationType: event.target.value as AdditionalCostInput['calculationType'] })}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Valor fixo (R$)</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cost.inputValue ?? ''}
                                    onChange={(event) => updateCost({ inputValue: asNumber(event.target.value) })}
                                    placeholder={cost.calculationType === 'percentage' ? 'Ex.: 10' : 'Ex.: 350,00'}
                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                />
                                {calculation.costs[0] && <span className="shrink-0 text-xs font-black text-amber-700 dark:text-amber-300">{formatCurrency(calculation.costs[0].calculatedAmount)}</span>}
                            </div>
                        </div>
            </div>

            <div className="mt-4 grid gap-1 border-t border-amber-200 pt-3 text-xs dark:border-amber-900/40 sm:grid-cols-3">
                <span>Base dos produtos: <b>{formatCurrency(calculation.productsBaseValue)}</b></span>
                <span>Outras despesas não fiscais: <b>{formatCurrency(calculation.totalAdditionalCosts)}</b></span>
                <span className="font-black text-amber-800 dark:text-amber-200">Serão rateados no recebimento</span>
            </div>
        </section>
    );
}
