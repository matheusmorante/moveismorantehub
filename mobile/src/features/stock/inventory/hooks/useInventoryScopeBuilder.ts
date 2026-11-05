import { useState, useMemo } from 'react';
import { isTestProduct } from '../../../../../../shared-utils/isTestProduct';
import { createInventoryScopeItemSnapshot } from '../services/inventoryScopeItemSnapshot';

export interface ScopeProduct {
  id: string;
  variation_id?: string;
  name: string;
  parent_name?: string;
  description?: string;
  stock: number;
  unit?: string;
  sku?: string;
  code?: string;
  barcode?: string;
  active?: boolean;
  main_supplier_id?: string;
  supplier_id?: string;
  supplier_ids?: string[];
}

export interface ScopeSupplier {
  id: string;
  full_name: string;
}

export interface ScopeEmployee {
  id: string;
  type?: string;
  full_name: string;
  social_name?: string;
  nickname?: string;
  role?: string;
  position?: string;
}

export type InventoryScopeType = 'full' | 'general' | 'supplier' | 'product' | 'custom';

export interface ScopeConfiguration {
  type: InventoryScopeType;
  name: string;
  hasStages?: boolean;
  productId?: string;
  supplierId?: string;
  responsibleId: string;
  responsibleName: string;
  itemsSnapshot: Array<{
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    assignedSupplier: string;
    systemStock: number;
    unit: string;
    sku?: string;
    code?: string;
    barcode?: string;
    isActive?: boolean;
  }>;
}

export const useInventoryScopeBuilder = (
  allProducts: readonly ScopeProduct[],
  suppliers: readonly ScopeSupplier[]
) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [scopeType, setScopeType] = useState<InventoryScopeType | null>(null);

  // Configs
  const [inventoryName, setInventoryName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState('');
  const [responsibleError, setResponsibleError] = useState(false);
  const [customProducts, setCustomProducts] = useState<Array<{ product: ScopeProduct }>>([]);

  const matchingItems = useMemo(() => {
    const items: ScopeConfiguration['itemsSnapshot'] = [];

    const addProduct = (product: ScopeProduct) => {
      if (
        isTestProduct({ ...product, title: product.parent_name }) ||
        isTestProduct({ id: product.variation_id, name: product.name, sku: product.sku })
      ) return;
      items.push(createInventoryScopeItemSnapshot(product, suppliers));
    };

    if (scopeType === 'full' || scopeType === 'general') {
      for (const product of allProducts) addProduct(product);
    } else if (scopeType === 'supplier') {
      const supplierProducts = selectedSupplierId
        ? allProducts.filter((p) =>
            [p.main_supplier_id, p.supplier_id, ...(p.supplier_ids || [])].some(
              (id) => String(id) === String(selectedSupplierId)
            )
          )
        : allProducts;
      for (const product of supplierProducts) addProduct(product);
    } else if (scopeType === 'custom') {
      for (const { product } of customProducts) addProduct(product);
    }

    return items;
  }, [scopeType, allProducts, selectedSupplierId, customProducts, suppliers]);

  const handleNextStep = (type: InventoryScopeType) => {
    setScopeType(type);
    setStep(2);

    const dateStr = new Date().toLocaleDateString('pt-BR');
    if (type === 'full') setInventoryName(`Inventário Livre: Etapas por Fornecedor - ${dateStr}`);
    else if (type === 'general') setInventoryName(`Inventário Geral - ${dateStr}`);
    else if (type === 'supplier') setInventoryName(`Fornecedor específico - ${dateStr}`);
    else setInventoryName(`Inventário Personalizado`);
  };

  return {
    step,
    scopeType,
    inventoryName,
    setInventoryName,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedResponsibleId,
    setSelectedResponsibleId,
    responsibleError,
    setResponsibleError,
    customProducts,
    setCustomProducts,
    matchingItems,
    handleNextStep,
    setStep,
  };
};
