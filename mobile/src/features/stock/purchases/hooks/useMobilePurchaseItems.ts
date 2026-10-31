import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { MobilePurchaseItem } from '../mobilePurchaseService';
import type { SearchableProduct } from '../../inventory/components/InventoryProductSearchModal';

export type Supplier = {
  id: string;
  name: string;
  full_name?: string;
  nickname?: string;
  social_name?: string;
  stock_origins?: string[] | null;
};

export const parseNumber = (value: string) =>
  Number(value.replace(',', '.').replace(/[^\d.-]/g, '')) || 0;

const calculateUnitCost = (
  baseCost: number,
  discountUnit: number,
  discountPercent: string,
  ipiPercent: string,
  freightPercent: string
) => {
  const safeDiscountPercent = Math.min(100, Math.max(0, parseNumber(discountPercent)));
  const discountedBaseCost = baseCost * (1 - safeDiscountPercent / 100);
  const itemIpi = discountedBaseCost * (parseNumber(ipiPercent) / 100);
  const itemFreight = baseCost * (parseNumber(freightPercent) / 100);
  return Math.max(0, Number((discountedBaseCost + itemIpi + itemFreight - discountUnit).toFixed(2)));
};

export interface UseMobilePurchaseItemsOptions {
  readonly discountPercent: string;
  readonly ipiPercent: string;
  readonly freightPercent: string;
  readonly supplierId: string;
  readonly suppliers: readonly Supplier[];
  readonly setSupplierId: (id: string) => void;
  readonly setSupplierName: (name: string) => void;
  readonly onItemsChange?: () => void;
}

/**
 * Sub-hook responsável pelo gerenciamento de itens, cálculo de custos (IPI/Frete)
 * e seleção de produtos no pedido de compra mobile.
 */
