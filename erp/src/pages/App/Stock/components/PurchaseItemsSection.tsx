import React from 'react';
import type { PurchaseItem } from '../../../types/purchase.type';
import type Product from '../../../types/product.type';
import type { Variation } from '../../../types/product.type';
import { toast } from 'react-toastify';
import { PurchaseItemsEntrySection } from './purchase-items/PurchaseItemsEntrySection';
import type { PurchaseItemsViewProps } from './purchase-items/PurchaseItemsViewProps';
import { PurchaseItemsMobileList } from './purchase-items/PurchaseItemsMobileList';
import { PurchaseItemsTable } from './purchase-items/PurchaseItemsTable';
import { PurchaseOrderItemsView } from './purchase-items/PurchaseOrderItemsView';
import { calculatePurchaseCosts } from '../Purchases/utils/purchaseCalculationUtils';
import { matchesSearchText } from '@/pages/utils/textUtils';

interface Props {
  items: PurchaseItem[];
  onAddItem: (item: PurchaseItem) => boolean | void;
  onRemoveItem: (idx: number) => void;
  onUpdateItem?: (idx: number, item: PurchaseItem) => void;
  discountPercent?: number;
  ipiPercent: number;
  freightPercent: number;
  formatCurrency: (value: number) => string;
  supplierId?: string;
  onSupplierAutoSelect?: (supplierId: string) => void;
  hasError?: boolean;
  isReceiptMode?: boolean;
  activeItemIndex?: number | null;
  onActiveItemChange?: (index: number | null) => void;
  canRemoveItems?: boolean;
}

export const PurchaseItemsSection = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  discountPercent = 0,
  ipiPercent,
  freightPercent,
  formatCurrency,
  supplierId,
  onSupplierAutoSelect,
  hasError = false,
  isReceiptMode = true,
  activeItemIndex = null,
  onActiveItemChange,
  canRemoveItems = true,
}: Props) => {
  // Adiciona linha de item vazia para selecionar o produto e preencher quantidade e custo diretamente nela
  const handleAddNewItemRow = () => {
    if (!supplierId) {
      toast.warn('Selecione o fornecedor acima primeiro.');
      return;
    }

    onAddItem({
      productId: '',
      description: '',
      quantity: 1,
      baseCost: 0,
      unitCost: 0,
      totalCost: 0,
    });
  };

  const handleSelectProductInRow = (idx: number, product: Product, variation?: Variation) => {
    const prodName = product.name || product.title || product.description || '';
    const description = variation
      ? variation.name && matchesSearchText(variation.name, prodName)
        ? variation.name
        : `${prodName} - ${variation.name}`
      : prodName;
    const cost = variation?.costPrice || product.costPrice || 0;
    const tempIpi = cost * (ipiPercent / 100);
    const tempFreight = cost * (freightPercent / 100);
    const currentItem = items[idx];
    const quantity = currentItem?.quantity || 1;
    const unitCost = Math.max(
      0,
      Number((cost + tempIpi + tempFreight - (isReceiptMode ? 0 : Number(currentItem?.discountUnit || 0))).toFixed(2))
    );

    if (onUpdateItem) {
      onUpdateItem(idx, {
        ...currentItem,
        productId: product.id!,
        variationId: variation?.id,
        description,
        baseCost: cost,
        unitCost,
        totalCost: Number((quantity * unitCost).toFixed(2)),
      });
    }

    const prodSupplierId =
      product.mainSupplierId ||
      product.supplierId ||
      (product as any).main_supplier_id ||
      (product as any).supplier_id;
    if (!supplierId && prodSupplierId && onSupplierAutoSelect) {
      onSupplierAutoSelect(prodSupplierId);
    }
  };

  const handleEditProductInRow = (idx: number) => {
    if (onUpdateItem) {
      onUpdateItem(idx, {
        ...items[idx],
        productId: '',
      });
    }
  };

  const handleQtyChange = (idx: number, newQty: number) => {
    const item = items[idx];
    const validQty = Math.max(1, newQty);
    const baseCost = item.baseCost ?? item.unitCost ?? 0;
    const tempIpi = baseCost * (ipiPercent / 100);
    const tempFreight = baseCost * (freightPercent / 100);
    const unitCost = Math.max(
      0,
      Number((baseCost + tempIpi + tempFreight - (isReceiptMode ? 0 : Number(item.discountUnit || 0))).toFixed(2))
    );
    const updated: PurchaseItem = {
      ...item,
      quantity: validQty,
      unitCost,
      totalCost: Number((validQty * unitCost).toFixed(2)),
    };

    if (onUpdateItem) {
      onUpdateItem(idx, updated);
    }
  };

  const handleCostChange = (idx: number, newCost: number) => {
    const item = items[idx];
    const validCost = Math.max(0, newCost);
    const tempIpi = validCost * (ipiPercent / 100);
    const tempFreight = validCost * (freightPercent / 100);
    const unitCost = Math.max(
      0,
      Number((validCost + tempIpi + tempFreight - (isReceiptMode ? 0 : Number(item.discountUnit || 0))).toFixed(2))
    );
    const updated: PurchaseItem = {
      ...item,
      baseCost: validCost,
      unitCost,
      totalCost: Number((item.quantity * unitCost).toFixed(2)),
    };

    if (onUpdateItem) {
      onUpdateItem(idx, updated);
    }
  };

  const handleDiscountChange = (idx: number, newDiscount: number) => {
    const item = items[idx];
    if (!item || !onUpdateItem) return;
    const discountUnit = Math.max(0, newDiscount);
    const baseCost = item.baseCost ?? item.unitCost ?? 0;
    const unitCost = Math.max(
      0,
      Number((baseCost * (1 + ipiPercent / 100 + freightPercent / 100) - discountUnit).toFixed(2))
    );
    onUpdateItem(idx, {
      ...item,
      discountUnit,
      unitCost,
      totalCost: Number((item.quantity * unitCost).toFixed(2)),
    });
  };

  const totalValue = isReceiptMode
    ? items.reduce((sum, item) => sum + item.totalCost, 0)
    : calculatePurchaseCosts(items, discountPercent, ipiPercent, freightPercent).totalValue;

  const itemsViewProps: PurchaseItemsViewProps = {
    items,
    isReceiptMode,
    supplierId,
    discountPercent,
    ipiPercent,
    freightPercent,
    formatCurrency,
    onRemoveItem,
    onUpdateItem,
    onAddNewItemRow: handleAddNewItemRow,
    handleSelectProductInRow,
    handleEditProductInRow,
    handleQtyChange,
    handleCostChange,
    handleDiscountChange,
    canRemoveItems,
  };

  if (!isReceiptMode) {
    return <PurchaseOrderItemsView {...itemsViewProps} activeItemIndex={activeItemIndex}
      onActiveItemChange={onActiveItemChange} hasError={hasError} totalValue={totalValue} />;
  }

  return (
    <div className="space-y-4">
      <PurchaseItemsEntrySection
        isReceiptMode={isReceiptMode}
        hasError={hasError}
        supplierId={supplierId}
        onAddNewItemRow={handleAddNewItemRow}
      />
      <PurchaseItemsTable {...itemsViewProps} totalValue={totalValue} />
      <PurchaseItemsMobileList {...itemsViewProps} />
    </div>
  );
};
