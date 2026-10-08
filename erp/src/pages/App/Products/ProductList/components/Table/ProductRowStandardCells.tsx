import React from 'react';
import Product, { ProductVisibilitySettings } from '@/pages/types/product.type';
import { formatCurrency } from '@/pages/utils/formatters';
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { getProductKind, isNonConventionalProduct } from '@/pages/utils/productKindRules';
import { ChannelStatusBadges } from '../Shared/ChannelStatusBadges';
import type { ProductListRow } from '../../types';

export interface CellProductLike extends Product {
  readonly category_name?: string;
  readonly categoryName?: string;
  readonly variationId?: string;
  readonly activeVariationsCount?: number;
  readonly totalVariationsCount?: number;
}

export interface CellContext {
  readonly product: CellProductLike;
  readonly visibilitySettings: ProductVisibilitySettings;
  readonly isChildVar: boolean;
  readonly singleVariation?: ProductListRow;
  readonly hasVariations?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: () => void;
  readonly categoryTree?: unknown;
  readonly showCatalogControl?: boolean;
  readonly canManageCatalog: boolean;
  readonly canDeleteProducts: boolean;
  readonly isDraft: boolean;
  readonly onToggleActive: (id: string, currentStatus: boolean) => void;
  readonly onDeactivateCatalog: (id: string) => void;
}

export function renderProductRowStandardCell(key: string, ctx: CellContext): React.ReactNode {
  const {
    product,
    visibilitySettings,
    isChildVar,
    singleVariation,
    hasVariations,
    isExpanded,
    onToggleExpand,
    categoryTree,
    showCatalogControl = true,
    canManageCatalog,
    canDeleteProducts,
    isDraft,
    onToggleActive,
    onDeactivateCatalog,
  } = ctx;

  if (!visibilitySettings[key as keyof ProductVisibilitySettings]) return null;

  switch (key) {
    case 'id':
      return (
        <td key="id" className="px-3 py-3 text-left w-[1%] whitespace-nowrap">
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
            {product.id || '-'}
          </span>
        </td>
      );

    case 'sku':
      return (
        <td
          key="sku"
          className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {hasVariations && !visibilitySettings.description && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isExpanded
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title={isExpanded ? 'Ocultar Variações' : 'Mostrar Variações'}
              >
                <i
                  className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`}
                />
              </button>
            )}
            {isChildVar && !visibilitySettings.description && (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">
                ↳
              </span>
            )}
            <span className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
              {normalizeVariationSku(product.sku || product.code) || '-'}
            </span>
          </div>
        </td>
      );

    case 'code':
      return (
        <td
          key="code"
          className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''}`}
        >
          <div className="flex items-center gap-1.5">
            {hasVariations && !visibilitySettings.description && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isExpanded
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title={isExpanded ? 'Ocultar Variações' : 'Mostrar Variações'}
              >
                <i
                  className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`}
                />
              </button>
            )}
            {isChildVar && !visibilitySettings.description && (
              <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">
                ↳
              </span>
            )}
            <span className="font-bold text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
              {product.code || '-'}
            </span>
          </div>
        </td>
      );

    case 'unitPrice': {
      const unitPrice = singleVariation?.unitPrice ?? product.unitPrice;
      const promoPrice = singleVariation ? singleVariation.promoPrice : product.promoPrice;
      const hasPromo = Boolean(
        promoPrice &&
          Number(promoPrice) > 0 &&
          Number(promoPrice) < Number(unitPrice)
      );
      return (
        <td key="unitPrice" className="px-3 py-3 text-right">
          <div className="flex flex-col items-end">
            {hasPromo ? (
              <>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(promoPrice || 0)}
                </span>
                <span className="text-[10px] text-slate-400 line-through">
                  {formatCurrency(unitPrice || 0)}
                </span>
              </>
            ) : (
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                {formatCurrency(unitPrice || 0)}
              </span>
            )}
          </div>
        </td>
      );
    }

    case 'costPrice':
      return (
        <td key="costPrice" className="px-3 py-3 text-right">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            {formatCurrency(singleVariation?.costPrice ?? product.costPrice ?? 0)}
          </span>
        </td>
      );

    case 'stock': {
      if (product.isParent && !singleVariation) return <td key="stock" className="px-3 py-3" />;
      const stock = singleVariation?.stock ?? product.stock ?? 0;
      const minStock = singleVariation?.minStock ?? product.minStock ?? 0;
      const isLowStock = stock <= minStock;
      return (
        <td key="stock" className="px-3 py-3 text-center">
          <span
            className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}
          >
            {product.itemType === 'service' ? '-' : stock}
          </span>
        </td>
      );
    }

    case 'category': {
      if (isChildVar) return <td key="category" className="px-3 py-3" />;
      const categoryDisplay =
        getCategoryBreadcrumb(product.categoryIds || [], categoryTree as never) ||
        product.category ||
        product.category_name ||
        product.categoryName ||
        '-';
      const leafCategories = categoryDisplay
        .split(' | ')
        .map((path: string) => {
          const parts = path.split(' > ');
          return parts[parts.length - 1];
        })
        .join(' | ');
      return (
        <td key="category" className="px-3 py-3 text-left">
          <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-[250px]">
            {leafCategories.split(' | ').map((catName: string, idx: number) => (
              <div
                key={idx}
                className="text-[10px] font-bold uppercase tracking-widest leading-relaxed"
              >
                <span className="text-slate-600 dark:text-slate-300">{catName}</span>
                {idx < leafCategories.split(' | ').length - 1 && (
                  <span className="ml-2 text-blue-500 opacity-50">|</span>
                )}
              </div>
            ))}
          </div>
        </td>
      );
    }

    case 'createdAt':
      return (
        <td key="createdAt" className="px-3 py-3 text-left">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-955 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
            {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
          </span>
        </td>
      );

    case 'status': {
      const targetCatalogId = singleVariation
        ? singleVariation.variationId || singleVariation.id || product.id || ''
        : product.isVariation
          ? product.variationId || product.id || ''
        : product.id || '';
      const active = singleVariation ? singleVariation.active !== false : product.active !== false;

      return (
        <td key="status" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
            <ChannelStatusBadges
              active={active}
              catalogStatus={singleVariation?.status || product.status}
              isParent={Boolean(product.isParent && !singleVariation)}
              isNonConventional={isNonConventionalProduct(product as any)}
              isSalvado={getProductKind(product) === 'salvado'}
              canManageCatalog={canManageCatalog}
              canToggleActive={canDeleteProducts}
              showCatalogControl={showCatalogControl}
              isDraft={isDraft}
              activeVariationsCount={singleVariation ? undefined : product.activeVariationsCount}
              totalVariationsCount={singleVariation ? undefined : product.totalVariationsCount}
              disabled={Boolean(singleVariation?.mergedToVariationId)}
              disabledReason={
                singleVariation?.mergedToVariationId
                  ? 'Esta variação foi mesclada e seu status não pode ser alterado diretamente.'
                  : undefined
              }
              onToggleActive={(e) => {
                e.stopPropagation();
                if (targetCatalogId) onToggleActive(targetCatalogId, active);
              }}
              onToggleCatalog={(e) => {
                e.stopPropagation();
                onDeactivateCatalog(targetCatalogId);
              }}
              size="sm"
            />
          </div>
        </td>
      );
    }

    default:
      return null;
  }
}
