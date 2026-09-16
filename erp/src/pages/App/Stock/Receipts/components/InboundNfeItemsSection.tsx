import { useState } from 'react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import CurrencyInput from '@/components/CurrencyInput';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { QuickRegisterVariationModal, type QuickRegisterItem, type QuickRegisterSelection } from '../../InboundInvoices/modals/QuickRegisterVariationModal';
import ProductFormModal from '@/pages/App/Products/ProductFormModal';
import { getFullProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from '../../InboundInvoices/services/inboundProductPreparationService';
import type { PurchaseItem } from '@/pages/types/purchase.type';

export type InboundReceiptItemComposition = {
    id: string; // unique local ID for rendering
    productId: string;
    variationId?: string;
    productName: string;
    quantity: number;
    referenceSalePrice: number;
};

export type InboundReceiptItem = InboundInvoiceItem & {
    expectedQuantity?: number;
    linkedProductId?: string;
    linkedVariationId?: string;
    linkedProductCode?: string;
    linkedProductName?: string;
    linkStatus: 'automatic' | 'pending';
    linkMode?: 'single' | 'composition';
    composition?: InboundReceiptItemComposition[];
};

interface InboundNfeItemsSectionProps {
    readonly items: readonly InboundReceiptItem[];
    readonly processedItems?: readonly PurchaseItem[];
    readonly supplierId: string;
    readonly onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
    readonly formatCurrency: (value: number) => string;
}

export function InboundNfeItemsSection({
    items,
    processedItems = [],
    supplierId,
    onChange,
    formatCurrency
}: InboundNfeItemsSectionProps) {
    const [quickRegisterTarget, setQuickRegisterTarget] = useState<{ itemNumber: number; item: QuickRegisterItem } | null>(null);
    const [editingParentProduct, setEditingParentProduct] = useState<Product | null>(null);
    const [initialProductData, setInitialProductData] = useState<Partial<Product> | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [creatingItemNumber, setCreatingItemNumber] = useState<number | null>(null);

    const handleQuickRegisterConfirm = async (selection: QuickRegisterSelection) => {
        if (!quickRegisterTarget) return;
        const { itemNumber, item } = quickRegisterTarget;
        setQuickRegisterTarget(null);

        if (selection.mode === 'EXISTING_PARENT') {
            try {
                const parentProduct = await getFullProduct(selection.parentProductId);
                if (!parentProduct) {
                    toast.error('Produto pai não encontrado.');
                    return;
                }

                const updatedParentProduct = await prepareExistingParentNewVariation(parentProduct, item);

                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(updatedParentProduct);
                setIsProductModalOpen(true);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro ao carregar produto pai.';
                toast.error(msg);
            }
        } else {
            try {
                const preparedData = await prepareNewParentWithVariation(item, supplierId);
                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(null);
                setInitialProductData(preparedData);
                setIsProductModalOpen(true);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Erro ao preparar formulário de cadastro.';
                toast.error(msg);
            }
        }
    };

    const linkedCount = items.filter((item) => Boolean(item.linkedProductId)).length;
    const allLinked = items.length > 0 && linkedCount === items.length;

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-box-seam text-emerald-600" aria-hidden="true" />
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
                        <i className={`bi ${allLinked ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} aria-hidden="true" />
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
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                                                UN: {item.unit}
                                            </span>
                                        )}
                                        {item.code && (
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                Cód. Fornecedor: {item.code}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-snug">
                                        {item.productDescription}
                                    </p>
                                </div>

                                <div className="space-y-3 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                {item.linkMode === 'composition' ? 'Vincular produtos cadastrados' : 'Vincular produto cadastrado'}
                                            </span>
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
                                            onClick={() => setQuickRegisterTarget({ itemNumber: item.itemNumber, item })}
                                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900 shadow-sm flex items-center gap-1"
                                        >
                                            <i className="bi bi-plus-circle-fill"></i> Cadastrar rapidamente
                                        </button>
                                    </div>
                                    
                                    {item.linkMode === 'composition' ? (
                                        <CompositionManager
                                            composition={item.composition || []}
                                            onChangeComposition={(newComp) => onChange(item.itemNumber, { composition: newComp })}
                                            totalItemCost={item.unitCost * item.quantity} // Just for preview
                                        />
                                    ) : (
                                        <ProductAutocomplete
                                            value={item.linkedProductName || ''}
                                            onSelect={(prod, variation) => {
                                                onChange(item.itemNumber, {
                                                    linkedProductId: prod.id,
                                                    linkedVariationId: variation?.id || prod.variationId,
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

            <ProductFormModal
                isOpen={isProductModalOpen}
                isQuickRegister={true}
                onClose={() => {
                    setIsProductModalOpen(false);
                    setCreatingItemNumber(null);
                    setEditingParentProduct(null);
                    setInitialProductData(null);
                }}
                product={editingParentProduct}
                initialData={initialProductData}
                initialTab={editingParentProduct ? 'variacoes' : 'geral'}
                openAddVariationOnOpen={Boolean(editingParentProduct)}
                onSuccess={(createdProduct) => {
                    setIsProductModalOpen(false);
                    if (creatingItemNumber) {
                        onChange(creatingItemNumber, {
                            linkedProductId: createdProduct.id,
                            linkedVariationId: createdProduct.variations?.[0]?.id,
                            linkedProductName: createdProduct.name || createdProduct.title,
                            linkStatus: 'pending',
                        });
                    }
                }}
            />

            <QuickRegisterVariationModal
                isOpen={Boolean(quickRegisterTarget)}
                item={quickRegisterTarget?.item || null}
                supplierId={supplierId}
                onClose={() => setQuickRegisterTarget(null)}
                onConfirmSelection={handleQuickRegisterConfirm}
            />
        </section>
    );
}

export default InboundNfeItemsSection;

interface CompositionManagerProps {
    composition: InboundReceiptItemComposition[];
    onChangeComposition: (newComposition: InboundReceiptItemComposition[]) => void;
    totalItemCost: number;
}

function CompositionManager({ composition, onChangeComposition, totalItemCost }: CompositionManagerProps) {
    const handleAdd = (prod: Product, variation?: Variation) => {
        const salePrice = variation?.salePrice || prod.salePrice || 0;
        
        // Block adding duplicates
        const exists = composition.some(c => c.productId === prod.id && c.variationId === variation?.id);
        if (exists) {
            toast.error('Este produto já está na composição. Altere a quantidade se necessário.');
            return;
        }

        const newComp: InboundReceiptItemComposition = {
            id: crypto.randomUUID(),
            productId: prod.id,
            variationId: variation?.id,
            productName: variation?.name || prod.name || prod.title,
            quantity: 1,
            referenceSalePrice: salePrice
        };
        onChangeComposition([...composition, newComp]);
    };

    const handleRemove = (id: string) => {
        onChangeComposition(composition.filter(c => c.id !== id));
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        onChangeComposition(composition.map(c => c.id === id ? { ...c, quantity: Math.max(1, qty) } : c));
    };

    const totalWeightBase = composition.reduce((sum, c) => sum + (c.referenceSalePrice * c.quantity), 0);

    return (
        <div className="space-y-3">
            {composition.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-3 py-2">Componente</th>
                                <th className="px-3 py-2 w-20 text-center">Qtd</th>
                                <th className="px-3 py-2 text-right">Peso/Ref.</th>
                                <th className="px-3 py-2 text-right">Rateio</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {composition.map((c, idx) => {
                                const weightValue = c.referenceSalePrice * c.quantity;
                                const weightPercent = totalWeightBase > 0 ? (weightValue / totalWeightBase) : 0;
                                
                                // Para evitar dízimas infinitas que somadas não dão o total, o último item absorve a diferença
                                let rateio = 0;
                                if (idx === composition.length - 1) {
                                    const previousRateioSum = composition.slice(0, -1).reduce((sum, prevC) => {
                                        const w = totalWeightBase > 0 ? ((prevC.referenceSalePrice * prevC.quantity) / totalWeightBase) : 0;
                                        return sum + Number((totalItemCost * w).toFixed(2));
                                    }, 0);
                                    rateio = Math.max(0, totalItemCost - previousRateioSum);
                                } else {
                                    rateio = Number((totalItemCost * weightPercent).toFixed(2));
                                }

                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{c.productName}</td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={c.quantity}
                                                onChange={(e) => handleUpdateQuantity(c.id, Number(e.target.value))}
                                                className="w-full text-center bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex flex-col">
                                                <span className="text-slate-600 dark:text-slate-300">{(weightPercent * 100).toFixed(1)}%</span>
                                                <span className="text-[9px] text-slate-400">R$ {c.referenceSalePrice.toFixed(2)} un</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-black text-emerald-600 dark:text-emerald-400">
                                            R$ {rateio.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button type="button" onClick={() => handleRemove(c.id)} className="text-red-500 hover:text-red-700">
                                                <i className="bi bi-trash3-fill"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            
            <ProductAutocomplete
                value=""
                clearOnSelect={true}
                onSelect={handleAdd}
                placeholder="Buscar produto para compor o item..."
            />
            
            {composition.length === 0 && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                    Adicione pelo menos um produto para formar a composição.
                </p>
            )}
            {composition.some(c => c.referenceSalePrice <= 0) && (
                <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 mt-1">
                    <i className="bi bi-info-circle-fill"></i>
                    Alguns itens estão com preço de venda zerado. Isso afetará o cálculo de rateio baseado em valor (peso 0).
                </p>
            )}
        </div>
    );
}
