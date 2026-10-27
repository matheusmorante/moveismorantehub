import React, { useState, useEffect } from 'react';
import type Product from '@/pages/types/product.type';
import ProductImage from '@/components/ProductImage';
import { parseVariationImages } from '@/pages/utils/productService';
import type { ProductListRow } from '../../types';
import { StockOriginBadge } from '../Shared/StockOriginBadge';
import { MergedBadge } from '../Shared/MergedBadge';

export interface ProductRowDescriptionCellProps {
  readonly product: Product & {
    readonly is_draft?: boolean;
    readonly allVariations?: readonly unknown[];
    readonly variationId?: string;
  };
  readonly displayName: string;
  readonly singleVariation?: ProductListRow;
  readonly hasVariations?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: () => void;
  readonly isChildVar: boolean;
  readonly isChildVariation: boolean;
  readonly variationsCount?: number;
  readonly oppName: string | null;
  readonly supplierNames: readonly string[];
}

/**
 * Célula de descrição da tabela de produtos com hierarquia visual, thumbnail com fallback seguro e badges.
 */
export const ProductRowDescriptionCell: React.FC<ProductRowDescriptionCellProps> = ({
  product,
  singleVariation,
  displayName,
  hasVariations,
  isExpanded,
  onToggleExpand,
  isChildVar,
  isChildVariation,
  variationsCount,
  oppName,
  supplierNames,
}) => {
  const [imageError, setImageError] = useState(false);
  const isDraft =
    Boolean(product.isDraft) || Boolean(product.is_draft) || product.status === 'draft';

  const count = variationsCount ?? product.allVariations?.length ?? 0;
  const parentImages =
    ((product as any).parentImages as string[] | undefined) ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images : undefined) ||
    parseVariationImages((product as any).image_url);
  const fallbackImage = parentImages && parentImages.length > 0 ? parentImages[0] : null;

  const variationImages =
    singleVariation?.images && singleVariation.images.length > 0
      ? singleVariation.images
      : parseVariationImages((singleVariation as any)?.image_url);
  const variationImage = variationImages?.[0];

  const selfImages =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : parseVariationImages((product as any).image_url);

  const primaryImage = variationImage || selfImages?.[0] || fallbackImage;
  const hasImage = Boolean(!imageError && primaryImage);

  useEffect(() => {
    setImageError(false);
  }, [primaryImage]);

  return (
    <td key="description" className="px-3 py-3 text-left min-w-[520px]">
      <div className="flex items-center gap-2 sm:gap-3">
        {hasVariations && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Ocultar variações' : 'Mostrar variações'}
            className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center transition-all cursor-pointer ${
              isExpanded
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            title={isExpanded ? 'Ocultar Variações' : 'Mostrar Variações'}
          >
            <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
          </button>
        )}

        {isChildVar && (
          <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none ml-4 mr-0.5">
            ↳
          </span>
        )}

        <div className="flex items-center gap-3 transition-all duration-300">
          {(!product.isParent || singleVariation) && (
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200/60 dark:border-slate-800">
              {hasImage ? (
                <ProductImage
                  src={primaryImage as string}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  size="thumbnail"
                  onError={() => setImageError(true)}
                />
              ) : (
                <i className="bi bi-image text-slate-400 text-base" />
              )}
            </div>
          )}

          <div className="flex flex-col">
            {/* Linha 1: Título do produto */}
            <span
              className={`text-sm ${
                isChildVariation
                  ? 'font-semibold text-slate-800 dark:text-slate-200'
                  : product.isParent
                    ? 'font-bold text-slate-900 dark:text-slate-100'
                    : 'font-bold text-slate-700 dark:text-slate-200'
              }`}
            >
              {displayName}
            </span>

            {/* Subtítulo da Composição/Combo */}
            {(product.itemType === 'composition' || product.isCombo) &&
              product.comboItems &&
              product.comboItems.length > 0 && (
                <div className="flex items-center flex-wrap gap-1 mt-0.5">
                  {product.comboItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
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

            {/* Linha 2 (abaixo do título): contagem de variações + origem do estoque + fornecedores */}
            {(product.isParent || !isChildVariation || supplierNames.length > 0) && (
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                {product.isParent && !singleVariation && count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 select-none">
                    <i className="bi bi-layers text-[9px]" />
                    {`${count} ${count === 1 ? 'variação' : 'variações'}`}
                  </span>
                )}

                {!isChildVariation && product.itemType !== 'service' && (
                  <StockOriginBadge
                    product={product}
                    singleVariation={singleVariation}
                    oppName={oppName}
                    size="sm"
                  />
                )}

                {!isChildVariation &&
                  supplierNames.map((supName, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border border-slate-200 dark:border-slate-700"
                    >
                      <i className="bi bi-truck text-slate-400 dark:text-slate-500" /> {supName}
                    </span>
                  ))}
              </div>
            )}

            {/* Selos de Triagem e Tipo */}
            <div className="flex items-center gap-2 mt-1">
              {(Boolean((product as any).isMerged) ||
                Boolean(singleVariation?.mergedToVariationId) ||
                Boolean(product.mergedToVariationId)) && (
                <MergedBadge
                  targetVariationId={
                    singleVariation?.mergedToVariationId || product.mergedToVariationId
                  }
                  size="xs"
                />
              )}

              {isDraft && (
                <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                  <i className="bi bi-file-earmark-text" /> Rascunho
                </span>
              )}

              {product.itemType === 'composition' ? (
                <span
                  title="Produto composto"
                  className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-900/50"
                >
                  <i className="bi bi-boxes" aria-hidden="true" /> Composto
                </span>
              ) : product.itemType === 'service' ? (
                <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/30">
                  <i className="bi bi-tools" /> Serviço
                </span>
              ) : (
                product.isCombo && (
                  <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40 shadow-sm animate-pulse-slow">
                    <i className="bi bi-layers-fill" /> Combo/Jogo
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </td>
  );
};

export default ProductRowDescriptionCell;
