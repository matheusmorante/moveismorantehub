import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { isProductIdentificationLabelOnlyProfile } from '@/pages/utils/accessRoles';
import Product from '../../../../../types/product.type';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import type { CardVariationItem } from '../Variations/ProductCardVariationList';
import { ProductCardActions } from './ProductCardActions';
import { ProductCardBadges } from './ProductCardBadges';

interface ProductCardHeaderProps {
  product: Product;
  readOnly?: boolean;
  canDeleteProducts: boolean;
  showCatalogControl?: boolean;
  isParent: boolean;
  isVariation: boolean;
  isDraft: boolean;
  canManageCatalog: boolean;
  hasParentVariations: boolean;
  singleVariation?: CardVariationItem;
  showVariations: boolean;
  setShowVariations: React.Dispatch<React.SetStateAction<boolean>>;
  oppName: string | undefined;
  showTrash: boolean | undefined;
  onEdit: (product: Product) => void;
  onLaunchStock?: (product: Product) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onMoveToTrash?: (product: Product) => void;
  onPermanentDelete?: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDeactivateCatalog: (id: string) => void;
  onShowHistory?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
  onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
  onMergeDuplicateProduct?: (product: Product) => void;
  onOpenSalesModal: () => void;
}

export const ProductCardHeader: React.FC<ProductCardHeaderProps> = ({
  product,
  readOnly = false,
  canDeleteProducts,
  showCatalogControl = true,
  isParent,
  isVariation,
  isDraft,
  canManageCatalog,
  hasParentVariations,
  singleVariation,
  showVariations,
  setShowVariations,
  oppName,
  showTrash,
  onEdit,
  onLaunchStock,
  onDelete,
  onRestore,
  onMoveToTrash,
  onPermanentDelete,
  onToggleActive,
  onDeactivateCatalog,
  onShowHistory,
  onDuplicate,
  onMoveToAnotherFamily,
  onMergeWithAnotherVariation,
  onMergeDuplicateProduct,
  onOpenSalesModal,
}) => {
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);

  return (
    <div className="flex justify-between items-start mb-2 gap-2">
      {/* Lado Esquerdo: Botão Dropdown de Variações + Código do Produto */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {hasParentVariations && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowVariations((prev) => !prev);
            }}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              showVariations
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'bg-slate-300/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={showVariations ? 'Ocultar Variações' : 'Mostrar Variações'}
          >
            <i
              className={`bi bi-chevron-${showVariations ? 'down' : 'right'} text-xs font-black`}
            />
            <span>Variações ({(product as any).allVariations.length})</span>
          </button>
        )}
        {(() => {
          const displaySku = singleVariation
            ? normalizeVariationSku(singleVariation.sku || (singleVariation as any).code || product.sku || product.code) || product.code
            : product.code || (product.sku ? normalizeVariationSku(product.sku) : '');
          return displaySku ? (
            <span title={displaySku} className="max-w-full truncate font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-bold">
              {displaySku}
            </span>
          ) : null;
        })()}
        {product.itemType === 'composition' && (
          <span
            title="Produto composto"
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300"
          >
            <i className="bi bi-boxes" aria-hidden="true" /> Composto
          </span>
        )}
      </div>

      {/* Canto Superior Direito: botões de ação; os selos descem abaixo dos dados no card mobile. */}
      <div
        className="ml-auto flex shrink-0 items-center justify-end gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ProductCardBadges
          product={product}
          canDeleteProducts={canDeleteProducts}
          showCatalogControl={showCatalogControl}
          isParent={isParent}
          isVariation={isVariation}
          isDraft={isDraft}
          canManageCatalog={canManageCatalog}
          singleVariation={singleVariation}
          oppName={oppName}
          onToggleActive={onToggleActive}
          onDeactivateCatalog={onDeactivateCatalog}
          className="hidden xl:flex"
        />

        {readOnly && !showTrash && !isLabelOnlyProfile ? (
          <button
            type="button"
            onClick={() => onEdit(product)}
            aria-label={`Ver detalhes de ${product.name || product.title || 'produto'}`}
            title="Ver detalhes"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <i className="bi bi-eye" />
          </button>
        ) : showTrash && !isLabelOnlyProfile && !isVariation ? (
          <button
            type="button"
            onClick={() => onRestore?.(product.id || '')}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            title="Restaurar"
            aria-label="Restaurar produto"
          >
            <i className="bi bi-arrow-counterclockwise text-sm font-bold" />
          </button>
        ) : (
          !showTrash &&
          !isVariation && (
            <ProductCardActions
              product={product}
              singleVariation={!isDraft ? singleVariation : undefined}
              showEditButton={!readOnly}
              canDeleteProducts={canDeleteProducts}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onShowHistory={onShowHistory}
              onLaunchStock={onLaunchStock}
              onDelete={onDelete}
              onMoveToTrash={onMoveToTrash}
              onPermanentDelete={onPermanentDelete}
              onMoveToAnotherFamily={onMoveToAnotherFamily}
              onMergeWithAnotherVariation={onMergeWithAnotherVariation}
              onMergeDuplicateProduct={onMergeDuplicateProduct}
              onOpenSalesModal={onOpenSalesModal}
            />
          )
        )}
      </div>
    </div>
  );
};
