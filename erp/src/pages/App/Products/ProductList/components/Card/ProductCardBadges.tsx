import React from 'react';
import type Product from '../../../../../types/product.type';
import { isNonConventionalProduct } from '../../../../../utils/productKindRules';
import { isSalvadoStockOrigin } from '../../../../../../../../shared-utils/productStockOrigin';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import { MergedBadge } from '../Shared/MergedBadge';
import { StockOriginBadge } from '../Shared/StockOriginBadge';
import type { CardVariationItem } from '../Variations/ProductCardVariationList';

interface ProductCardBadgesProps {
  readonly product: Product;
  readonly canDeleteProducts: boolean;
  readonly showCatalogControl?: boolean;
  readonly isParent: boolean;
  readonly isVariation: boolean;
  readonly isDraft: boolean;
  readonly canManageCatalog: boolean;
  readonly singleVariation?: CardVariationItem;
  readonly oppName: string | undefined;
  readonly onToggleActive: (id: string, currentStatus: boolean) => void;
  readonly onDeactivateCatalog: (id: string) => void;
  readonly className?: string;
}

export const ProductCardBadges: React.FC<ProductCardBadgesProps> = ({
  product,
  canDeleteProducts,
  showCatalogControl = true,
  isParent,
  isVariation,
  isDraft,
  canManageCatalog,
  singleVariation,
  oppName,
  onToggleActive,
  onDeactivateCatalog,
  className = '',
}) => {
  const singleVariationId = singleVariation?.variationId || singleVariation?.id || product.id!;
  const isMerged = Boolean(singleVariation?.mergedToVariationId) || Boolean((product as any).isMerged);

  return (
    <div className={`items-center gap-2 flex-wrap ${className}`} onClick={(event) => event.stopPropagation()}>
      <ChannelStatusBadges
        active={singleVariation ? singleVariation.active !== false : product.active !== false}
        catalogStatus={singleVariation?.status || product.status}
        isParent={isParent && !singleVariation}
        isNonConventional={isNonConventionalProduct(product)}
        isSalvado={isSalvadoStockOrigin(product, singleVariation, oppName)}
        canManageCatalog={canManageCatalog}
        canToggleActive={canDeleteProducts}
        showCatalogControl={showCatalogControl}
        isDraft={isDraft}
        activeVariationsCount={
          singleVariation
            ? undefined
            : ((product as any).activeVariationsCount ??
              product.variations?.filter((variation: any) => variation.active !== false).length)
        }
        totalVariationsCount={
          singleVariation
            ? undefined
            : ((product as any).totalVariationsCount ?? product.variations?.length)
        }
        onToggleActive={(event) => {
          event.stopPropagation();
          onToggleActive(
            singleVariationId,
            singleVariation ? singleVariation.active !== false : product.active !== false
          );
        }}
        onToggleCatalog={(event) => {
          event.stopPropagation();
          onDeactivateCatalog(singleVariationId);
        }}
        disabled={isMerged}
        disabledReason={isMerged
          ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
          : undefined}
        size="xs"
      />

      {isMerged && (
        <MergedBadge
          targetVariationId={singleVariation?.mergedToVariationId}
          size="xs"
        />
      )}

      {isDraft && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 select-none">
          <i className="bi bi-file-earmark-text text-amber-600 text-[9px]" />
          Rascunho
        </span>
      )}

      {!isVariation && product.itemType !== 'service' && (
        <StockOriginBadge
          product={product}
          singleVariation={singleVariation}
          oppName={oppName}
          size="xs"
        />
      )}

      {!isVariation && product.itemType === 'service' && (
        <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
          Serviço
        </span>
      )}
    </div>
  );
};
