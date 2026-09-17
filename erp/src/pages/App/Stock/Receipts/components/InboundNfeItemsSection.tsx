import { useState } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { QuickRegisterVariationModal, type QuickRegisterItem, type QuickRegisterSelection } from '../../InboundInvoices/modals/QuickRegisterVariationModal';
import ProductFormModal from '@/pages/App/Products/ProductFormModal';
import { getFullProduct } from '@/pages/utils/productService';
import { toast } from 'react-toastify';
import { prepareNewParentWithVariation, prepareExistingParentNewVariation } from '../../InboundInvoices/services/inboundProductPreparationService';
import type Product from '@/pages/types/product.type';
import { InboundReceiptItemRow } from './InboundReceiptItemRow';
import type { InboundReceiptItemComposition } from './InboundCompositionManager';

// ─── Tipos Exportados ──────────────────────────────────────────────────────────

export type { InboundReceiptItemComposition };

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface InboundNfeItemsSectionProps {
    readonly items: readonly InboundReceiptItem[];
    readonly processedItems?: readonly PurchaseItem[];
    readonly supplierId: string;
    readonly onChange: (itemNumber: number, update: Partial<InboundReceiptItem>) => void;
    readonly formatCurrency: (value: number) => string;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function InboundNfeItemsSection({
    items,
    processedItems = [],
    supplierId,
    onChange,
    formatCurrency,
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
                if (!parentProduct) { toast.error('Produto pai não encontrado.'); return; }
                const updatedParentProduct = await prepareExistingParentNewVariation(parentProduct, item);
                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(updatedParentProduct);
                setIsProductModalOpen(true);
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Erro ao carregar produto pai.');
            }
        } else {
            try {
                const preparedData = await prepareNewParentWithVariation(item, supplierId);
                setCreatingItemNumber(itemNumber);
                setEditingParentProduct(null);
                setInitialProductData(preparedData);
                setIsProductModalOpen(true);
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Erro ao preparar formulário de cadastro.');
            }
        }
    };

    const handleProductModalClose = () => {
        setIsProductModalOpen(false);
        setCreatingItemNumber(null);
        setEditingParentProduct(null);
        setInitialProductData(null);
    };

    const linkedCount = items.filter(item => Boolean(item.linkedProductId)).length;
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
                {items.map((item, index) => (
                    <InboundReceiptItemRow
                        key={item.itemNumber}
                        item={item}
                        processedItem={processedItems[index]}
                        onChange={onChange}
                        formatCurrency={formatCurrency}
                        onQuickRegister={(itemNumber, nfeItem) =>
                            setQuickRegisterTarget({ itemNumber, item: nfeItem as unknown as QuickRegisterItem })
                        }
                    />
                ))}
            </div>

            <ProductFormModal
                isOpen={isProductModalOpen}
                isQuickRegister={true}
                onClose={handleProductModalClose}
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
