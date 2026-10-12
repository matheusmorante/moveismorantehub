import { useState, useRef } from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { generateVariationSku } from '@/pages/utils/productService';
import { buildProductVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { toast } from 'react-toastify';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';

export function useProductFormVariations(
  formData: Partial<Product>,
  setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>
) {
  const [editingVariationComboId, setEditingVariationComboId] = useState<string | null>(null);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null);
  const pendingNewVariationIdRef = useRef<string | null>(null);

  const updateVariation = <K extends keyof Variation>(
    id: string,
    field: K,
    value: Variation[K]
  ) => {
    setFormData((prev: Partial<Product>) => ({
      ...prev,
      variations: prev.variations?.map((v) => (v.id === id ? {
        ...v, [field]: value, ...(isProductDraft(prev) ? { active: false } : {}),
      } : v)),
    }));
  };

  const addVariation = () => {
    const baseName = toTitleCase(formData.name || formData.description || 'Nova Variação');
    const parentCode = formData.code || '000000';
    const newSku = generateVariationSku(parentCode, formData.variations || []);

    const newVar: Variation = {
      id: crypto.randomUUID(),
      name: baseName,
      sku: newSku,
      unitPrice: formData.unitPrice || 0,
      costPrice: formData.costPrice || 0,
      stock: 0,
      images: [],
      active: false,
      status: 'hidden',
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncDescription: true,
      syncDimensions: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      syncWeight: true,
      syncIpi: true,
      syncFreight: true,
      attributes: [],
      comboItems: [],
    };
    setFormData((prev: Partial<Product>) => ({
      ...prev,
      variations: [...(prev.variations || []), newVar],
      hasVariations: true,
    }));
    pendingNewVariationIdRef.current = newVar.id;
    setEditingVariationId(newVar.id);
  };

  const removeVariation = (id: string) => {
    if ((formData.variations?.length || 0) <= 1) {
      toast.info('A última variação só pode ser removida junto com o produto.');
      return;
    }

    setFormData((prev: Partial<Product>) => {
      const filtered = prev.variations?.filter((v) => v.id !== id);
      return {
        ...prev,
        variations: filtered,
        hasVariations: true,
      };
    });
  };

  const generateBulkVariations = (
    options: { name: string; values: string[]; showName: boolean }[]
  ) => {
    const attributes = options.filter((o) => o.name && o.values.length > 0);
    if (attributes.length === 0) return;

    type CombinationMap = Record<string, { value: string; showName: boolean }>;
    let combinations: CombinationMap[] = [{}];

    attributes.forEach((attr) => {
      const newCombinations: CombinationMap[] = [];
      combinations.forEach((combo) => {
        attr.values.forEach((val) => {
          newCombinations.push({
            ...combo,
            [attr.name]: { value: val, showName: attr.showName },
          });
        });
      });
      combinations = newCombinations;
    });

    const newVars: Variation[] = combinations.map((combo, idx) => {
      const attributeValues = attributes
        .map((attr) => {
          const attrData = combo[attr.name];
          return toTitleCase(String(attrData.value));
        })
        .join(' ');

      const parentName = toTitleCase(formData.name || formData.description || '');
      const name = toTitleCase(buildProductVariationName(parentName, attributeValues));
      const parentCode = formData.code || '000000';
      const finalSku = generateVariationSku(parentCode, formData.variations || [], idx);

      return {
        id: crypto.randomUUID(),
        name,
        sku: finalSku,
        unitPrice: formData.unitPrice || 0,
        costPrice: formData.costPrice || 0,
        stock: 0,
        syncUnitPrice: true,
        syncPromoPrice: true,
        syncCostPrice: true,
        syncDescription: true,
        images: [],
        active: false,
        status: 'hidden',
        attributes: attributes.map((attr) => ({
          name: toTitleCase(attr.name),
          value: toTitleCase(String(combo[attr.name].value)),
          showName: combo[attr.name].showName,
        })),
        comboItems: [],
      };
    });

    const existingSkus = new Set((formData.variations || []).map((v) => v.sku?.toUpperCase()));
    const deduplicatedNewVars = newVars.map((v) => {
      let currentSku = v.sku;
      let counter = 1;
      while (existingSkus.has(currentSku.toUpperCase())) {
        const suffix = `-${counter}`;
        currentSku = v.sku.substring(0, 50 - suffix.length) + suffix;
        counter++;
      }
      existingSkus.add(currentSku.toUpperCase());
      return { ...v, sku: currentSku };
    });

    setFormData((prev: Partial<Product>) => ({
      ...prev,
      variations: [...(prev.variations || []), ...deduplicatedNewVars],
      hasVariations: true,
    }));
    toast.success(`${newVars.length} variações geradas com sucesso!`);
  };

  const regenerateAllVariationSkus = () => {
    setFormData((prev: Partial<Product>) => {
      if (!prev.variations) return prev;

      const existingSkus = new Set<string>();
      const newVariations = prev.variations.map((v, idx) => {
        const isGeneric = !v.sku || v.sku.startsWith('NEW-VAR') || v.sku.includes('-NEW');
        if (!isGeneric) {
          existingSkus.add(v.sku.toUpperCase());
          return v;
        }

        const base = prev.code || 'PROD';
        const suffix = v.name ? v.name.toUpperCase().replace(/\s+/g, '') : `V${idx + 1}`;
        let newSku = `${base}-${suffix}`;
        if (newSku.length > 50) newSku = newSku.substring(0, 50);

        let counter = 1;
        let candidate = newSku;
        while (existingSkus.has(candidate.toUpperCase())) {
          const countStr = `-${counter}`;
          candidate = newSku.substring(0, 50 - countStr.length) + countStr;
          counter++;
        }

        existingSkus.add(candidate.toUpperCase());
        return { ...v, sku: candidate };
      });
      return { ...prev, variations: newVariations };
    });
    toast.info('SKUs das variações regenerados com exclusividade.');
  };

  return {
    editingVariationComboId,
    setEditingVariationComboId,
    editingVariationId,
    setEditingVariationId,
    pendingNewVariationIdRef,
    updateVariation,
    addVariation,
    removeVariation,
    generateBulkVariations,
    regenerateAllVariationSkus,
  };
}
