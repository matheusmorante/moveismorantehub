import { useEffect, useId, useMemo, useState } from 'react';
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
  readonly onSetHasVariations?: (value: boolean) => void;
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
  onSetHasVariations,
  setFormData,
  isCombo = false,
  onEdit,
  onEditVariation,
  setEditingVariationId,
}) => {
  const list = variations || [];
  const [usageByVariationId, setUsageByVariationId] = useState<Record<string, boolean | undefined>>({});
  const [showSimpleModeTooltip, setShowSimpleModeTooltip] = useState(false);
  const simpleModeTooltipId = useId();

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

  const setMode = (value: boolean) => {
    setShowSimpleModeTooltip(false);
    if (onSetHasVariations) {
      onSetHasVariations(value);
    } else {
      setFormData?.((previous) => ({ ...previous, hasVariations: value }));
    }
  };

  // Preços do pai para repassar ao VariationRow (exibição dinâmica)
  const parentPrice = formData?.unitPrice;
  const parentPromoPrice = formData?.promoPrice;
  const parentSku = formData?.code;
  const parentImage = formData?.images && formData.images.length > 0 ? formData.images[0] : null;
  const isMultiMode = Boolean(formData?.hasVariations) || list.length > 1;
  const simpleModeBlocked = list.length > 1;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section aria-labelledby="product-variation-mode-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-4">
          <h4 id="product-variation-mode-heading" className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
            Tipo do produto
          </h4>
          <p className="mt-1 text-[10px] font-bold text-slate-500">
            Escolha se o produto terá uma variação simples ou duas ou mais variações.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative" onMouseLeave={() => setShowSimpleModeTooltip(false)}>
            <button
              type="button"
              aria-pressed={!isMultiMode}
              aria-disabled={simpleModeBlocked}
              aria-describedby={showSimpleModeTooltip ? simpleModeTooltipId : undefined}
              onFocus={() => {
                if (simpleModeBlocked) setShowSimpleModeTooltip(true);
              }}
              onBlur={() => setShowSimpleModeTooltip(false)}
              onClick={() => {
                if (simpleModeBlocked) {
                  setShowSimpleModeTooltip(true);
                  return;
                }
                setMode(false);
              }}
              className={`flex min-h-16 w-full flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors ${
                !isMultiMode
                  ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200'
                  : simpleModeBlocked
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
              }`}
            >
              <span className="text-xs font-black">Produto Simples</span>
              <span className="mt-1 text-[10px] font-semibold opacity-75">apenas 1 variação</span>
            </button>
            {showSimpleModeTooltip && simpleModeBlocked && (
              <span
                id={simpleModeTooltipId}
                role="tooltip"
                className="absolute left-2 top-full z-20 mt-2 max-w-72 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg dark:bg-slate-700"
              >
                Este produto se tornará simples automaticamente quando restar apenas 1 variação.
              </span>
            )}
          </div>
          <button
            type="button"
            aria-pressed={isMultiMode}
            onClick={() => setMode(true)}
            className={`flex min-h-16 flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors ${
              isMultiMode
                ? 'border-blue-600 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
            }`}
          >
            <span className="text-xs font-black">Produto com Variações</span>
            <span className="mt-1 text-[10px] font-semibold opacity-75">2 variações ou mais</span>
          </button>
        </div>
      </section>

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
