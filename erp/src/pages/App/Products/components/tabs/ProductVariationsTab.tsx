import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import type { VariationRowProps } from '../VariationRow';
import { VariationRow as DefaultVariationRow } from '../VariationRow';
import { checkVariationIsUsed } from '@/pages/utils/productService';

interface ProductVariationsTabProps {
  readonly formData?: Partial<Product>;
  readonly variations?: readonly Variation[];
  readonly isGeneratingBulk?: boolean;
  // Aceita tanto addVariation (legado) quanto onAddVariation (ProductFormModal)
  readonly addVariation?: () => void;
  readonly onAddVariation?: () => void;
  readonly VariationRow?: React.ComponentType<VariationRowProps>;
  readonly updateVariation?: (
    id: string,
    field: keyof Variation,
    value: Variation[keyof Variation]
  ) => void;
  // Aceita tanto removeVariation (legado) quanto onRemoveVariation (ProductFormModal)
  readonly removeVariation?: (id: string) => void;
  readonly onRemoveVariation?: (id: string) => void;
  readonly onDeleteVariation?: (id: string) => void;
  readonly deletingVariationId?: string | null;
  readonly isRegisteredProduct?: boolean;
  readonly isExistingProduct?: boolean;
  readonly isConventionalProduct?: boolean;
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
  onDeleteVariation,
  deletingVariationId,
  isRegisteredProduct = false,
  isExistingProduct = isRegisteredProduct,
  isConventionalProduct = false,
  isCombo = false,
  onEdit,
  onEditVariation,
  setEditingVariationId,
}) => {
  const list = variations || [];
  const [usageByVariationId, setUsageByVariationId] = useState<Record<string, boolean | undefined>>({});

  // Resolve handlers — prioriza versão "on" (ProductFormModal) sobre legado
  const handleAdd = onAddVariation || addVariation;
  const handleRemove = onRemoveVariation || removeVariation;
  const handleEdit = onEditVariation || onEdit || ((id: string) => setEditingVariationId?.(id));
  const variationIds = useMemo(() => list.map((variation) => variation.id).join('|'), [list]);
  const shouldCheckDeletionUsage =
    isRegisteredProduct && isConventionalProduct && Boolean(onDeleteVariation) && list.length > 1;

  useEffect(() => {
    if (!shouldCheckDeletionUsage) {
      setUsageByVariationId({});
      return;
    }

    const ids = variationIds ? variationIds.split('|') : [];
    let isCurrent = true;
    setUsageByVariationId(Object.fromEntries(ids.map((id) => [id, undefined])));

    void Promise.all(
      ids.map(async (id) => [id, await checkVariationIsUsed(id)] as const)
    ).then((entries) => {
      if (isCurrent) setUsageByVariationId(Object.fromEntries(entries));
    }).catch(() => {
      if (isCurrent) setUsageByVariationId(Object.fromEntries(ids.map((id) => [id, true])));
    });

    return () => {
      isCurrent = false;
    };
  }, [isRegisteredProduct, isConventionalProduct, onDeleteVariation, shouldCheckDeletionUsage, variationIds]);

  // Preços do pai para repassar ao VariationRow (exibição dinâmica)
  const parentPrice = formData?.unitPrice;
  const parentPromoPrice = formData?.promoPrice;
  const parentSku = formData?.code;
  const parentImage = formData?.images && formData.images.length > 0 ? formData.images[0] : null;
  const isMultiMode = Boolean(formData?.hasVariations) || list.length > 1;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"
          aria-hidden="true"
        >
          <i className="bi bi-diagram-3-fill text-lg" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
            Variações do produto
          </h4>
          <p className="mt-1 text-[10px] font-bold text-slate-500">
            Cada variação herda as Características do produto pai e pode definir valores próprios
            clicando para editar a variação.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
            Variações ({list.length})
          </h4>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-blue-700 cursor-pointer"
          >
            <i className="bi bi-plus-lg mr-2" aria-hidden="true" />
            Adicionar variação
          </button>
        </div>

        <div className="overflow-x-auto rounded-[2.5rem] xl:border xl:border-slate-100 xl:bg-white xl:shadow-sm dark:xl:border-slate-800 dark:xl:bg-slate-950/20">
          <div className="flex flex-col gap-4 xl:table w-full xl:min-w-[1000px] xl:border-collapse xl:text-left">
            <div className="hidden xl:table-header-group">
              <div className="xl:table-row bg-slate-50 dark:bg-slate-900/50">
                <div className="xl:table-cell w-[80px] px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Foto
                </div>
                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  SKU / Código
                </div>
                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Nome da Variação
                </div>
                <div className="xl:table-cell px-6 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Preço venda (R$)
                </div>
                <div className="xl:table-cell px-6 py-5 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Ações
                </div>
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
                  onDeleteVariation={list.length > 1 ? onDeleteVariation : undefined}
                  isDeleting={deletingVariationId === variation.id}
                  isDeletionBlocked={
                    shouldCheckDeletionUsage && usageByVariationId[variation.id] !== false
                  }
                  deletionDisabledReason={
                    usageByVariationId[variation.id] === undefined
                      ? 'Verificando vínculos de estoque e vendas.'
                      : 'A variação possui vínculos de histórico ou não foi possível verificá-los.'
                  }
                  isCombo={isCombo}
                  onEdit={
                    !isExistingProduct && !isMultiMode ? undefined : handleEdit
                  }
                  inheritParentImages={!isMultiMode}
                  parentPrice={parentPrice}
                  parentPromoPrice={parentPromoPrice}
                  parentSku={parentSku}
                  parentImage={parentImage}
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
