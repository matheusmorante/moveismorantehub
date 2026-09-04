import React from 'react';
import Product, { ProductVisibilitySettings } from '../../../types/product.type';
import { LabelPrintType } from '../components/LabelPrintSelectionModal';
import { useProductMetadata } from './useProductMetadata';
import { getVariationDisplayName } from './getVariationDisplayName';
import { ProductRowDescriptionCell } from './ProductRowDescriptionCell';
import { ProductRowActionsCell } from './ProductRowActionsCell';
import { ProductRowModals } from './ProductRowModals';
import { renderProductRowStandardCell } from './ProductRowStandardCells';

interface ProductRowProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    visibilitySettings: ProductVisibilitySettings;
    showTrash?: boolean;
    orderedColumnKeys?: string[];
    isSelected?: boolean;
    onToggleSelection?: () => void;
    categoryTree?: any;
    onRefresh?: () => void;
    onDuplicate?: (product: Product) => void;
    exitedVariationIds?: Set<string>;
    hasVariations?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    variationsCount?: number;
}

const ProductRow: React.FC<ProductRowProps> = ({
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
}) => {
    const [labelModal, setLabelModal] = React.useState<{ open: boolean; type: LabelPrintType }>({ open: false, type: 'identification' });
    const [isSalesModalOpen, setIsSalesModalOpen] = React.useState(false);
    const [whatsAppModal, setWhatsAppModal] = React.useState<{ open: boolean; message: string }>({ open: false, message: '' });

    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';
    const canManageCatalog = !isDraft && product.active !== false;
    const isChildVar = product.isVariation || !!product.parentId;
    const isDeactivated = product.active === false || product.status === 'hidden';

    const { oppName, supplierNames } = useProductMetadata(product);

    // Resolução de nome para exibição
    let displayName = product.name || product.title || (product.description ? product.description.split('\n')[0].substring(0, 120) : "-");
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
            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
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
