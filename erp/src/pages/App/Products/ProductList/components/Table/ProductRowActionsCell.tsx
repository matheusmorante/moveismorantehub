import React from 'react';
import Product from '@/pages/types/product.type';
import { useAuth } from '@/context/AuthContext';
import { isProductIdentificationLabelOnlyProfile } from '@/pages/utils/accessRoles';
import { LabelPrintType } from '../../../components/modals/product/LabelPrintSelectionModal';
import { ChildVariationActions } from './ProductRowActions/ChildVariationActions';
import { ParentProductActions } from './ProductRowActions/ParentProductActions';

export interface ActionProductLike extends Product {
  readonly is_draft?: boolean;
  readonly variationId?: string;
  readonly mergedToVariationId?: string;
  readonly displayName?: string;
  readonly attributes?: readonly {
    readonly name?: string;
    readonly value?: string;
    readonly showName?: boolean;
  }[];
}

export interface ProductRowActionsCellProps {
  readonly product: ActionProductLike;
  readonly singleVariation?: ActionProductLike;
  readonly readOnly?: boolean;
  readonly canDeleteProducts: boolean;
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
  singleVariation,
  readOnly = false,
  canDeleteProducts,
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
  const { profile } = useAuth();
  const isLabelOnlyProfile = isProductIdentificationLabelOnlyProfile(profile);
  const isDraft =
    Boolean(product.isDraft) || Boolean((product as any).is_draft) || product.status === 'draft';

  return (
    <td key="actions" className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
      {readOnly && !isLabelOnlyProfile ? (
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          aria-label={`Ver detalhes de ${product.name || product.title || 'produto'}`}
        >
          <i className="bi bi-eye" />
          Detalhes
        </button>
      ) : isChildVar ? (
        <ChildVariationActions
          product={product}
          onMoveToAnotherFamily={onMoveToAnotherFamily}
          onMergeWithAnotherVariation={onMergeWithAnotherVariation}
          onRefresh={onRefresh}
        />
      ) : singleVariation && !showTrash ? (
        <div className="flex items-center justify-center gap-2">
          <ParentProductActions
            product={product}
            showTrash={showTrash && !isLabelOnlyProfile}
            canDeleteProducts={canDeleteProducts}
            showEditButton={!readOnly}
            isDraft={isDraft}
            onEdit={onEdit}
            onRestore={onRestore}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onLaunchStock={onLaunchStock}
            onOpenSalesModal={onOpenSalesModal}
            onOpenLabelModal={onOpenLabelModal}
          />
          <ChildVariationActions
            product={singleVariation}
            onMoveToAnotherFamily={onMoveToAnotherFamily}
            onMergeWithAnotherVariation={onMergeWithAnotherVariation}
            onRefresh={onRefresh}
          />
        </div>
      ) : (
        <ParentProductActions
          product={product}
          showTrash={showTrash && !isLabelOnlyProfile}
          canDeleteProducts={canDeleteProducts}
          showEditButton={!readOnly}
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
