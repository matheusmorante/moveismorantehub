import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { InboundCompositionManager } from './InboundCompositionManager';
import type { InboundReceiptItem } from './InboundNfeItemsSection';

interface InboundReceiptItemRowProps {
    readonly item: InboundReceiptItem;
    readonly processedItem?: PurchaseItem;
    readonly onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
    readonly formatCurrency: (value: number) => string;
    readonly onQuickRegister: (itemNumber: number, item: InboundReceiptItem) => void;
}

export function InboundReceiptItemRow({
    item,
    processedItem,
    onChange,
    formatCurrency,
    onQuickRegister,
}: InboundReceiptItemRowProps) {
    const quantity = Math.max(1, item.quantity);
    const unitDiscount = processedItem?.discountUnit || 0;
    const unitFreight = processedItem?.freightUnit ?? ((item.freightValue || 0) / quantity);
    const unitOther = processedItem?.otherExpensesUnit ?? ((item.totalAdditionalCosts || 0) / quantity);
    const totalUnit = processedItem
        ? processedItem.unitCost
        : Math.max(0, item.unitCost - unitDiscount + (item.ipiValue || 0) / quantity + unitFreight + unitOther);
    const totalItem = processedItem ? processedItem.totalCost : totalUnit * item.quantity;
    const itemSubtotal = item.quantity * item.unitCost;

    return (
        <div className="p-5 space-y-3.5 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
            {/* Bloco Superior: Produto da NF-e e vínculo com ERP */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Lado esquerdo: informações da NF-e */}
                <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto da NF-e</span>
                        {item.unit && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                                UN: {item.unit}
                            </span>
                        )}
                        {(item as unknown as Record<string, unknown>).code && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                Cód. Fornecedor: {String((item as unknown as Record<string, unknown>).code)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
                        {item.productDescription}
                    </p>
                </div>

                {/* Lado direito: vínculo com produto do ERP */}
                <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {item.linkMode === 'composition' ? 'Vincular produtos cadastrados' : 'Vincular produto cadastrado'}
                            </span>
                            {/* Toggle Único / Composição */}
                            <div className="flex items-center rounded-lg bg-white p-0.5 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onChange(item.itemNumber, { linkMode: 'single' })}
                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                        item.linkMode !== 'composition'
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Único
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange(item.itemNumber, { linkMode: 'composition' })}
                                    className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                        item.linkMode === 'composition'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    Composição
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onQuickRegister(item.itemNumber, item)}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 shadow-sm flex items-center gap-1"
                        >
                            <i className="bi bi-plus-circle-fill"></i> Cadastrar rapidamente
                        </button>
                    </div>

                    {item.linkMode === 'composition' ? (
                        <InboundCompositionManager
                            composition={item.composition || []}
                            onChangeComposition={(newComp) => onChange(item.itemNumber, { composition: newComp })}
                            totalItemCost={item.unitCost * item.quantity}
                        />
                    ) : (
                        <ProductAutocomplete
                            value={item.linkedProductName || ''}
                            onSelect={(prod, variation) => {
                                onChange(item.itemNumber, {
                                    linkedProductId: prod.id,
                                    linkedVariationId: variation?.id || (prod as Record<string, unknown>).variationId as string | undefined,
                                    linkedProductName: variation?.name || prod.name || prod.title,
                                    linkStatus: 'automatic',
                                });
                            }}
                            placeholder="Buscar produto no catálogo..."
                        />
                    )}
                </div>
            </div>

            {/* Bloco Inferior: Custos, Desconto, Frete e Total */}
            <div className="flex flex-wrap items-end gap-3 pt-2">
                <label className="flex-1 min-w-fit flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="whitespace-nowrap">Qtd. Nota</span>
                    <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">Recebida</span>
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
                    <CurrencyInput
                        showBadge={false}
                        prefix="R$ "
                        value={item.unitCost || 0}
                        onChange={(val) => onChange(item.itemNumber, { unitCost: Math.max(0, val) })}
                        className="w-full min-w-[85px] bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors text-right"
                    />
                </label>

                <ReadonlyCostBadge label="Desconto" sublabel="Rateado" value={unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'} colorClass="text-amber-600 dark:text-amber-400" />
                <ReadonlyCostBadge label="Frete" sublabel="Rateado" value={unitFreight > 0 ? formatCurrency(unitFreight) : '—'} />
                <ReadonlyCostBadge label="Outras despesas" sublabel="Rateado" value={unitOther > 0 ? formatCurrency(unitOther) : '—'} />
                <ReadonlyCostBadge label="Custo final" sublabel="Unitário" value={formatCurrency(totalUnit)} colorClass="text-emerald-600 dark:text-emerald-400" boldValue />
                <ReadonlyCostBadge label="Subtotal" sublabel="Sem rateio" value={formatCurrency(itemSubtotal)} />
                <ReadonlyCostBadge label="Total do item final" sublabel="Geral" value={formatCurrency(totalItem)} colorClass="text-slate-800 dark:text-slate-100" boldValue />
            </div>
        </div>
    );
}

// Subcomponente auxiliar para exibir métricas de custo (somente leitura)
function ReadonlyCostBadge({
    label,
    sublabel,
    value,
    colorClass = 'text-slate-700 dark:text-slate-300',
    boldValue = false,
}: {
    label: string;
    sublabel: string;
    value: string;
    colorClass?: string;
    boldValue?: boolean;
}) {
    return (
        <div className="flex-1 min-w-fit flex flex-col gap-1 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="whitespace-nowrap">{label}</span>
            <span className="text-[9px] font-medium tracking-normal text-slate-400 whitespace-nowrap">{sublabel}</span>
            <span className={`py-0.5 text-sm whitespace-nowrap ${boldValue ? 'font-black' : 'font-bold'} ${colorClass}`}>
                {value}
            </span>
        </div>
    );
}

export default InboundReceiptItemRow;
