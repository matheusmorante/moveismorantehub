import React from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import { hasVariationAttribute } from '../../../../utils/productVariationDefaults';
import { VariationRow as DefaultVariationRow } from '../VariationRow';

interface ProductVariationsTabProps {
    readonly formData?: Partial<Product>;
    readonly variations?: readonly Variation[];
    readonly isGeneratingBulk?: boolean;
    // Aceita tanto addVariation (legado) quanto onAddVariation (ProductFormModal)
    readonly addVariation?: () => void;
    readonly onAddVariation?: () => void;
    readonly VariationRow?: React.ComponentType<{
        readonly v: Variation;
        readonly variationIndex: number;
        readonly updateVariation?: (id: string, field: keyof Variation, value: Variation[keyof Variation]) => void;
        readonly removeVariation?: (id: string) => void;
        readonly setFormData?: React.Dispatch<React.SetStateAction<Partial<Product>>>;
        readonly isCombo?: boolean;
        readonly onEdit?: (id: string) => void;
    }>;
    readonly updateVariation?: (id: string, field: keyof Variation, value: Variation[keyof Variation]) => void;
    // Aceita tanto removeVariation (legado) quanto onRemoveVariation (ProductFormModal)
    readonly removeVariation?: (id: string) => void;
    readonly onRemoveVariation?: (id: string) => void;
    readonly setFormData?: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    readonly onEditCombo?: (id: string) => void;
    // Aceita tanto onEdit (legado) quanto onEditVariation (ProductFormModal)
    readonly onEdit?: (id: string) => void;
    readonly onEditVariation?: (id: string) => void;
    readonly isCombo?: boolean;
    readonly regenerateAllSkus?: () => void;
    readonly onOpenCartesianModal?: () => void;
    readonly hasVariations?: boolean;
    readonly setHasVariations?: (value: boolean) => void;
    readonly editingVariationComboId?: string | null;
    readonly setEditingVariationComboId?: (id: string | null) => void;
    readonly editingVariationId?: string | null;
    readonly setEditingVariationId?: (id: string | null) => void;
    readonly validationErrors?: Record<string, boolean>;
    readonly onOpenConversionModal?: () => void;
    readonly variationsInUse?: Set<string>;
}

const ProductVariationsTab: React.FC<ProductVariationsTabProps> = ({
    formData,
    variations = formData?.variations || [],
    addVariation,
    onAddVariation,
    VariationRow = DefaultVariationRow,
    updateVariation,
    removeVariation,
    onRemoveVariation,
    setFormData,
    isCombo = false,
    onEdit,
    onEditVariation,
    setEditingVariationId,
    variationsInUse,
}) => {
    const list = variations || [];
    const canAddVariation = list.length > 0 && hasVariationAttribute(list[0]);
    const disabledMessage = 'Defina pelo menos um atributo e seu valor na Variação 1 para liberar novas variações.';

    // Resolve handlers — prioriza versão "on" (ProductFormModal) sobre legado
    const handleAdd = onAddVariation || addVariation;
    const handleRemove = onRemoveVariation || removeVariation;
    const handleEdit = onEditVariation || onEdit || ((id: string) => setEditingVariationId?.(id));

    // Preços do pai para repassar ao VariationRow (exibição dinâmica)
    const parentPrice = formData?.unitPrice;
    const parentPromoPrice = formData?.promoPrice;
    const parentSku = formData?.code;
    const parentImage = formData?.images && formData.images.length > 0 ? formData.images[0] : null;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white" aria-hidden="true">
                    <i className="bi bi-diagram-3-fill text-lg" />
                </div>
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                        Variações do produto
                    </h4>
                    <p className="mt-1 text-[10px] font-bold text-slate-500">
                        Cada variação deve conter pelo menos um atributo com seu valor definido. Para todo atributo adicionado, é obrigatório informar o valor correspondente.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                        Variações ({list.length})
                    </h4>
                    <span className="group relative" title={!canAddVariation ? disabledMessage : undefined}>
                        <button
                            type="button"
                            disabled={!canAddVariation}
                            onClick={handleAdd}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700 cursor-pointer"
                        >
                            <i className="bi bi-plus-lg mr-2" aria-hidden="true" />
                            Adicionar variação
                        </button>
                        {!canAddVariation && (
                            <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-64 rounded-xl bg-slate-800 px-3 py-2 text-center text-[10px] font-bold normal-case tracking-normal text-white shadow-xl group-hover:block">
                                {disabledMessage}
                            </span>
                        )}
                    </span>
                </div>

                <div className="overflow-x-auto rounded-[2.5rem] xl:border xl:border-slate-100 xl:bg-white xl:shadow-sm dark:xl:border-slate-800 dark:xl:bg-slate-950/20">
                    <div className="flex flex-col gap-4 xl:table w-full xl:min-w-[1000px] xl:border-collapse xl:text-left">
                        <div className="hidden xl:table-header-group">
                            <div className="xl:table-row bg-slate-50 dark:bg-slate-900/50">
                                <div className="xl:table-cell w-[80px] px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Foto</div>
                                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">SKU / Código</div>
                                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Atributos</div>
                                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Preço venda (R$)</div>
                                <div className="xl:table-cell px-6 py-5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Ações</div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 xl:table-row-group xl:divide-y xl:divide-slate-100 dark:xl:divide-slate-800">
                            {list.map((variation, index) => (
                                <VariationRow
                                    key={variation.id}
                                    v={variation}
                                    variationIndex={index}
                                    updateVariation={updateVariation}
                                    removeVariation={handleRemove}
                                    setFormData={setFormData}
                                    isCombo={isCombo}
                                    onEdit={handleEdit}
                                    parentPrice={parentPrice}
                                    parentPromoPrice={parentPromoPrice}
                                    parentSku={parentSku}
                                    parentImage={parentImage}
                                    inUse={variationsInUse?.has(variation.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductVariationsTab;
