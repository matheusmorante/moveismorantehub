import ProductAutocomplete from '@/components/ProductAutocomplete';
import Product, { Variation } from '@/pages/types/product.type';
import { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';

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
    supplierId: string;
    onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
    formatCurrency: (value: number) => string;
};

const getProductName = (product: Product, variation?: Variation) =>
    variation?.name || variation?.title || product.name || product.title || product.description;

export default function InboundNfeItemsSection({ items, supplierId, onChange, formatCurrency }: Props) {
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <header className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Itens da NF-e e vínculo com o ERP</h3>
                <p className="mt-1 text-xs text-slate-500">Confirme o produto ERP de cada item antes de registrar o recebimento.</p>
            </header>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                    const linked = Boolean(item.linkedProductId);
                    const quantity = Math.max(1, item.quantity);
                    const totalUnit = item.unitCost + (item.ipiValue || 0) / quantity + (item.freightValue || 0) / quantity;
                    return (
                        <div key={item.itemNumber} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_110px] lg:items-end">
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

                            <label className="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Qtd recebida
                                <span className="normal-case font-medium tracking-normal text-slate-400">Esperada: {item.expectedQuantity ?? item.quantity}</span>
                                <input type="number" min="1" value={item.quantity} onChange={(event) => onChange(item.itemNumber, { quantity: Math.max(1, Number(event.target.value)) })} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" />
                            </label>
                            <label className="flex flex-col gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Custo base
                                <input type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => onChange(item.itemNumber, { unitCost: Math.max(0, Number(event.target.value)) })} className="border-b-2 border-slate-200 bg-transparent p-2 text-sm font-bold text-slate-700 outline-none focus:border-emerald-600 dark:border-slate-700 dark:text-slate-200" />
                                <span className="normal-case font-medium tracking-normal text-amber-700 dark:text-amber-300">Adicionais rateados: {formatCurrency(item.totalAdditionalCosts || 0)}</span>
                            </label>
                            <div className="space-y-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Total unitário</span>
                                <p>{formatCurrency(totalUnit)}</p>
                                <p className="text-emerald-600">{formatCurrency(totalUnit * item.quantity)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
