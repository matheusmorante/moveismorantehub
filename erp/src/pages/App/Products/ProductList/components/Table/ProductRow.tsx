import React from 'react';
import Product, { ProductVisibilitySettings } from '@/pages/types/product.type';
import { LabelPrintType } from '../../components/modals/LabelPrintSelectionModal';
import { useProductMetadata } from '../../hooks/useProductMetadata';
import { getVariationDisplayName } from '../../utils/getVariationDisplayName';
import { ProductRowDescriptionCell } from './ProductRowDescriptionCell';
import { ProductRowActionsCell } from './ProductRowActionsCell';
import { ProductRowModals } from '../../modals/ProductRowModals';
import { renderProductRowStandardCell } from './ProductRowStandardCells';

export interface ProductRowProps {
    readonly product: Product;
    readonly onEdit: (product: Product) => void;
    readonly onDelete: (id: string) => void;
    readonly onRestore: (id: string) => void;
    readonly onPermanentDelete?: (id: string) => void;
    readonly onToggleActive: (id: string, currentStatus: boolean) => void;
    readonly onDeactivateCatalog: (id: string) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly visibilitySettings: ProductVisibilitySettings;
    readonly showTrash?: boolean;
    readonly orderedColumnKeys?: readonly string[];
    readonly isSelected?: boolean;
    readonly onToggleSelection?: () => void;
    readonly categoryTree?: unknown;
    readonly onRefresh?: () => void;
    readonly onDuplicate?: (product: Product) => void;
    readonly exitedVariationIds?: ReadonlySet<string>;
    readonly hasVariations?: boolean;
    readonly isExpanded?: boolean;
    readonly onToggleExpand?: () => void;
    readonly variationsCount?: number;
    readonly onMoveToAnotherFamily?: (product: Product) => void;
    readonly onMergeWithAnotherVariation?: (product: Product) => void;
}

export const ProductRow: React.FC<ProductRowProps> = ({
    product,
    onEdit,
    onDelete,
    onRestore,
    onToggleActive,
    onDeactivateCatalog,
    onShowHistory,
    onLaunchStock,
    visibilitySettings,
    showTrash,
    orderedColumnKeys,
    categoryTree,
    onDuplicate,
    exitedVariationIds,
    hasVariations,
    isExpanded,
    onToggleExpand,
    variationsCount,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
    onRefresh,
}) => {
    const [labelModal, setLabelModal] = React.useState<{ open: boolean; type: LabelPrintType }>({
        open: false,
        type: 'identification'
    });
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({
        open: false,
        message: ''
    });

    const isDraft = Boolean(product.isDraft) || Boolean((product as { is_draft?: boolean }).is_draft);
    const canManageCatalog = !isDraft && product.active !== false;
    const isChildVar = Boolean(product.isVariation) || Boolean(product.parentId);
    const isDeactivated = product.active === false || product.status === 'hidden';

    const { oppName, supplierNames } = useProductMetadata(product);

    // Resolução segura de nome para exibição
    let displayName = product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : '-');
    if (isChildVar) {
        displayName = getVariationDisplayName(product, displayName);
    }

    const cellContext = {
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
    };

    const renderCell = (key: string) => {
        if (key === 'description') {
            if (!visibilitySettings.description) return null;
            return (
                <ProductRowDescriptionCell
                    key="description"
                    product={product}
                    displayName={displayName}
                    hasVariations={hasVariations}
                    isExpanded={isExpanded}
                    onToggleExpand={onToggleExpand}
                    isChildVar={isChildVar}
                    isChildVariation={isChildVar}
                    variationsCount={variationsCount}
                    oppName={oppName}
                    supplierNames={supplierNames}
                    exitedVariationIds={exitedVariationIds}
                />
            );
        }

        if (key === 'actions') {
            if (!visibilitySettings.actions) return null;
            return (
                <ProductRowActionsCell
                    key="actions"
                    product={product}
                    isChildVar={isChildVar}
                    showTrash={showTrash}
                    onEdit={onEdit}
                    onRestore={onRestore}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onShowHistory={onShowHistory}
                    onLaunchStock={onLaunchStock}
                    onOpenSalesModal={() => setIsSalesModalOpen(true)}
                    onOpenLabelModal={(type) => setLabelModal({ open: true, type })}
                    onMoveToAnotherFamily={onMoveToAnotherFamily}
                    onMergeWithAnotherVariation={onMergeWithAnotherVariation}
                    onRefresh={onRefresh}
                />
            );
        }

        return renderProductRowStandardCell(key, cellContext);
    };

    return (
        <tr
            onClick={() => {
                if (hasVariations && onToggleExpand) {
                    onToggleExpand();
                }
            }}
            className={`transition-colors group ${
                hasVariations ? 'cursor-pointer' : ''
            } ${
                isDeactivated
                    ? 'bg-slate-100/90 dark:bg-slate-800/70'
                    : product.isParent
                    ? 'bg-slate-200/70 dark:bg-slate-800/80 font-bold'
                    : isChildVar
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-white dark:bg-slate-900'
            } hover:bg-slate-300/60 dark:hover:bg-slate-700/60`}
        >
            {orderedColumnKeys ? (
                orderedColumnKeys.map(key => renderCell(key))
            ) : (
                <>
                    {renderCell('code')}
                    {renderCell('description')}
                    {renderCell('unitPrice')}
                    {renderCell('stock')}
                    {renderCell('status')}
                    {renderCell('actions')}
                </>
            )}

            <ProductRowModals
                product={product}
                labelModal={labelModal}
                onCloseLabelModal={() => setLabelModal(prev => ({ ...prev, open: false }))}
                isSalesModalOpen={isSalesModalOpen}
                onCloseSalesModal={() => setIsSalesModalOpen(false)}
                whatsAppModal={whatsAppModal}
                onCloseWhatsAppModal={() => setWhatsAppModal(prev => ({ ...prev, open: false }))}
            />
        </tr>
    );
};

export default ProductRow;
