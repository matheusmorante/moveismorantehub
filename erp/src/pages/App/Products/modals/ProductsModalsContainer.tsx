import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import ProductFormModal from './ProductFormModal';
import VariationFormModal from './VariationFormModal';
import PriceHistoryModal from './PriceHistoryModal';
import StockLaunchModal from '../../Stock/modals/StockLaunchModal';
import ProductDetailsModal from './ProductDetailsModal';
import { StockLaunchTarget } from '../hooks/useProductsModals';

export interface ProductsModalsContainerProps {
  canManageProducts: boolean;
  // Product Form Modal
  isFormModalOpen: boolean;
  editingProduct: Product | null;
  initialFormData: Partial<Product> | null;
  onCloseFormModal: () => void;
  onFormSuccess: () => void;
  // Price History Modal
  isHistoryModalOpen: boolean;
  historyProduct: Product | null;
  onCloseHistoryModal: () => void;
  // Variation Form Modal
  isVariationModalOpen: boolean;
  editingVariation: Variation | null;
  variationParentProduct: Product | null;
  onCloseVariationModal: () => void;
  // Stock Launch Modal
  isStockModalOpen: boolean;
  stockLaunchTarget: StockLaunchTarget | null;
  onCloseStockModal: () => void;
  // Product Details Modal (view only)
  viewingProduct: Product | null;
  onCloseViewingProduct: () => void;
}

export const ProductsModalsContainer: React.FC<ProductsModalsContainerProps> = ({
  canManageProducts,
  isFormModalOpen,
  editingProduct,
  initialFormData,
  onCloseFormModal,
  onFormSuccess,
  isHistoryModalOpen,
  historyProduct,
  onCloseHistoryModal,
  isVariationModalOpen,
  editingVariation,
  variationParentProduct,
  onCloseVariationModal,
  isStockModalOpen,
  stockLaunchTarget,
  onCloseStockModal,
  viewingProduct,
  onCloseViewingProduct,
}) => {
  return (
    <>
      {/* Product Form Modal */}
      {canManageProducts && (
        <ProductFormModal
          isOpen={isFormModalOpen}
          onClose={onCloseFormModal}
          onSuccess={onFormSuccess}
          onDraftSaved={onFormSuccess}
          product={editingProduct}
          initialData={initialFormData}
        />
      )}

      {/* Price History Modal */}
      {canManageProducts && (
        <PriceHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={onCloseHistoryModal}
          product={historyProduct}
        />
      )}

      {/* Variation Form Modal */}
      {canManageProducts && isVariationModalOpen && variationParentProduct && (
        <VariationFormModal
          isOpen={isVariationModalOpen}
          onClose={onCloseVariationModal}
          parentId={variationParentProduct.parentId || variationParentProduct.id || ''}
          parentProduct={variationParentProduct}
          variation={editingVariation}
        />
      )}

      {/* Stock Launch Modal */}
      {canManageProducts && isStockModalOpen && (
        <StockLaunchModal
          isOpen={isStockModalOpen}
          onClose={onCloseStockModal}
          targetProduct={stockLaunchTarget?.product || null}
          targetVariation={stockLaunchTarget?.variation}
        />
      )}

      {/* View Details Modal */}
      {viewingProduct && (
        <ProductDetailsModal
          product={viewingProduct}
          onClose={onCloseViewingProduct}
        />
      )}
    </>
  );
};

export default ProductsModalsContainer;
