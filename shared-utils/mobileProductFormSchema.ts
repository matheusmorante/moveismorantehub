import { z } from 'zod';
import { parseLocalizedNumber } from '../mobile/src/features/products/domain/productNumbers';
import { getMobileVariationRegistrationIssue, isMobileEcommerceLegible } from '../mobile/src/features/products/domain/productRegistrationRules';
import {
  getProductCharacteristicAttributes,
  isMobileVariableTechnicalField,
} from '../mobile/src/features/products/domain/productCharacteristics';
import { bulkNcmFormSchema } from './catalogFormSchemas';
import {
  getCompleteVariationName,
  normalizeCompleteVariationName,
} from './productVariationNameValidation';
import { getProductDiscountValidationIssues } from './productDiscountFields';
import { productNameInputSchema } from './productNameRequirement';
import {
  hasRequiredProductSupplier,
  PRODUCT_SUPPLIER_REQUIRED_MESSAGE,
} from './productSupplierRequirement';

const isNonnegativeLocalizedNumber = (value: number | string) => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
  if (!value.trim()) return true;
  const raw = value.trim().replace(/^R\$\s*/, '');
  return /^\d[\d.,\s]*$/.test(raw) && Number.isFinite(parseLocalizedNumber(value)) && parseLocalizedNumber(value) >= 0;
};
const numericInput = z.union([z.number(), z.string()]).refine(
  isNonnegativeLocalizedNumber,
  'Informe um número finito maior ou igual a zero.'
);
const inboundCostPriceInput = z.union([z.number(), z.string()]).refine(
  isNonnegativeLocalizedNumber,
  'O custo de aquisição deve ser maior ou igual a zero.'
);
const productNumbers = {
  unitPrice: numericInput.optional(), price: numericInput.optional(), promoPrice: numericInput.nullish(), costPrice: numericInput.optional(),
  stock: numericInput.optional(), minStock: numericInput.optional(), width: numericInput.optional(), height: numericInput.optional(), depth: numericInput.optional(), weight: numericInput.optional(),
  ipiPercent: numericInput.optional(), freightCost: numericInput.optional(), finalPurchasePrice: numericInput.optional(),
};
const discountInput = z.union([z.number(), z.string()]).optional();
const component = z.object({ productId: z.string(), variationId: z.string().nullish(), quantity: numericInput }).passthrough();
const attributeValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const structuredAttributes = z.union([
  z.array(z.object({ name: z.string().optional(), attribute: z.string().optional(), key: z.string().optional(), value: attributeValue.optional(), val: attributeValue.optional(), showName: z.boolean().optional() }).passthrough()),
  z.record(z.string(), z.union([attributeValue, z.object({ value: attributeValue.optional(), showName: z.boolean().optional() }).passthrough()])),
]);
const attributesInput = z.union([structuredAttributes, z.string().refine((value) => { try { return structuredAttributes.safeParse(JSON.parse(value)).success; } catch { return false; } }, 'As características devem conter valores válidos.')]);
const variationInput = z.object({
  ...productNumbers, id: z.string().optional(), sku: z.string().optional(), name: z.string().optional(),
  discountPercent: discountInput, discountFixed: discountInput,
  images: z.array(z.string()).optional(),
  attributes: attributesInput.optional(),
  comboItems: z.array(component).optional(), syncUnitPrice: z.boolean().optional(), syncPromoPrice: z.boolean().optional(), active: z.boolean().optional(),
}).passthrough();

