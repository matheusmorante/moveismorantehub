import React, { useState } from 'react';
import Product from '@/pages/types/product.type';
import { useDeleteVariation } from '../hooks/useDeleteVariation';
import { ProductCardVariationItem } from './ProductCardVariationItem';

export interface CardVariationItem {
    id?: string;
    variationId?: string;
    mergedToVariationId?: string;
    sku?: string | null;
    name?: string;
    displayName?: string;
    unitPrice?: number;
    promoPrice?: number;
    stock?: number;
    active?: boolean;
    status?: Product['status'];
    images?: string[];
    attributes?: unknown[];
}

export interface ProductCardVariationListProps {
    readonly product: Product;
    readonly variations: readonly CardVariationItem[];
    readonly showVariations: boolean;
    readonly canManageCatalog: boolean;
    readonly isDraft: boolean;
    readonly exitedVariationIds?: ReadonlySet<string>;
    readonly onEdit: (product: Product) => void;
    readonly onToggleActive: (id: string, currentStatus: boolean) => void;
    readonly onDeactivateCatalog: (id: string) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onMoveToAnotherFamily?: (variation: CardVariationItem) => void;
    readonly onMergeWithAnotherVariation?: (variation: CardVariationItem) => void;
    readonly onRefresh?: () => void;
}

/**
 * Lista expansível de variações filhas exibida no rodapé do Card de Produto.
 */
export const ProductCardVariationList: React.FC<ProductCardVariationListProps> = ({
    product,
    variations,
    showVariations,
    canManageCatalog,
    isDraft,
    exitedVariationIds,
    onEdit,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onLaunchStock,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
    onRefresh,
}) => {
    const [activeVarMenuId, setActiveVarMenuId] = useState<string | null>(null);
    const { checkingUsageId, usageCache, handleCheckAndAskDelete } = useDeleteVariation(product.id || '', onRefresh);

    if (!showVariations || !variations || variations.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 -mx-2.5 -mb-2.5 sm:-mx-3.5 sm:-mb-3.5 px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl flex flex-col gap-1">
            {variations.map((v, index) => (
                <ProductCardVariationItem
                    key={v.id || index}
                    product={product}
                    variation={v}
                    index={index}
                    canManageCatalog={canManageCatalog}
                    isDraft={isDraft}
                    exitedVariationIds={exitedVariationIds}
                    activeVarMenuId={activeVarMenuId}
                    checkingUsageId={checkingUsageId}
                    usageCache={usageCache}
                    onSetActiveVarMenuId={setActiveVarMenuId}
                    onEdit={onEdit}
                    onToggleActive={onToggleActive}
                    onDeactivateCatalog={onDeactivateCatalog}
                    onShowHistory={onShowHistory}
                    onLaunchStock={onLaunchStock}
                    onMoveToAnotherFamily={onMoveToAnotherFamily}
                    onMergeWithAnotherVariation={onMergeWithAnotherVariation}
                    onCheckAndAskDelete={handleCheckAndAskDelete}
                />
            ))}
        </div>
    );
};

export default ProductCardVariationList;
