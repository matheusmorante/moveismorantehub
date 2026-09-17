import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { formatCurrency } from '@/pages/utils/formatters';

interface InboundInvoiceItemFinancialsProps {
    readonly item: InboundInvoiceItem;
}

const money = (value?: number): string => {
    const num = Number(value || 0);
    return formatCurrency(Number.isNaN(num) ? 0 : num);
};

export function InboundInvoiceItemFinancials({ item }: InboundInvoiceItemFinancialsProps) {
    const quantity = item.quantity || 1;
    
    // Extracted directly from XML tags, mapped in our parser
    const mercadoriaTotal = item.totalCost || 0;
    const descontoTotal = item.discountValue || 0;
    const freteTotal = item.freightValue || 0;
    const ipiTotal = item.ipiValue || 0;
    const seguroTotal = item.insuranceValue || 0;
    const outrasTotal = item.otherExpensesValue || 0;

    // Final total calculation according to standard rules:
    // Mercadoria + IPI + Frete + Seguro + Outras - Desconto
    const valorFinalTotal = mercadoriaTotal + ipiTotal + freteTotal + seguroTotal + outrasTotal - descontoTotal;
    
    // Unit calculations
    const mercadoriaUnit = mercadoriaTotal / quantity;
    const descontoUnit = descontoTotal / quantity;
    const freteUnit = freteTotal / quantity;
    const ipiUnit = ipiTotal / quantity;
    const seguroUnit = seguroTotal / quantity;
    const outrasUnit = outrasTotal / quantity;
    const valorFinalUnit = valorFinalTotal / quantity;

    return (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50">
            <header className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Valores do Item</h5>
            </header>
            <div className="p-3 space-y-2">
                {/* Cabeçalho das colunas (oculto em mobile, visível a partir de sm) */}
                <div className="hidden sm:grid sm:grid-cols-3 gap-2 pb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                    <div>Componente</div>
                    <div className="text-right">Por unidade</div>
                    <div className="text-right">Total</div>
                </div>

                {/* Linha: Mercadoria */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs text-slate-700 dark:text-slate-300 items-center">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">Mercadoria</div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Unitário: </span><span className="sm:float-right">{money(mercadoriaUnit)}</span></div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Total: </span><span className="sm:float-right">{money(mercadoriaTotal)}</span></div>
                </div>


                {/* Linha: Desconto */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs items-center">
                    <div className={`font-semibold ${descontoTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-500'}`}>Desconto</div>
                    <div className={`flex sm:block justify-between ${descontoTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-500'}`}><span className="sm:hidden text-xs opacity-70">Unitário: </span><span className="sm:float-right">{descontoTotal > 0 ? `- ${money(descontoUnit)}` : money(0)}</span></div>
                    <div className={`flex sm:block justify-between ${descontoTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-500'}`}><span className="sm:hidden text-xs opacity-70">Total: </span><span className="sm:float-right">{descontoTotal > 0 ? `- ${money(descontoTotal)}` : money(0)}</span></div>
                </div>

                {/* Linha: Frete */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs text-slate-700 dark:text-slate-300 items-center">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">Frete</div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Unitário: </span><span className="sm:float-right">{money(freteUnit)}</span></div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Total: </span><span className="sm:float-right">{money(freteTotal)}</span></div>
                </div>

                {/* Linha: IPI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs text-slate-700 dark:text-slate-300 items-center">
                    <div className="font-semibold text-slate-600 dark:text-slate-400">IPI</div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Unitário: </span><span className="sm:float-right">{money(ipiUnit)}</span></div>
                    <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Total: </span><span className="sm:float-right">{money(ipiTotal)}</span></div>
                </div>

                {/* Linha: Seguro (opcional) */}
                {seguroTotal > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs text-slate-700 dark:text-slate-300 items-center">
                        <div className="font-semibold text-slate-600 dark:text-slate-400">Seguro</div>
                        <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Unitário: </span><span className="sm:float-right">{money(seguroUnit)}</span></div>
                        <div className="flex sm:block justify-between"><span className="sm:hidden text-slate-400">Total: </span><span className="sm:float-right">{money(seguroTotal)}</span></div>
                    </div>
                )}

                {/* Linha: Outras Despesas Acessórias */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-xs items-center">
                    <div className={`font-semibold ${outrasTotal > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}>Outras despesas acess.</div>
                    <div className={`flex sm:block justify-between ${outrasTotal > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}><span className="sm:hidden text-xs opacity-70">Unitário: </span><span className="sm:float-right">{money(outrasUnit)}</span></div>
                    <div className={`flex sm:block justify-between ${outrasTotal > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-500'}`}><span className="sm:hidden text-xs opacity-70">Total: </span><span className="sm:float-right">{money(outrasTotal)}</span></div>
                </div>

                {/* Linha: Valor Final */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-sm text-slate-900 dark:text-white items-center pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="font-black">Valor final</div>
                    <div className="flex sm:block justify-between font-bold"><span className="sm:hidden text-slate-500 text-xs font-normal">Unitário: </span><span className="sm:float-right text-emerald-700 dark:text-emerald-400">{money(valorFinalUnit)}</span></div>
                    <div className="flex sm:block justify-between font-black"><span className="sm:hidden text-slate-500 text-xs font-normal">Total: </span><span className="sm:float-right text-emerald-700 dark:text-emerald-400">{money(valorFinalTotal)}</span></div>
                </div>
            </div>
        </div>
    );
}

export default InboundInvoiceItemFinancials;
