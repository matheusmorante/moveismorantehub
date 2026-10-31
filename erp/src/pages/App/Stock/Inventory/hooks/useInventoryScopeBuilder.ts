import { useState, useMemo, useCallback } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import { getVariationDisplayName } from '@/components/productAutocompleteUtils';
import type {
  InventoryScopeType,
  ScopeConfiguration,
} from '../types/inventoryScope.types';
import {
  getInventorySupplierIds,
  isInventoryVariationEligible,
  isInventoryProductEligible,
} from '../domain/inventoryScopeEligibility';

export const useInventoryScopeBuilder = (
  allProducts: readonly Product[],
  suppliers: readonly Person[],
  defaultResponsibleId = ''
) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [scopeType, setScopeType] = useState<InventoryScopeType | null>(null);

  // Configs
  const [inventoryName, setInventoryName] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedResponsibleId, setSelectedResponsibleId] = useState(defaultResponsibleId);
  const [responsibleError, setResponsibleError] = useState(false);
  const [customProducts, setCustomProducts] = useState<
    Array<{ product: Product; variation?: Variation }>
  >([]);

  const getAssignedSupplierName = useCallback(
    (product: Product) => {
      const supplierId = getInventorySupplierIds(product, suppliers)[0];

      if (!supplierId) return 'Sem fornecedor';

      const supplier = suppliers.find((person) => String(person.id) === supplierId);
      return supplier?.tradeName || supplier?.fullName || supplier?.nickname || 'Sem fornecedor';
    },
    [suppliers]
  );

  const getSupplierNames = useCallback(
    (product: Product) => {
      const supplierIds = getInventorySupplierIds(product, suppliers);

      const names = supplierIds
        .map((supplierId) => {
          const supplier = suppliers.find((person) => String(person.id) === supplierId);
          return supplier?.tradeName || supplier?.fullName || supplier?.nickname;
        })
        .filter(Boolean) as string[];

      return [...new Set(names)].join(' / ') || 'Fábrica não informada';
    },
    [suppliers]
  );

  const eligibleProductParents = useMemo(
    () => allProducts
      .filter((product) =>
        Boolean(
          product.id &&
          product.itemType === 'product' &&
          product.active === true &&
          !product.deleted &&
          !product.isDraft &&
          isInventoryProductEligible(product, suppliers) &&
          product.variations?.some((variation) =>
            isInventoryVariationEligible(variation) &&
            variation.active === true &&
            !variation.mergedToVariationId &&
            !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase())
          )
        )
      )
      .slice()
      .sort((left, right) =>
        String(left.description || left.name || '').localeCompare(
          String(right.description || right.name || ''),
          'pt-BR'
        )
      ),
    [allProducts, suppliers]
  );

  const matchingItems = useMemo(() => {
    const items: ScopeConfiguration['itemsSnapshot'] = [];

    const addProductVariations = (product: Product, specificVariation?: Variation) => {
      if (
        !isInventoryProductEligible(product, suppliers) ||
        (specificVariation && !isInventoryVariationEligible(specificVariation))
      ) return;
      const assignedSupplier = getAssignedSupplierName(product);
      const supplierNames = getSupplierNames(product);

      if (specificVariation) {
        items.push({
          productId: String(product.id),
          variationId: String(specificVariation.id),
          name:
            getVariationDisplayName(product, specificVariation) || product.description || 'Produto',
          supplierNames,
          assignedSupplier,
          systemStock: Number(specificVariation.stock ?? 0),
          unit: product.unit || 'UN',
          sku: specificVariation.sku || product.code || '',
          code: product.code || '',
          barcode: specificVariation.barcode || product.barcode || '',
          isActive:
            product.active !== false &&
            specificVariation.active !== false &&
            !['hidden', 'draft'].includes(String(specificVariation.status || '').toLowerCase()),
        });
      } else if (product.variations && product.variations.length > 0) {
        for (const variation of product.variations.filter(
          (item) => !item.mergedToVariationId && isInventoryVariationEligible(item)
        )) {
          items.push({
            productId: String(product.id),
            variationId: String(variation.id),
            name: getVariationDisplayName(product, variation) || product.description || 'Produto',
            supplierNames,
            assignedSupplier,
            systemStock: Number(variation.stock ?? 0),
            unit: product.unit || 'UN',
            sku: variation.sku || product.code || '',
            code: product.code || '',
            barcode: variation.barcode || product.barcode || '',
            isActive:
              product.active !== false &&
              variation.active !== false &&
              !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase()),
          });
        }
      } else {
        items.push({
          productId: String(product.id),
          name: product.description || product.name || 'Produto',
          supplierNames,
          assignedSupplier,
          systemStock: Number(product.stock ?? 0),
          unit: product.unit || 'UN',
          sku: product.sku || product.code || '',
          code: product.code || '',
          barcode: product.barcode || '',
          isActive: product.active !== false,
        });
      }
    };

    if (scopeType === 'full' || scopeType === 'general') {
      for (const product of allProducts) {
        addProductVariations(product);
      }
    } else if (scopeType === 'supplier') {
      const supplierProducts = selectedSupplierId
        ? allProducts.filter((product) => {
            const supplierIds = getInventorySupplierIds(product, suppliers);
            return supplierIds.includes(String(selectedSupplierId));
          })
        : allProducts;
      for (const product of supplierProducts) {
        addProductVariations(product);
      }
    } else if (scopeType === 'product') {
      const product = eligibleProductParents.find(
        (item) => String(item.id) === selectedProductId
      );
      for (const variation of product?.variations || []) {
        if (
          variation.active === true &&
          !variation.mergedToVariationId &&
          !['hidden', 'draft'].includes(String(variation.status || '').toLowerCase())
        ) {
          addProductVariations(product!, variation);
        }
      }
    } else if (scopeType === 'custom') {
      for (const { product, variation } of customProducts) {
        addProductVariations(product, variation);
      }
    }

    return items;
  }, [
    scopeType,
    allProducts,
    suppliers,
    selectedSupplierId,
    selectedProductId,
    customProducts,
    eligibleProductParents,
    getAssignedSupplierName,
    getSupplierNames,
  ]);

  const handleNextStep = useCallback((type: InventoryScopeType) => {
    setScopeType(type);
    setStep(2);

    // Auto-generate name
    const dateStr = new Date().toLocaleDateString('pt-BR');
    if (type === 'full') setInventoryName(`Inventário Livre: Etapas por Fornecedor - ${dateStr}`);
    else if (type === 'general') setInventoryName(`Inventário Geral - ${dateStr}`);
    else if (type === 'supplier') setInventoryName(`Fornecedor específico - ${dateStr}`);
    else if (type === 'product') {
      setSelectedProductId('');
      setInventoryName('Produto específico e suas variações');
    }
    else setInventoryName(`Inventário Personalizado`);
  }, []);

  return {
    step,
    scopeType,
    inventoryName,
    setInventoryName,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedProductId,
    setSelectedProductId,
    eligibleProductParents,
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
