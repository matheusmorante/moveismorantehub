import React from 'react';
import Product, { ProductVisibilitySettings } from '../../../types/product.type';
import { formatCurrency } from '../../../utils/formatters';
import { getCategoryBreadcrumb } from '@/pages/utils/categoryService';
import { normalizeVariationSku } from '@/pages/utils/productVariationDefaults';
import { ChannelStatusBadges } from './ChannelStatusBadges';

interface CellContext {
    product: Product;
    visibilitySettings: ProductVisibilitySettings;
    isChildVar: boolean;
    hasVariations?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    categoryTree?: any;
    canManageCatalog: boolean;
    isDraft: boolean;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
}

export function renderProductRowStandardCell(key: string, ctx: CellContext) {
    const {
        product,
        visibilitySettings,
        isChildVar,
        hasVariations,
        isExpanded,
        onToggleExpand,
        categoryTree,
        canManageCatalog,
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
                        {product.id || "-"}
                    </span>
                </td>
            );

        case 'sku':
            return (
                <td key="sku" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''}`}>
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
                                title={isExpanded ? "Ocultar Variações" : "Mostrar Variações"}
                            >
                                <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
                            </button>
                        )}
                        {isChildVar && !visibilitySettings.description && (
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">↳</span>
                        )}
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
                            {normalizeVariationSku(product.sku || product.code) || "-"}
                        </span>
                    </div>
                </td>
            );

        case 'code':
            return (
                <td key="code" className={`px-3 py-3 text-left w-[1%] whitespace-nowrap ${isChildVar && !visibilitySettings.description ? 'pl-8' : ''}`}>
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
                                title={isExpanded ? "Ocultar Variações" : "Mostrar Variações"}
                            >
                                <i className={`bi bi-chevron-${isExpanded ? 'down' : 'right'} text-xs font-black`} />
                            </button>
                        )}
                        {isChildVar && !visibilitySettings.description && (
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] select-none mr-0.5">↳</span>
                        )}
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg inline-block">
                            {normalizeVariationSku(product.sku || product.code) || "-"}
                        </span>
                    </div>
                </td>
            );

        case 'costPrice':
            if (product.isParent) return <td key="costPrice" className="px-3 py-3" />;
            return (
                <td key="costPrice" className="px-3 py-3 text-right">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                        {formatCurrency(product.costPrice || 0)}
                    </span>
                </td>
            );

        case 'unitPrice':
            if (product.isParent) return <td key="unitPrice" className="px-3 py-3" />;
            const unitP = Number(product.unitPrice) || 0;
            const promoP = Number(product.promoPrice) || 0;
            const hasPromo = promoP > 0 && promoP < unitP;
            const finalPrice = hasPromo ? promoP : (unitP || (
                product.variations?.length 
                    ? Math.min(...product.variations.map(v => {
                        const vp = Number(v.promoPrice) > 0 && Number(v.promoPrice) < Number(v.unitPrice) ? Number(v.promoPrice) : Number(v.unitPrice);
                        return vp || 0;
                    }).filter(p => p > 0).concat(0))
                    : 0
            ));
            return (
                <td key="unitPrice" className="px-3 py-3 text-right">
                    <div className="flex flex-col items-end">
                        {hasPromo && (
                            <span className="text-[10px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                                {formatCurrency(unitP)}
                            </span>
                        )}
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                            {finalPrice > 0 ? formatCurrency(finalPrice) : '-'}
                        </span>
                    </div>
                </td>
            );

        case 'weight':
            if (product.isParent) return <td key="weight" className="px-3 py-3" />;
            return (
                <td key="weight" className="px-3 py-3 text-right">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {product.weight ? `${Number(product.weight).toFixed(2)} kg` : '-'}
                    </span>
                </td>
            );

        case 'stock':
            if (product.isParent) return <td key="stock" className="px-3 py-3" />;
            const isLowStock = (product.stock || 0) <= (product.minStock || 0);
            return (
                <td key="stock" className="px-3 py-3 text-center">
                    <span className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {product.itemType === 'service' ? '-' : (product.stock ?? 0)}
                    </span>
                </td>
            );

        case 'category':
            if (isChildVar) return <td key="category" className="px-3 py-3" />;
            const categoryDisplay = getCategoryBreadcrumb(product.categoryIds || [], categoryTree) || product.category || (product as any).category_name || (product as any).categoryName || "-";
            const leafCategories = categoryDisplay.split(' | ').map(path => {
                const parts = path.split(' > ');
                return parts[parts.length - 1];
            }).join(' | ');
            return (
                <td key="category" className="px-3 py-3 text-left">
                    <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-[250px]">
                        {leafCategories.split(' | ').map((catName, idx) => (
                            <div key={idx} className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                <span className="text-slate-600 dark:text-slate-300">{catName}</span>
                                {idx < leafCategories.split(' | ').length - 1 && <span className="ml-2 text-blue-500 opacity-50">|</span>}
                            </div>
                        ))}
                    </div>
                </td>
            );

        case 'createdAt':
            return (
                <td key="createdAt" className="px-3 py-3 text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-955 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                        {product.createdAt ? new Date(product.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </span>
                </td>
            );

        case 'status':
            const targetCatalogId = (product.isEmbeddedVariation || (product.isVariation && product.sku && product.parentId))
                ? `${product.parentId || product.id}_${product.sku}`
                : product.id!;

            return (
                <td key="status" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                        <ChannelStatusBadges
                            active={product.active !== false}
                            catalogStatus={product.status}
                            isParent={product.isParent}
                            canManageCatalog={canManageCatalog}
                            isDraft={isDraft}
                            onToggleActive={(e) => {
                                e.stopPropagation();
                                onToggleActive(product.id!, product.active !== false);
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

        default:
            return null;
    }
}
