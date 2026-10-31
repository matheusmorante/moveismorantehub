import { useState, useCallback } from 'react';
import { PurchaseItem } from '../../../../types/purchase.type';
import Product from '../../../../types/product.type';
import Person from '../../../../types/person.type';
import { toast } from 'react-toastify';
import { calculatePurchaseCosts } from '../utils/purchaseCalculationUtils';

interface ProductSupplierLookupLike extends Partial<Product> {
  readonly supplier_ids?: readonly string[];
  readonly main_supplier_id?: string;
  readonly supplier_id?: string;
}

export interface UsePurchaseItemsManagerProps {
  readonly selectedSupplierId: string;
  readonly setSelectedSupplierId: (id: string) => void;
  readonly suppliers: readonly Person[];
  readonly products: readonly Product[];
  readonly discountPercent: number;
  readonly ipiPercent: number;
  readonly freightPercent: number;
  readonly onItemsChange?: () => void;
}

/**
 * Sub-hook responsável pelo gerenciamento de itens, validações de fornecedor
 * por produto e cálculo dos custos com IPI e Frete no ERP.
 */
export function usePurchaseItemsManager({
  selectedSupplierId,
  setSelectedSupplierId,
  suppliers,
  products,
  discountPercent,
  ipiPercent,
  freightPercent,
  onItemsChange,
}: UsePurchaseItemsManagerProps) {
  const [items, setItems] = useState<readonly PurchaseItem[]>([]);
  const [validationErrors, setValidationErrors] = useState({ supplier: false, items: false });

  const handleAddItem = useCallback((newItem: PurchaseItem) => {
    if (!newItem.productId) {
      onItemsChange?.();
      setItems((currentItems) => [...currentItems, newItem]);
      setValidationErrors((current) => ({ ...current, items: false }));
      return true;
    }

    const product = products.find((p) => p.id === newItem.productId) as
      | ProductSupplierLookupLike
      | undefined;
    const supplierIds = product?.supplierIds || product?.supplier_ids || [];
    const prodSupplierId =
      product?.mainSupplierId ||
      product?.supplierId ||
      product?.main_supplier_id ||
      product?.supplier_id;

    const productUsesSelectedSupplier =
      !selectedSupplierId ||
      !product ||
      supplierIds.includes(selectedSupplierId) ||
      prodSupplierId === selectedSupplierId;

    if (!selectedSupplierId && prodSupplierId) {
      setSelectedSupplierId(prodSupplierId);
    } else if (selectedSupplierId && !productUsesSelectedSupplier) {
      const prodSupplier = suppliers.find((s) => s.id === prodSupplierId);
      toast.error(
        `Este produto pertence ao fornecedor "${prodSupplier?.fullName || 'outro fornecedor'}". Remova os itens para trocar de fornecedor.`
      );
      return false;
    }

    onItemsChange?.();
    setItems((currentItems) => [...currentItems, newItem]);
    setValidationErrors((current) => ({ ...current, items: false }));
    return true;
  }, [
    products,
    selectedSupplierId,
    setSelectedSupplierId,
    suppliers,
    onItemsChange,
  ]);

  const handleRemoveItem = useCallback((idx: number) => {
    onItemsChange?.();
    setItems((current) => current.filter((_, i) => i !== idx));
  }, [onItemsChange]);

  const handleUpdateItem = useCallback((idx: number, updatedItem: PurchaseItem) => {
    onItemsChange?.();
    setItems((currentItems) => currentItems.map((item, i) => (i === idx ? updatedItem : item)));
  }, [onItemsChange]);

  const { processedItems, totalValue } = calculatePurchaseCosts(
    items,
    discountPercent,
    ipiPercent,
    freightPercent
  );

  return {
    items,
    setItems,
    validationErrors,
    setValidationErrors,
    handleAddItem,
    handleRemoveItem,
    handleUpdateItem,
    processedItems,
    totalValue,
  };
}
