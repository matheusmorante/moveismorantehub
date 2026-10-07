import React, { useState } from 'react';
import type { PurchaseItem } from '../../../types/purchase.type';
import type Product from '../../../types/product.type';
import type { Variation } from '../../../types/product.type';
import { toast } from 'react-toastify';
import { PurchaseItemsEntrySection } from './purchase-items/PurchaseItemsEntrySection';
import type { PurchaseItemsViewProps } from './purchase-items/PurchaseItemsViewProps';
import { PurchaseItemsMobileList } from './purchase-items/PurchaseItemsMobileList';
import { PurchaseItemsTable } from './purchase-items/PurchaseItemsTable';

interface Props {
  items: PurchaseItem[];
  onAddItem: (item: PurchaseItem) => boolean | void;
  onRemoveItem: (idx: number) => void;
  onUpdateItem?: (idx: number, item: PurchaseItem) => void;
  ipiPercent: number;
  freightPercent: number;
  formatCurrency: (value: number) => string;
  supplierId?: string;
  onSupplierAutoSelect?: (supplierId: string) => void;
  hasError?: boolean;
  isReceiptMode?: boolean;
}

export const PurchaseItemsSection = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  ipiPercent,
  freightPercent,
  formatCurrency,
  supplierId,
  onSupplierAutoSelect,
  hasError = false,
  isReceiptMode = true,
}: Props) => {
  // Current item being added (utilizado no modo Compras tradicional)
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentVariationId, setCurrentVariationId] = useState<string | undefined>(undefined);
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentCost, setCurrentCost] = useState(0);

  const tempIpiVal = currentCost * (ipiPercent / 100);
  const tempFreightVal = currentCost * (freightPercent / 100);
  const tempTotalUnit = currentCost + tempIpiVal + tempFreightVal;

  const handleSelectCurrentProduct = (product: Product, variation?: Variation) => {
    setCurrentProductId(product.id!);
    setCurrentVariationId(variation?.id);
    const prodName = product.name || product.title || product.description;
    setCurrentDescription(
      variation
        ? variation.name && variation.name.toLowerCase().includes(prodName.toLowerCase())
          ? variation.name
          : `${prodName} - ${variation.name}`
        : prodName
    );
    if (variation?.costPrice) setCurrentCost(variation.costPrice);
    else if (product.costPrice) setCurrentCost(product.costPrice);
    else setCurrentCost(0);

    const prodSupplierId =
      product.mainSupplierId ||
      product.supplierId ||
      (product as any).main_supplier_id ||
      (product as any).supplier_id;
    if (!supplierId && prodSupplierId && onSupplierAutoSelect) {
      onSupplierAutoSelect(prodSupplierId);
    }
  };

  const handleAddItemClick = () => {
    if (!currentProductId) {
      toast.error('Selecione um produto antes de adicionar.');
      return;
    }

    const qtyToAdd = isReceiptMode ? 1 : Math.max(1, currentQty);

    const added = onAddItem({
      productId: currentProductId,
      variationId: currentVariationId,
      description: currentDescription,
      quantity: qtyToAdd,
      baseCost: currentCost,
      unitCost: tempTotalUnit,
      totalCost: qtyToAdd * tempTotalUnit,
    });

    if (added === false) return;

    toast.success('Item adicionado.');
    setCurrentProductId('');
    setCurrentVariationId(undefined);
    setCurrentDescription('');
    setCurrentQty(1);
    setCurrentCost(0);
  };

  // No modo de recebimento: adiciona linha vazia para digitar o produto diretamente nela
  const handleAddNewItemRow = () => {
    if (isReceiptMode && !supplierId) {
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
      ? variation.name && variation.name.toLowerCase().includes(prodName.toLowerCase())
        ? variation.name
        : `${prodName} - ${variation.name}`
      : prodName;
    const cost = variation?.costPrice || product.costPrice || 0;
    const tempIpi = cost * (ipiPercent / 100);
    const tempFreight = cost * (freightPercent / 100);
    const unitCost = cost + tempIpi + tempFreight;
    const currentItem = items[idx];
    const quantity = currentItem?.quantity || 1;

    if (onUpdateItem) {
      onUpdateItem(idx, {
        ...currentItem,
        productId: product.id!,
        variationId: variation?.id,
        description,
        baseCost: cost,
        unitCost,
        totalCost: quantity * unitCost,
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
    const unitCost = Number((baseCost + tempIpi + tempFreight).toFixed(2));
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
    const unitCost = Number((validCost + tempIpi + tempFreight).toFixed(2));
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

  const totalValue = items.reduce((sum, item) => sum + item.totalCost, 0);

  const itemsViewProps: PurchaseItemsViewProps = {
    items,
    isReceiptMode,
    supplierId,
    freightPercent,
    formatCurrency,
    onRemoveItem,
    onUpdateItem,
    onAddNewItemRow: handleAddNewItemRow,
    handleSelectProductInRow,
    handleEditProductInRow,
    handleQtyChange,
    handleCostChange,
  };

  return (
    <div className="space-y-4">
      <PurchaseItemsEntrySection
        itemCount={items.length}
        isReceiptMode={isReceiptMode}
        hasError={hasError}
        supplierId={supplierId}
        currentDescription={currentDescription}
        currentQty={currentQty}
        currentCost={currentCost}
        onDescriptionChange={setCurrentDescription}
        onSelectProduct={handleSelectCurrentProduct}
        onQuantityChange={setCurrentQty}
        onCostChange={setCurrentCost}
        onAddItemClick={handleAddItemClick}
        onAddNewItemRow={handleAddNewItemRow}
      />
      <PurchaseItemsTable {...itemsViewProps} totalValue={totalValue} />
      <PurchaseItemsMobileList {...itemsViewProps} />
    </div>
  );
};
