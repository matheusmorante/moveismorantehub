import React from 'react';
import Product from '@/pages/types/product.type';
import { LabelPrintType } from '../../components/modals/LabelPrintSelectionModal';
import { ChildVariationActions } from './ProductRowActions/ChildVariationActions';
import { ParentProductActions } from './ProductRowActions/ParentProductActions';

export interface ActionProductLike extends Product {
    readonly is_draft?: boolean;
    readonly variationId?: string;
    readonly mergedToVariationId?: string;
}

export interface ProductRowActionsCellProps {
    readonly product: ActionProductLike;
    readonly isChildVar: boolean;
    readonly showTrash?: boolean;
    readonly onEdit: (product: Product) => void;
    readonly onRestore: (id: string) => void;
    readonly onDelete: (id: string) => void;
    readonly onDuplicate?: (product: Product) => void;
    readonly onShowHistory?: (product: Product) => void;
    readonly onLaunchStock?: (product: Product) => void;
    readonly onOpenSalesModal: () => void;
    readonly onOpenLabelModal: (type: LabelPrintType) => void;
    readonly onMoveToAnotherFamily?: (product: Product) => void;
    readonly onMergeWithAnotherVariation?: (product: Product) => void;
    readonly onRefresh?: () => void;
}

/**
 * Célula de ações da tabela de produtos (menu flutuante com impressão, movimentação e edição).
 */
export const ProductRowActionsCell: React.FC<ProductRowActionsCellProps> = ({
    product,
    isChildVar,
    showTrash,
    onEdit,
    onRestore,
    onDelete,
    onDuplicate,
    onLaunchStock,
    onOpenSalesModal,
    onOpenLabelModal,
    onMoveToAnotherFamily,
    onMergeWithAnotherVariation,
    onRefresh,
}) => {
    const isDraft = Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

    return (
        <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
            {isChildVar ? (
                <ChildVariationActions
                    product={product}
                    onMoveToAnotherFamily={onMoveToAnotherFamily}
                    onMergeWithAnotherVariation={onMergeWithAnotherVariation}
                    onRefresh={onRefresh}
                />
            ) : (
                <ParentProductActions
                    product={product}
                    showTrash={showTrash}
                    isDraft={isDraft}
                    onEdit={onEdit}
                    onRestore={onRestore}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onLaunchStock={onLaunchStock}
                    onOpenSalesModal={onOpenSalesModal}
                    onOpenLabelModal={onOpenLabelModal}
                />
            )}
        </td>
    );
};

export default ProductRowActionsCell;
