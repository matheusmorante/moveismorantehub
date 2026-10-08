import React from 'react';
import type Product from '../../../../../types/product.type';
import type { ProductCategoryTree, ProductListRow } from '../../types';
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import ProductSalesModal from '../../../components/modals/product/ProductSalesModal';
import { useProductMetadata } from '../../hooks/data/useProductMetadata';
import { getVariationDisplayName } from '../../utils/presentation/getVariationDisplayName';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';
import { CardThumbnail } from './CardThumbnail';
import { CardPriceStock } from './CardPriceStock';
import { ProductCardVariationList } from '../Variations/ProductCardVariationList';
import { ProductCardHeader } from './ProductCardHeader';
import { isNonConventionalProduct } from '@/pages/utils/productKindRules';

interface ProductCardProps {
  readonly product: ProductListRow;
  readonly readOnly?: boolean;
  readonly canDeleteProducts: boolean;
  readonly showCatalogControl?: boolean;
  readonly onEdit: (product: Product) => void;
  readonly onLaunchStock?: (product: Product) => void;
  readonly onDelete: (id: string) => void;
  readonly onRestore: (id: string) => void;
  readonly onPermanentDelete: (id: string) => void;
  readonly onToggleActive: (id: string, currentStatus: boolean) => void;
  readonly onDeactivateCatalog: (id: string) => void;
  readonly onShowHistory?: (product: Product) => void;
  readonly showTrash?: boolean;
  readonly isSelected?: boolean;
  readonly onToggleSelection?: () => void;
  readonly categoryTree?: ProductCategoryTree;
  readonly onRefresh?: () => void;
  readonly onDuplicate?: (product: Product) => void;
  readonly exitedVariationIds?: ReadonlySet<string>;
  readonly onMoveToAnotherFamily?: (variation: any) => void;
  readonly onMergeWithAnotherVariation?: (variation: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  readOnly = false,
  canDeleteProducts,
  showCatalogControl = true,
  onEdit,
  onLaunchStock,
  onDelete,
  onRestore,
  onToggleActive,
  onDeactivateCatalog,
  onShowHistory,
  showTrash,
  isSelected,
  categoryTree,
  onDuplicate,
  exitedVariationIds,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
  onRefresh,
}) => {
  const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
  const [showVariations, setShowVariations] = React.useState(false);

  const isParent = Boolean(product.isParent);
  const isVariation = product.isVariation || !!product.parentId;
  const singleVariation =
    isParent && product.allVariations?.length === 1 ? product.allVariations[0] : undefined;
  const isSingleVariationCard = Boolean(singleVariation);
  const isDraft = Boolean(
    product.isDraft ||
      product.status === 'draft' ||
      (product as ProductListRow & { is_draft?: boolean }).is_draft
  );
  const isNonConventional = isNonConventionalProduct(product);
  const canManageCatalog = !readOnly && !isDraft && (product.active !== false || isNonConventional);

  const { oppName, supplierNames } = useProductMetadata(product);
  const variationName = isVariation ? getVariationDisplayName(product) : '';
  const hasParentVariations = isParent && (product.allVariations?.length || 0) > 1;

  const displayTitle = isSingleVariationCard
    ? getSelectedProductDisplayName(product, singleVariation)
    : isVariation
      ? variationName || product.name || product.title || '-'
      : product.name ||
        product.title ||
        (product.description ? product.description.split('\n')[0].substring(0, 120) : '-');

  const cardUnitPrice = singleVariation?.unitPrice ?? product.unitPrice ?? 0;
  const cardPromoPrice = singleVariation ? singleVariation.promoPrice : product.promoPrice;
  const cardStock = singleVariation?.stock ?? product.stock ?? 0;
  const cardMinStock = singleVariation?.minStock ?? product.minStock ?? 0;
  const cardImages =
    singleVariation?.images && singleVariation.images.length > 0
      ? singleVariation.images
      : product.images;

  const hasPromo = Boolean(
    cardPromoPrice &&
      Number(cardPromoPrice) > 0 &&
      Number(cardPromoPrice) < Number(cardUnitPrice)
  );
  const currentPrice = Number(hasPromo ? cardPromoPrice : cardUnitPrice);
  const isLowStock = Number(cardStock) <= Number(cardMinStock);

  return (
    <div
      role={hasParentVariations ? 'button' : undefined}
      tabIndex={hasParentVariations ? 0 : undefined}
      aria-expanded={hasParentVariations ? showVariations : undefined}
      onKeyDown={(e) => {
        if (hasParentVariations && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          setShowVariations((prev) => !prev);
        }
      }}
      onClick={() => {
        if (hasParentVariations) {
          setShowVariations((prev) => !prev);
        }
      }}
      className={`border rounded-2xl p-2.5 sm:p-3.5 shadow-sm transition-all relative w-full
                ${hasParentVariations ? 'cursor-pointer' : ''}
                ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : isParent && !isSingleVariationCard
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-800/80 shadow-xs'
                      : isVariation
                        ? 'border-slate-200 dark:border-slate-800 ml-2.5 sm:ml-5 bg-white dark:bg-slate-900 shadow-2xs'
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
    >
      <ProductCardHeader
        product={product}
        readOnly={readOnly}
        canDeleteProducts={canDeleteProducts}
        showCatalogControl={showCatalogControl}
        isParent={isParent}
        isVariation={isVariation}
        isDraft={isDraft}
        canManageCatalog={canManageCatalog}
        hasParentVariations={hasParentVariations}
        singleVariation={singleVariation}
        showVariations={showVariations}
        setShowVariations={setShowVariations}
        oppName={oppName ?? undefined}
        showTrash={showTrash}
        onEdit={onEdit}
        onLaunchStock={onLaunchStock}
        onDelete={onDelete}
        onToggleActive={onToggleActive}
        onDeactivateCatalog={onDeactivateCatalog}
        onShowHistory={onShowHistory}
        onDuplicate={onDuplicate}
        onMoveToAnotherFamily={onMoveToAnotherFamily}
        onMergeWithAnotherVariation={onMergeWithAnotherVariation}
        onOpenSalesModal={() => setIsSalesModalOpen(true)}
      />

      {/* Corpo do Card: Imagem e Título */}
      <div className="mb-3 flex items-center gap-3">
        {(!isParent || isSingleVariationCard) && (
          <CardThumbnail images={cardImages} name={displayTitle} title={product.title} />
        )}
        <div className="flex-1 min-w-0">
          <h3
            className={`leading-tight line-clamp-2 ${
              isParent
                ? 'text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight'
                : isVariation
                  ? 'text-xs font-bold text-slate-800 dark:text-slate-200 pl-3 border-l-2 border-indigo-200 dark:border-indigo-800'
                  : 'text-sm font-bold text-slate-800 dark:text-slate-100'
            }`}
          >
            {displayTitle}
          </h3>

          {/* Subtítulo da Composição/Combo */}
          {(product.itemType === 'composition' || product.isCombo) &&
            product.comboItems &&
            product.comboItems.length > 0 && (
              <div className="flex items-center flex-wrap gap-1 mt-1">
                {product.comboItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span className="text-slate-300 dark:text-slate-600 text-[9px]">•</span>
                    )}
                    <span
                      className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[150px]"
                      title={item.description}
                    >
                      {item.description ? item.description.split(' - ')[0] : 'Item sem nome'}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}

          {!isVariation && (
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1 leading-relaxed">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-wide">
                {getCategoryBreadcrumb(
                  product.categoryIds || [],
                  categoryTree ?? { categories: [], relations: [] }
                ) ||
                  product.category ||
                  '-'}
              </span>
              {supplierNames.map((supName, sIdx) => (
                <React.Fragment key={sIdx}>
                  <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 tracking-wide bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                    <i className="bi bi-truck text-[9px] text-slate-400 dark:text-slate-500" />
                    {supName}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rodapé do Card: Preço e Estoque */}
      {(!isParent || isSingleVariationCard) && (
        <CardPriceStock
          hasPromo={hasPromo || false}
          unitPrice={cardUnitPrice}
          currentPrice={currentPrice}
          itemType={product.itemType}
          isLowStock={isLowStock}
          stock={cardStock}
          unit={singleVariation?.unit || product.unit}
        />
      )}

      {/* Botão de Reativar em Trash */}
      {showTrash && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onRestore(product.id!)}
            className="flex flex-col items-center justify-center gap-1 py-2 w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors font-bold cursor-pointer"
          >
            <i className="bi bi-check-circle-fill text-base" />
            <span className="text-[9px] font-black uppercase">Reativar Produto</span>
          </button>
        </div>
      )}

      {/* Modal de Vendas */}
      {isSalesModalOpen && (
        <ProductSalesModal product={product} onClose={() => setIsSalesModalOpen(false)} />
      )}

      {/* Variações Filhas Expandidas (Apenas para Pai) */}
      {isParent && hasParentVariations && (
        <ProductCardVariationList
          product={product}
          readOnly={readOnly}
          canDeleteProducts={canDeleteProducts}
          showCatalogControl={showCatalogControl}
          variations={(product as any).allVariations || []}
          showVariations={showVariations}
          canManageCatalog={canManageCatalog}
          isDraft={isDraft}
          exitedVariationIds={exitedVariationIds}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
          onDeactivateCatalog={onDeactivateCatalog}
          onShowHistory={onShowHistory}
          onLaunchStock={onLaunchStock}
          onMoveToAnotherFamily={onMoveToAnotherFamily}
          onMergeWithAnotherVariation={onMergeWithAnotherVariation}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
};

export default ProductCard;
