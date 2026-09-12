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
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Itens da NF-e e vínculo com o ERP</h3>
                <p className="mt-1 text-xs text-slate-500">Confirme o produto ERP de cada item antes de registrar o recebimento.</p>
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

                    return (
                        <div key={item.itemNumber} className="p-5 space-y-3.5">
                            {/* Bloco Superior: Informações do Produto da NF-e e vínculo com ERP */}
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto da NF-e</span>
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

                            {/* Bloco de Métricas: Qtd, Custo Unitário, Desconto, Frete, Outras Despesas, Custo Final e Total */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 items-end">
                                <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Qtd. recebida
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Esp.: {item.expectedQuantity ?? item.quantity}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(event) => onChange(item.itemNumber, { quantity: Math.max(1, Number(event.target.value)) })}
                                        className="border-b-2 border-slate-200 bg-transparent py-1 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200"
                                    />
                                </label>

                                <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Custo unitário
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Base</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unitCost}
                                        onChange={(event) => onChange(item.itemNumber, { unitCost: Math.max(0, Number(event.target.value)) })}
                                        className="border-b-2 border-slate-200 bg-transparent py-1 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200"
                                    />
                                </label>

                                <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Desconto</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Rateado</span>
                                    <span className="py-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                                        {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Frete</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Rateado</span>
                                    <span className="py-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {unitFreight > 0 ? formatCurrency(unitFreight) : '—'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Outras despesas</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Rateado</span>
                                    <span className="py-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                    <span>Custo final</span>
                                    <span className="text-[9px] font-medium tracking-normal text-emerald-600/70">Unitário</span>
                                    <span className="py-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(totalUnit)}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    <span>Total do item</span>
                                    <span className="text-[9px] font-medium tracking-normal text-slate-400">Qtd × Final</span>
                                    <span className="py-1 text-sm font-black text-slate-800 dark:text-slate-100">
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
