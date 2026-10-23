import { cartesianVariationFormSchema } from '../../../../../shared-utils/catalogFormSchemas';
import { toTitleCase } from '../../../../../shared-utils/productText';
import { resolveMobileVariableTechnicalFieldNames } from './productCharacteristics';
import { generateVariationSku } from './productSku';

export type MobileBulkVariationOption = {
  name: string;
  values: string[];
  showName: boolean;
};

type ProductVariation = Record<string, any>;

export const getInitialMobileVariationStatus = (product: Record<string, any>): 'draft' | 'hidden' =>
  product.isDraft || product.is_draft || product.status === 'draft' ? 'draft' : 'hidden';

/** Gera as mesmas combinações, nomes, atributos e dados iniciais usados pelo ERP. */
export const generateMobileProductVariations = (
  options: MobileBulkVariationOption[],
  product: Record<string, any>,
  existingVariations: ProductVariation[] = []
): { variations: ProductVariation[]; variableTechnicalFields: string[] } => {
  const validated = cartesianVariationFormSchema.safeParse({ attributes: options });
  if (!validated.success) return { variations: [], variableTechnicalFields: [] };

  const selected = validated.data.attributes;
  let combinations: Array<Record<string, { value: string; showName: boolean }>> = [{}];
  for (const attribute of selected) {
    combinations = combinations.flatMap((combination) =>
      attribute.values.map((value) => ({
        ...combination,
        [attribute.name]: { value, showName: attribute.showName },
      }))
    );
  }

  const parentName = toTitleCase(String(product.name || product.description || ''));
  const parentCode = String(product.code || '000000');
  const status = getInitialMobileVariationStatus(product);
  const variations: ProductVariation[] = [];
  combinations.forEach((combination) => {
    const attributes = selected.map((attribute) => ({
      name: toTitleCase(attribute.name),
      value: toTitleCase(combination[attribute.name].value),
      showName: combination[attribute.name].showName,
    }));
    const suffix = attributes.map((attribute) => attribute.value).join(' ');
    const sku = generateVariationSku(parentCode, [...existingVariations, ...variations], 0);

    variations.push({
      id: crypto.randomUUID(),
      name: toTitleCase([parentName, suffix].filter(Boolean).join(' ')),
      sku,
      unitPrice: product.unitPrice || 0,
      costPrice: product.costPrice || 0,
      stock: 0,
      syncUnitPrice: true,
      syncPromoPrice: true,
      syncCostPrice: true,
      syncDescription: true,
      images: [],
      active: false,
      status,
      attributes,
      comboItems: [],
    });
  });

  const variableTechnicalFields = Array.from(
    new Set([
      ...resolveMobileVariableTechnicalFieldNames({
        ...product,
        variations: existingVariations,
      }),
      ...selected.map((attribute) => attribute.name),
    ])
  );

  return { variations, variableTechnicalFields };
};
