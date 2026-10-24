import { useEffect } from 'react';
import Product from '@/pages/types/product.type';
import {
  computeVariationName,
  getVariationNameAttributes,
  getVariationAttributeValuesInNameOrder,
} from '@/pages/utils/productVariationDefaults';
import { calculateProductFinalPurchasePrice } from '../../../../../../../shared-utils/productPurchasePricing';
import { getSimpleProductVariationTechnicalValues } from '../../../../../../../shared-utils/simpleProductVariationTechnicalValues';

interface UseProductFormSyncParams {
  readonly formData: Partial<Product>;
  readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
  readonly isExistingProduct?: boolean;
}

/**
 * Hook responsável pela sincronização contínua de campos computados e herdados no formulário de produtos:
 * 1. Cálculo do preço final de compra (custo + IPI + frete).
 * 2. Propagação de campos herdados do produto pai para as variações (preço, descrição, dimensões, fiscal).
 * 3. Agregação dos valores das variações filhas de volta para o produto pai (estoque total e custo médio).
 */
export function useProductFormSync({ formData, setFormData, isExistingProduct = false }: UseProductFormSyncParams): void {
  // 1. Cálculo do preço final de compra
  useEffect(() => {
    const final = calculateProductFinalPurchasePrice(
      formData.costPrice || 0,
      formData.ipiPercent || 0,
      formData.freightCost || 0,
      formData.freightType || 'fixed',
      formData.ipiType || 'percentage'
    );
    if (Math.abs(final - (formData.finalPurchasePrice || 0)) > 0.01) {
      setFormData((prev) => ({ ...prev, finalPurchasePrice: final }));
    }
  }, [
    formData.costPrice,
    formData.ipiPercent,
    formData.ipiType,
    formData.freightCost,
    formData.freightType,
    formData.finalPurchasePrice,
    setFormData,
  ]);

  // 2. Propagação de campos herdados (Pai -> Variações)
  useEffect(() => {
    if (!formData.variations?.length) return;

    const nextVariations = formData.variations.map((v) => {
      let updated = false;
      const newV = { ...v };

      const inherit = <K extends keyof typeof newV>(
        field: K,
        enabled: boolean,
        value: (typeof newV)[K]
      ) => {
        if (enabled && newV[field] !== value) {
          newV[field] = value;
          updated = true;
        }
      };

      if (v.syncUnitPrice && v.unitPrice !== formData.unitPrice) {
        newV.unitPrice = formData.unitPrice || 0;
        updated = true;
      }
      if (v.syncCostPrice && v.costPrice !== formData.costPrice) {
        newV.costPrice = formData.costPrice || 0;
        updated = true;
      }
      if (v.syncPromoPrice !== false && v.promoPrice !== formData.promoPrice) {
        newV.promoPrice = formData.promoPrice;
        updated = true;
      }

      const parentName = formData.name || formData.description || '';
      const variationNameAttributes = getVariationNameAttributes(
        v.attributes || []
      );
      const variationName = computeVariationName(parentName, variationNameAttributes);
      const defaultName = computeVariationName(parentName, []);
      const nameFromVariationAttributes = computeVariationName(parentName, v.attributes || []);
      const currentNameSuffix = newV.name
        .toLocaleLowerCase('pt-BR')
        .startsWith(parentName.toLocaleLowerCase('pt-BR'))
          ? newV.name.slice(parentName.length).replace(/^[\s\-–—_:]+/u, '').trim()
          : newV.name.trim();
      const attributeNameSuffix = getVariationAttributeValuesInNameOrder(
        v.attributes || []
      ).join(' ');
      const normalizeNamePart = (value: string) =>
        value
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR');
      const nameIsGenerated =
        !newV.name ||
        newV.name === 'Variação' ||
        newV.name === defaultName ||
        newV.name === nameFromVariationAttributes ||
        normalizeNamePart(currentNameSuffix) === normalizeNamePart(attributeNameSuffix);

      if (newV.name !== variationName && nameIsGenerated) {
        newV.name = variationName;
        updated = true;
      }

      inherit('description', Boolean(v.syncDescription), formData.description);
      inherit('width', Boolean(v.syncWidth), formData.width);
      inherit('height', Boolean(v.syncHeight), formData.height);
      inherit('depth', Boolean(v.syncDepth), formData.depth);
      inherit('weight', Boolean(v.syncWeight), formData.weight);
      inherit('condition', Boolean(v.syncCondition), formData.condition);

      if (
        v.syncFiscal &&
        JSON.stringify(v.fiscal || {}) !== JSON.stringify(formData.fiscal || {})
      ) {
        newV.fiscal = formData.fiscal ? { ...formData.fiscal } : undefined;
        updated = true;
      }

      return updated ? newV : v;
    });

    if (JSON.stringify(nextVariations) !== JSON.stringify(formData.variations)) {
      setFormData((prev) => ({ ...prev, variations: nextVariations }));
    }
  }, [
    formData.name,
    formData.description,
    formData.unitPrice,
    formData.costPrice,
    formData.promoPrice,
    formData.width,
    formData.height,
    formData.depth,
    formData.weight,
    formData.condition,
    formData.fiscal,
    formData.variations,
    setFormData,
  ]);

  // 3. Agregação dos valores das variações (Filhas -> Pai: Estoque e Custo Médio)
  useEffect(() => {
    if (!formData.hasVariations || !formData.variations?.length) return;

    const totalStock = formData.variations.reduce((acc, v) => acc + (v.stock || 0), 0);

    const shouldUpdateStock = formData.stock !== totalStock;

    if (shouldUpdateStock) {
      setFormData((prev) => ({
        ...prev,
        stock: totalStock,
      }));
    }
  }, [formData.variations, formData.hasVariations, formData.stock, setFormData]);

  // Uma variação simples nova herda os campos do pai. Em produtos existentes, a remoção
  // de uma variação aplica a mesma herança explicitamente e preserva saldo/atributos.
  useEffect(() => {
    const variation = formData.variations?.[0];
    if (isExistingProduct || formData.hasVariations || formData.variations?.length !== 1 || !variation) return;
    const parentName = formData.name || formData.title || formData.description || '';
    const inheritedFields = {
      name: parentName,
      title: formData.title || formData.name || '',
      marketplaceTitle: formData.marketplaceTitle || formData.title || formData.name || '',
      barcode: formData.barcode || '',
      stock: Number(formData.stock || 0),
      unitPrice: Number(formData.unitPrice || 0),
      promoPrice: Number(formData.promoPrice || 0),
      costPrice: Number(formData.costPrice || 0),
      condition: formData.condition || 'novo',
      description: formData.description || '',
      fiscal: formData.fiscal ? { ...formData.fiscal } : undefined,
      width: Number(formData.width || 0),
      height: Number(formData.height || 0),
      depth: Number(formData.depth || 0),
      weight: Number(formData.weight || 0),
      ipiPercent: Number(formData.ipiPercent || 0),
      ipiType: formData.ipiType || 'percentage',
      freightCost: Number(formData.freightCost || 0),
      freightType: formData.freightType || 'fixed',
      finalPurchasePrice: Number(formData.finalPurchasePrice || 0),
      minStock: Number(formData.minStock || 0),
      leadTime: Number(formData.leadTime || 0),
      avgMonthlySales: Number(formData.avgMonthlySales || 0),
      classification: formData.classification,
      technicalValues: getSimpleProductVariationTechnicalValues({
        hasVariations: Boolean(formData.hasVariations),
        variationCount: formData.variations?.length || 0,
        parentTechnicalValues: formData.technicalValues,
        currentVariationTechnicalValues: variation.technicalValues,
      }),
      attributes: [],
      images: [...(formData.images || [])],
    };
    const hasChanged = Object.entries(inheritedFields).some(
      ([field, value]) => JSON.stringify(variation[field as keyof typeof variation]) !== JSON.stringify(value)
    );
    if (!hasChanged) return;

    setFormData((prev) => ({
      ...prev,
      variations: prev.variations?.map((item) =>
        item.id === variation.id ? { ...item, ...inheritedFields } : item
      ),
    }));
  }, [
    formData.hasVariations,
    formData.name,
    formData.title,
    formData.marketplaceTitle,
    formData.barcode,
    formData.stock,
    formData.unitPrice,
    formData.promoPrice,
    formData.costPrice,
    formData.condition,
    formData.description,
    formData.fiscal,
    formData.width,
    formData.height,
    formData.depth,
    formData.weight,
    formData.ipiPercent,
    formData.ipiType,
    formData.freightCost,
    formData.freightType,
    formData.finalPurchasePrice,
    formData.minStock,
    formData.leadTime,
    formData.avgMonthlySales,
    formData.classification,
    formData.technicalValues,
    formData.images,
    formData.variations,
    isExistingProduct,
    setFormData,
  ]);

  // Em um produto simples salvo, a variação única também acompanha as características do pai.
  useEffect(() => {
    const variation = formData.variations?.[0];
    if (
      !isExistingProduct ||
      formData.hasVariations ||
      formData.variations?.length !== 1 ||
      !variation
    ) {
      return;
    }

    const technicalValues =
      formData.technicalValues == null
        ? variation.technicalValues
        : { ...formData.technicalValues };
    if (JSON.stringify(variation.technicalValues) === JSON.stringify(technicalValues)) return;

    setFormData((previous) => ({
      ...previous,
      variations: previous.variations?.map((item) =>
        item.id === variation.id ? { ...item, technicalValues } : item
      ),
    }));
  }, [
    formData.hasVariations,
    formData.technicalValues,
    formData.variations,
    isExistingProduct,
    setFormData,
  ]);
}