/** Preserves the mobile product workflow, including composition and categoryId compatibility. */
export const createMobileProductFormSchema = (options: {
  draft: boolean;
  isStockistOnly: boolean;
  published: boolean;
  existingProductImageCount?: number;
  requireInboundCostPrice?: boolean;
}) => z.object({
  name: productNameInputSchema,
  title: z.string().optional().nullable(),
  marketplaceTitle: z.string().optional().nullable(),
  itemType: z.string().optional(), productKind: z.string().optional(),
  environment: z.string().optional(),
  categoryIds: z.array(z.string()).optional(), categoryId: z.string().optional(),
  ...productNumbers,
  costPrice: options.requireInboundCostPrice
    ? inboundCostPriceInput.optional()
    : productNumbers.costPrice,
  images: z.array(z.string()).optional(),
  hasVariations: z.boolean().optional(),
  variableTechnicalFields: z.array(z.string()).optional(),
  variations: z.array(variationInput).optional(), comboItems: z.array(component).optional(),
  fiscal: z.object({ ncm: z.string().optional(), merchandiseOrigin: z.string().optional() }).passthrough().optional(),
}).passthrough().superRefine((data, ctx) => {
  if (
    (data.images?.length || 0) > 75 &&
    (data.images?.length || 0) > (options.existingProductImageCount || 0)
  ) {
    ctx.addIssue({ code: 'custom', path: ['fotos'], message: 'A galeria do produto permite até 75 fotos.' });
  }
  if ((data.variations?.length || 0) > 1) {
    data.variations?.forEach((variation, index) => {
      if ((variation.images?.length || 0) > 15) {
        ctx.addIssue({ code: 'custom', path: ['variacoes', index, 'images'], message: 'Produtos com várias variações permitem até 15 fotos por variação.' });
      }
    });
  }
  const variations = data.variations || [];
  const isMultiVariationMode = Boolean(data.hasVariations) || variations.length > 1;
  if (variations.length > 1) {
    variations.forEach((variation, index) => {
      if (variation.syncUnitPrice !== false) return;
      const unitPrice = parseLocalizedNumber(variation.price ?? variation.unitPrice ?? data.unitPrice);
      getProductDiscountValidationIssues(
        variation.discountPercent,
        variation.discountFixed,
        unitPrice
      ).forEach(({ field, message }) =>
        ctx.addIssue({ code: 'custom', path: ['variacoes', index, field], message })
      );
    });
  }
  if (options.draft) return;
  const issue = (tab: string, message: string) => ctx.addIssue({ code: 'custom', path: [tab], message });
  if (options.requireInboundCostPrice && !String(data.costPrice ?? '').trim()) {
    issue('costPrice', 'Informe um custo de aquisição válido.');
  }
  if (data.itemType !== 'service' && !['normal', 'salvado', 'usado'].includes(data.productKind || '')) issue('geral', 'Selecione a origem do estoque do produto.');
  const validateComboItems = (
    items: Array<{ productId: string; variationId?: string | null; quantity?: string | number }>,
    path: Array<string | number>
  ) => {
    items.forEach((item, index) => {
      const itemData = item as unknown as Record<string, unknown>;
      const productId = String(itemData.productId || itemData.product_id || '').trim();
      const variationId = itemData.variationId ?? itemData.variation_id;
      const description = String(
        itemData.description || itemData.productName || itemData.name || ''
      ).trim();
      if (!productId || !description || (variationId != null && !String(variationId).trim())) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, index],
          message: 'Selecione o produto de cada componente ou remova a linha.',
        });
      }
      if (parseLocalizedNumber(item.quantity) < 1) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, index, 'quantity'],
          message: 'Informe quantidade maior ou igual a um para o componente.',
        });
      }
    });
  };
  validateComboItems(data.comboItems || [], ['variacoes']);
  variations.forEach((variation, index) =>
    validateComboItems(variation.comboItems || [], ['variacoes', index, 'comboItems'])
  );
  if (isMultiVariationMode && variations.length < 2) {
    issue('variacoes', 'Produto com variações precisa ter pelo menos 2 variações para concluir o cadastro.');
  }
  const parentImages = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const variationMissingImage = variations
    .map((variation, index) => ({ variation, index }))
    .find(({ variation }) => {
      const images = Array.isArray(variation.images)
        ? variation.images.filter(Boolean)
        : typeof (variation as any).image_url === 'string' && (variation as any).image_url.trim()
          ? (variation as any).image_url.split(',').filter(Boolean)
          : [];
      return images.length === 0 && (isMultiVariationMode || parentImages.length === 0);
    });
  if (variationMissingImage) {
    const variationName = variationMissingImage.variation.name || variationMissingImage.variation.sku || 'sem nome';
    ctx.addIssue({
      code: 'custom',
      path: ['variacoes', variationMissingImage.index, 'images'],
      message: `A variação "${variationName}" deve ter pelo menos 1 foto vinculada para concluir o cadastro.`,
    });
  }
  if (isMultiVariationMode && variations.length > 1) {
    const parentName = String(data.name || data.title || data.marketplaceTitle || '').trim();
    const firstIndexByName = new Map<string, number>();
    variations.forEach((variation, index) => {
      const completeName = normalizeCompleteVariationName(
        getCompleteVariationName(
          {
            ...variation,
            attributes: getProductCharacteristicAttributes(variation.attributes),
          },
          parentName
        )
      );
      if (!completeName) return;
      if (firstIndexByName.has(completeName)) {
        issue('variacoes', 'Os nomes completos das variações devem ser diferentes entre si.');
      } else {
        firstIndexByName.set(completeName, index);
      }
    });
  }
  const variableFields = Array.isArray(data.variableTechnicalFields) ? data.variableTechnicalFields : [];
  if (variableFields.length > 0 && variations.length > 1) {
    variations.forEach((variation, index) => {
      const storedValues: Array<[string, unknown]> = [];
      getProductCharacteristicAttributes(variation.attributes).forEach(({ name, value }) =>
        storedValues.push([name, value])
      );
      Object.entries((variation as any).technicalValues || {}).forEach(([name, value]) =>
        storedValues.push([name, value])
      );
      const missing = variableFields.filter((name) => {
        const matchingValue = storedValues.find(([storedName]) =>
          isMobileVariableTechnicalField(storedName, [name])
        )?.[1];
        if (matchingValue === undefined || matchingValue === null) return true;
        if (typeof matchingValue !== 'string') return false;
        const normalized = matchingValue
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR');
        return ['', 'n/a', 'nao se aplica'].includes(normalized);
      });
      if (missing.length) issue('variacoes', `Informe em cada variação: ${missing.join(', ')}.`);
    });
  }
  if (data.itemType !== 'service' && !data.categoryIds?.length && !data.categoryId) issue('geral', 'Selecione a categoria do produto.');
  const fiscal = data.fiscal as Record<string, unknown> | undefined;
  const isSalvaged = data.itemType !== 'service' && data.productKind === 'salvado';
  if (!options.isStockistOnly && isSalvaged && !data.opportunityId) {
    issue('geral', 'A oportunidade é obrigatória para produtos salvados.');
  }
  if (!hasRequiredProductSupplier(data)) issue('estoque', PRODUCT_SUPPLIER_REQUIRED_MESSAGE);
  if (!variations.length) issue('variacoes', 'Mantenha a variação principal do produto ou adicione uma nova na aba Variações.');
  const parentPrice = parseLocalizedNumber(data.unitPrice);
  const hasSellablePrice = parentPrice > 0 || variations.some((variation) =>
    parseLocalizedNumber(variation.syncUnitPrice !== false ? parentPrice : variation.price ?? variation.unitPrice) > 0
  );
  if (!hasSellablePrice && !isMultiVariationMode) {
    issue('estoque', 'Informe o preço de venda do produto.');
  }
  if (options.isStockistOnly && data.itemType !== 'service' && !bulkNcmFormSchema.safeParse({ ncm: String(fiscal?.ncm || '') }).success) issue('fiscal', 'Informe um NCM válido com 8 dígitos na aba Tributário / NF.');
  const invalidVariation = variations
    .map((variation, index) => ({
      index,
      issue: getMobileVariationRegistrationIssue(data, variation, variations),
    }))
    .find((entry) => Boolean(entry.issue));
  if (invalidVariation?.issue) {
    if (variations.length <= 1) {
      const msg = invalidVariation.issue.message.toLowerCase();
      if (
        msg.includes('dimensões') ||
        msg.includes('largura') ||
        msg.includes('altura') ||
        msg.includes('profundidade') ||
        msg.includes('características') ||
        invalidVariation.issue.tab === 'tecnico'
      ) {
        issue('technical', invalidVariation.issue.message);
      } else if (
        msg.includes('preço') ||
        msg.includes('valor') ||
        msg.includes('fornecedor') ||
        invalidVariation.issue.tab === 'estoque'
      ) {
        issue('estoque', invalidVariation.issue.message);
      } else if (msg.includes('ncm') || msg.includes('tribut')) {
        issue('fiscal', invalidVariation.issue.message);
      } else {
        issue('geral', invalidVariation.issue.message);
      }
    } else if (invalidVariation.issue.tab === 'estoque') {
      ctx.addIssue({
        code: 'custom',
        path: ['variacoes', invalidVariation.index, 'price'],
        message: invalidVariation.issue.message,
      });
    } else {
      issue('variacoes', invalidVariation.issue.message);
    }
  }
  if (options.published && !isMobileEcommerceLegible(data)) issue('geral', 'Despublique o Catálogo antes de remover ou alterar um campo obrigatório.');
});
