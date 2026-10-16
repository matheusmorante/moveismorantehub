import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import { generateVariationSku } from '@/pages/utils/productService';
import { buildProductVariationName } from '@/pages/utils/productVariationDefaults';
import { toTitleCase } from '@/pages/utils/textUtils';
import { isProductDraft } from '@/pages/utils/productService/productDraftSnapshot';

export interface BulkVariationOption {
  name: string;
  values: string[];
  showName: boolean;
}

export type CombinationMap = Record<string, { value: string; showName: boolean }>;

/**
 * Gera o produto cartesiano a partir dos atributos e valores fornecidos.
 */
export function generateCartesianCombinations(
  options: BulkVariationOption[]
): { attributes: BulkVariationOption[]; combinations: CombinationMap[] } {
  const attributes = options.filter((o) => o.name && o.values.length > 0);
  if (attributes.length === 0) return { attributes: [], combinations: [] };

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

  return { attributes, combinations };
}

/**
 * Garante que os SKUs das novas variações não colidam com os existentes nem entre si.
 */
export function deduplicateVariationSkus(
  newVariations: Variation[],
  existingVariations: Variation[] = []
): Variation[] {
  const existingSkus = new Set(
    existingVariations
      .map((v) => v.sku?.toUpperCase())
      .filter((sku): sku is string => Boolean(sku))
  );

  return newVariations.map((v) => {
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
}

/**
 * Cria a estrutura de dados das novas variações a partir do produto cartesiano de atributos.
 */
export function buildBulkVariations(
  options: BulkVariationOption[],
  formData: Partial<Product>,
  existingVariations: Variation[] = []
): Variation[] {
  const { attributes, combinations } = generateCartesianCombinations(options);
  if (combinations.length === 0) return [];

  const parentName = toTitleCase(formData.name || formData.description || '');
  const parentCode = formData.code || '000000';
  const isDraft = isProductDraft(formData);

  const newVars: Variation[] = combinations.map((combo, idx) => {
    const attributeValues = attributes
      .map((attr) => toTitleCase(String(combo[attr.name].value)))
      .join(' ');

    const name = toTitleCase(buildProductVariationName(parentName, attributeValues));
    const finalSku = generateVariationSku(parentCode, existingVariations, idx);

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
      status: isDraft ? 'draft' : 'hidden',
      attributes: attributes.map((attr) => ({
        name: toTitleCase(attr.name),
        value: toTitleCase(String(combo[attr.name].value)),
        showName: combo[attr.name].showName,
      })),
      comboItems: [],
    };
  });

  return deduplicateVariationSkus(newVars, existingVariations);
}

/**
 * Cria uma nova variação individual padrão.
 */
export function createDefaultNewVariation(
  formData: Partial<Product>,
  existingVariations: Variation[] = []
): Variation {
  const baseName = toTitleCase(formData.name || formData.description || 'Nova Variação');
  const parentCode = formData.code || '000000';
  const newSku = generateVariationSku(parentCode, existingVariations);

  return {
    id: crypto.randomUUID(),
    name: baseName,
    sku: newSku,
    unitPrice: formData.unitPrice || 0,
    costPrice: formData.costPrice || 0,
    stock: 0,
    images: [],
    active: false,
    status: isProductDraft(formData) ? 'draft' : 'hidden',
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
}

/**
 * Regenera SKUs de todas as variações genéricas garantindo unicidade.
 */
export function regenerateAllVariationSkusList(
  variations: Variation[],
  parentCode = 'PROD'
): Variation[] {
  const existingSkus = new Set<string>();

  return variations.map((v, idx) => {
    const isGeneric = !v.sku || v.sku.startsWith('NEW-VAR') || v.sku.includes('-NEW');
    if (!isGeneric) {
      existingSkus.add(v.sku.toUpperCase());
      return v;
    }

    const base = parentCode || 'PROD';
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
}
