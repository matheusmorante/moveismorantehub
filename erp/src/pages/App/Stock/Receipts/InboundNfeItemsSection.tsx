import ProductAutocomplete from '@/components/ProductAutocomplete';
import Product, { Variation } from '@/pages/types/product.type';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

import { PurchaseItem } from '@/pages/types/purchase.type';

export type InboundReceiptItem = InboundInvoiceItem & {
    expectedQuantity?: number;
    linkedProductId?: string;
    linkedVariationId?: string;
    linkedProductCode?: string;
    linkedProductName?: string;
    linkStatus: 'automatic' | 'pending';
};

type Props = {
    items: InboundReceiptItem[];
    processedItems?: PurchaseItem[];
    supplierId: string;
    onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
    formatCurrency: (value: number) => string;
};

const getProductName = (product: Product, variation?: Variation) =>
    variation?.name || variation?.title || product.name || product.title || product.description;

export default function InboundNfeItemsSection({ items, processedItems = [], supplierId, onChange, formatCurrency }: Props) {
    const linkedCount = items.filter((item) => Boolean(item.linkedProductId)).length;
    const allLinked = items.length > 0 && linkedCount === items.length;

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-box-seam text-emerald-600" />
                        Itens da NF-e e Vínculo com o ERP
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">Confirme o produto ERP correspondente de cada item para a correta entrada no estoque.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                        allLinked
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                    }`}>
                        <i className={`bi ${allLinked ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
                        {linkedCount} de {items.length} itens vinculados
                    </span>
                </div>
            </header>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, index) => {
                    const linked = Boolean(item.linkedProductId);
                    const quantity = Math.max(1, item.quantity);
                    const processed = processedItems[index];
                    const unitDiscount = processed?.discountUnit || 0;
                    const unitFreight = processed?.freightUnit ?? ((item.freightValue || 0) / quantity);
                    const unitOther = processed?.otherExpensesUnit ?? ((item.totalAdditionalCosts || 0) / quantity);
                    const totalUnit = processed ? processed.unitCost : Math.max(0, item.unitCost - unitDiscount + (item.ipiValue || 0) / quantity + unitFreight + unitOther);
                    const totalItem = processed ? processed.totalCost : (totalUnit * item.quantity);
                    const itemSubtotal = item.quantity * item.unitCost;

                    return (
                        <div key={item.itemNumber} className="p-5 space-y-3.5 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                            {/* Bloco Superior: Informações do Produto da NF-e e vínculo com ERP */}
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto da NF-e</span>
                                        {item.unit && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                                UN: {item.unit}
                                            </span>
                                        )}
                                        {item.ncm && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                                NCM: {item.ncm}
                                            </span>
                                        )}
                                        {item.cfop && (
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                                                CFOP: {item.cfop}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-mono text-slate-500">Cód. fornecedor: {item.productCode || '—'}</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{item.productDescription}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto ERP</span>
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${linked ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                                            {linked ? (item.linkStatus === 'automatic' ? 'Vinculado automaticamente' : 'Vinculado') : 'Aguardando vínculo'}
                                        </span>
                                    </div>
                                    <ProductAutocomplete
                                        supplierId={supplierId}
                                        value={item.linkedProductName || ''}
                                        isSelected={linked}
                                        placeholder="Selecionar produto..."
                                        onSelect={(product, variation) => onChange(item.itemNumber, {
                                            linkedProductId: product.id,
                                            linkedVariationId: variation?.id,
                                            linkedProductCode: variation?.sku || product.code || '',
                                            linkedProductName: getProductName(product, variation),
                                            linkStatus: 'pending',
                                        })}
                                    />
                                    {linked && <p className="text-[10px] font-mono text-slate-400">Cód. ERP: {item.linkedProductCode || '—'}</p>}
                                </div>
                            </div>

                            {/* Bloco de Métricas: Qtd e Custo (Editáveis = Fundo Branco) | Desconto, Frete, Despesas, Custo Final, Subtotal, Total do item final (Não-Editáveis = Fundo Cinza) */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 items-end">
                                <label className="flex-1 min-w-fit flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="whitespace-nowrap">Qtd. recebida</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Esp.: {item.expectedQuantity ?? item.quantity}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(event) => onChange(item.itemNumber, { quantity: Math.max(1, Number(event.target.value)) })}
                                        className="w-full min-w-[70px] bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                                    />
                                </label>

                                <label className="flex-1 min-w-fit flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="whitespace-nowrap">Custo unitário</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Base</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitCost}
                                        onChange={(event) => onChange(item.itemNumber, { unitCost: Math.max(0, Number(event.target.value)) })}
                                        className="w-full min-w-[70px] bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                                    />
                                </label>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="whitespace-nowrap">Desconto</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Rateado</span>
                                    <span className="py-0.5 text-sm font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                        {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="whitespace-nowrap">Frete</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Rateado</span>
                                    <span className="py-0.5 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {unitFreight > 0 ? formatCurrency(unitFreight) : '—'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="whitespace-nowrap">Outras despesas</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Rateado</span>
                                    <span className="py-0.5 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    <span className="whitespace-nowrap">Custo final</span>
                                    <span className="text-[9px] font-medium tracking-normal text-emerald-600/70 whitespace-nowrap">Unitário</span>
                                    <span className="py-0.5 text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        {formatCurrency(totalUnit)}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    <span className="whitespace-nowrap">Subtotal</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Sem rateio</span>
                                    <span className="py-0.5 text-sm font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {formatCurrency(itemSubtotal)}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                                    <span className="whitespace-nowrap">Total do item final</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Geral</span>
                                    <span className="py-0.5 text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                        {formatCurrency(totalItem)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
