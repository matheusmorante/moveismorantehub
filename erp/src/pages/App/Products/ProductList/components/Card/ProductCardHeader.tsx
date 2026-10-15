import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { isProductIdentificationLabelOnlyProfile } from '@/pages/utils/accessRoles';
import Product from '../../../../../types/product.type';
import { getProductKind, isNonConventionalProduct } from '../../../../../utils/productKindRules';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import { StockOriginBadge } from '../Shared/StockOriginBadge';
import type { CardVariationItem } from '../Variations/ProductCardVariationList';
import { ProductCardActions } from './ProductCardActions';

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
  onOpenSalesModal,
}) => {
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const singleVariationId = singleVariation?.variationId || singleVariation?.id || product.id!;

  return (
    <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
      {/* Lado Esquerdo: Botão Dropdown de Variações + Código do Produto */}
      <div className="flex items-center gap-1.5">
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
            <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700 font-bold">
              {displaySku}
            </span>
          ) : null;
        })()}
      </div>

      {/* Canto Superior Direito: Todos os Selos + Botões de Ação */}
      <div
        className="flex items-center gap-2 flex-wrap justify-end ml-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Status de Canais (ERP e Catálogo) */}
        <ChannelStatusBadges
          active={singleVariation ? singleVariation.active !== false : product.active !== false}
          catalogStatus={singleVariation?.status || product.status}
          isParent={isParent && !singleVariation}
          isNonConventional={isNonConventionalProduct(product)}
          isSalvado={
            getProductKind(product) === 'salvado' ||
            getProductKind(singleVariation as any) === 'salvado' ||
            Boolean(oppName && oppName.toLowerCase().includes('salvado'))
          }
          canManageCatalog={canManageCatalog}
          canToggleActive={canDeleteProducts}
          showCatalogControl={showCatalogControl}
          isDraft={isDraft}
          activeVariationsCount={
            singleVariation
              ? undefined
              : ((product as any).activeVariationsCount ??
                product.variations?.filter((v: any) => v.active !== false).length)
          }
          totalVariationsCount={
            singleVariation
              ? undefined
              : ((product as any).totalVariationsCount ?? product.variations?.length)
          }
          onToggleActive={(e) => {
            e.stopPropagation();
            onToggleActive(
              singleVariationId,
              singleVariation ? singleVariation.active !== false : product.active !== false
            );
          }}
          onToggleCatalog={(e) => {
            e.stopPropagation();
            onDeactivateCatalog(singleVariationId);
          }}
          disabled={Boolean(singleVariation?.mergedToVariationId)}
          disabledReason={
            singleVariation?.mergedToVariationId
              ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
              : undefined
          }
          size="xs"
        />

        {/* 2. Selo de Rascunho */}
        {isDraft && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 select-none">
            <i className="bi bi-file-earmark-text text-amber-600 text-[9px]" />
            Rascunho
          </span>
        )}

        {/* 3. Selo de Origem do Estoque */}
        {!isVariation && product.itemType !== 'service' && (
          <StockOriginBadge
            product={product}
            singleVariation={singleVariation}
            oppName={oppName}
            size="xs"
          />
        )}

        {/* 4. Selo de Tipo (Serviço) */}
        {!isVariation && product.itemType === 'service' && (
          <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
            Serviço
          </span>
        )}

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
              onOpenSalesModal={onOpenSalesModal}
            />
          )
        )}
      </div>
    </div>
  );
};