export function useMobilePurchaseItems({
  discountPercent,
  ipiPercent,
  freightPercent,
  supplierId,
  suppliers,
  setSupplierId,
  setSupplierName,
  onItemsChange,
}: UseMobilePurchaseItemsOptions) {
  const [items, setItems] = useState<MobilePurchaseItem[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerIndex, setProductPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    setItems((previous) =>
      previous.map((item) => {
        const unitCost = calculateUnitCost(
          Number(item.baseCost || 0),
          Number(item.discountUnit || 0),
          discountPercent,
          ipiPercent,
          freightPercent
        );
        return {
          ...item,
          unitCost,
          totalCost: Number((Number(item.quantity || 0) * unitCost).toFixed(2)),
        };
      })
    );
  }, [discountPercent, freightPercent, ipiPercent]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  }, [items]);

  const openProductPicker = useCallback((index?: number) => {
    setProductPickerIndex(index !== undefined ? index : null);
    setProductPickerOpen(true);
  }, []);

  const addProduct = useCallback((product: SearchableProduct) => {
    const supplierIds = [...new Set([
      ...(product.supplier_ids || []),
      product.main_supplier_id,
      product.supplier_id,
    ].filter(Boolean).map(String))];
    const productSupplierId = product.main_supplier_id || product.supplier_id;
    if (supplierId && !supplierIds.includes(supplierId) && productSupplierId !== supplierId) {
      const otherSupplier = suppliers.find((supplier) => supplier.id === productSupplierId);
      Alert.alert(
        'Produto de outro fornecedor',
        `Este produto pertence ao fornecedor "${otherSupplier?.name || product.assignedSupplier || 'outro fornecedor'}". Remova os itens para trocar o fornecedor.`
      );
      return;
    }
    const existing = items.findIndex(
      (item) => item.variationId === product.variation_id && item.productId === product.id
    );
    onItemsChange?.();
    if (!supplierId && productSupplierId) {
      const matchedSupplier = suppliers.find((supplier) => supplier.id === productSupplierId);
      setSupplierId(productSupplierId);
      setSupplierName(matchedSupplier?.name || product.assignedSupplier || '');
    }
    if (existing >= 0) {
      setItems((previous) =>
        previous.map((item, index) =>
          index === existing ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }
    setItems((previous) => [
      ...previous,
      {
        productId: product.id,
        variationId: product.variation_id,
        description: product.name || product.description || 'Produto',
        quantity: 1,
        baseCost: 0,
        discountUnit: 0,
        unitCost: 0,
        totalCost: 0,
        sku: product.sku || undefined,
      },
    ]);
  }, [supplierId, suppliers, items, onItemsChange, setSupplierId, setSupplierName]);

  const addItemRow = useCallback(() => {
    onItemsChange?.();
    const newIndex = items.length;
    setItems((previous) => [
      ...previous,
      {
        productId: '',
        variationId: undefined,
        description: '',
        quantity: 1,
        baseCost: 0,
        discountUnit: 0,
        unitCost: 0,
        totalCost: 0,
      },
    ]);
    setProductPickerIndex(newIndex);
    setProductPickerOpen(true);
  }, [items.length, onItemsChange]);

  const handleProductSelect = useCallback((product: SearchableProduct) => {
    const supplierIds = [...new Set([
      ...(product.supplier_ids || []),
      product.main_supplier_id,
      product.supplier_id,
    ].filter(Boolean).map(String))];
    const productSupplierId = product.main_supplier_id || product.supplier_id;
    if (supplierId && !supplierIds.includes(supplierId) && productSupplierId !== supplierId) {
      const otherSupplier = suppliers.find((supplier) => supplier.id === productSupplierId);
      Alert.alert(
        'Produto de outro fornecedor',
        `Este produto pertence ao fornecedor "${otherSupplier?.name || product.assignedSupplier || 'outro fornecedor'}". Remova os itens para trocar o fornecedor.`
      );
      return;
    }

    onItemsChange?.();
    if (!supplierId && productSupplierId) {
      const matchedSupplier = suppliers.find((supplier) => supplier.id === productSupplierId);
      setSupplierId(productSupplierId);
      setSupplierName(matchedSupplier?.name || product.assignedSupplier || '');
    }

    if (productPickerIndex !== null && items[productPickerIndex] !== undefined) {
      const currentItem = items[productPickerIndex];
      const baseCost = Number(currentItem.baseCost || 0);
      const unitCost = calculateUnitCost(
        baseCost,
        Number(currentItem.discountUnit || 0),
        discountPercent,
        ipiPercent,
        freightPercent
      );
      const quantity = currentItem.quantity || 1;
      setItems((previous) =>
        previous.map((item, index) => {
          if (index !== productPickerIndex) return item;
          return {
            ...item,
            productId: product.id,
            variationId: product.variation_id,
            description: product.name || product.description || 'Produto',
            sku: product.sku || undefined,
            baseCost,
            unitCost,
            totalCost: Number((quantity * unitCost).toFixed(2)),
          };
        })
      );
    } else {
      addProduct(product);
    }
    setProductPickerIndex(null);
    setProductPickerOpen(false);
  }, [
    supplierId,
    suppliers,
    onItemsChange,
    setSupplierId,
    setSupplierName,
    productPickerIndex,
    items,
    discountPercent,
    ipiPercent,
    freightPercent,
    addProduct,
  ]);

  const updateItem = useCallback((index: number, patch: Partial<MobilePurchaseItem>) => {
    onItemsChange?.();
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, ...patch };
        next.discountUnit = Math.max(0, Number(next.discountUnit || 0));
        next.unitCost = calculateUnitCost(
          Number(next.baseCost || 0),
          next.discountUnit,
          discountPercent,
          ipiPercent,
          freightPercent
        );
        next.totalCost = Number((Number(next.quantity || 0) * next.unitCost).toFixed(2));
        return next;
      })
    );
  }, [onItemsChange, discountPercent, ipiPercent, freightPercent]);

  const removeItem = useCallback((index: number) => {
    onItemsChange?.();
    setItems((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  }, [onItemsChange]);

  return {
    items,
    setItems,
    productPickerOpen,
    setProductPickerOpen,
    productPickerIndex,
    setProductPickerIndex,
    total,
    openProductPicker,
    addItemRow,
    addProduct,
    handleProductSelect,
    updateItem,
    removeItem,
  };
}
