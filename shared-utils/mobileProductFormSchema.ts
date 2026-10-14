import { z } from 'zod';
import { parseLocalizedNumber } from '../mobile/src/features/products/domain/productNumbers';
import { getMobileVariationRegistrationIssue, isMobileEcommerceLegible } from '../mobile/src/features/products/domain/productRegistrationRules';
import { bulkNcmFormSchema } from './catalogFormSchemas';

const numericInput = z.union([z.number(), z.string()]).refine((value) => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
  if (!value.trim()) return true;
  const raw = value.trim().replace(/^R\$\s*/, '');
  return /^\d[\d.,\s]*$/.test(raw) && Number.isFinite(parseLocalizedNumber(value)) && parseLocalizedNumber(value) >= 0;
}, 'Informe um número finito maior ou igual a zero.');
const productNumbers = {
  unitPrice: numericInput.optional(), price: numericInput.optional(), promoPrice: numericInput.nullish(), costPrice: numericInput.optional(),
  stock: numericInput.optional(), minStock: numericInput.optional(), width: numericInput.optional(), height: numericInput.optional(), depth: numericInput.optional(), weight: numericInput.optional(),
  ipiPercent: numericInput.optional(), freightCost: numericInput.optional(), finalPurchasePrice: numericInput.optional(),
};
const component = z.object({ productId: z.string(), variationId: z.string().optional(), quantity: numericInput }).passthrough();
const attributeValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const structuredAttributes = z.union([
  z.array(z.object({ name: z.string().optional(), attribute: z.string().optional(), key: z.string().optional(), value: attributeValue.optional(), val: attributeValue.optional(), showName: z.boolean().optional() }).passthrough()),
  z.record(z.string(), z.union([attributeValue, z.object({ value: attributeValue.optional(), showName: z.boolean().optional() }).passthrough()])),
]);
const attributesInput = z.union([structuredAttributes, z.string().refine((value) => { try { return structuredAttributes.safeParse(JSON.parse(value)).success; } catch { return false; } }, 'As características devem conter valores válidos.')]);
const variationInput = z.object({
  ...productNumbers, id: z.string().optional(), sku: z.string().optional(), name: z.string().optional(),
  attributes: attributesInput.optional(),
  comboItems: z.array(component).optional(), syncUnitPrice: z.boolean().optional(), syncPromoPrice: z.boolean().optional(), active: z.boolean().optional(),
}).passthrough();

/** Preserves the mobile product workflow, including composition and categoryId compatibility. */
export const createMobileProductFormSchema = (options: { draft: boolean; isStockistOnly: boolean; published: boolean }) => z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto (mínimo 2 caracteres).'),
  itemType: z.string().optional(), productKind: z.string().optional(),
  categoryIds: z.array(z.string()).optional(), categoryId: z.string().optional(),
  ...productNumbers,
  variations: z.array(variationInput).optional(), comboItems: z.array(component).optional(),
  fiscal: z.object({ ncm: z.string().optional(), merchandiseOrigin: z.string().optional() }).passthrough().optional(),
}).passthrough().superRefine((data, ctx) => {
  if (options.draft) return;
  const issue = (tab: string, message: string) => ctx.addIssue({ code: 'custom', path: [tab], message });
  if (data.itemType !== 'service' && !['normal', 'salvado', 'usado'].includes(data.productKind || '')) issue('geral', 'Selecione a origem do estoque do produto.');
  const variations = data.variations || [];
  if (data.itemType === 'composition') {
    const componentCount = variations.reduce((total, variation) => total + (Array.isArray(variation.comboItems) ? variation.comboItems.length : 0), 0);
    if (Math.max(componentCount, Array.isArray(data.comboItems) ? data.comboItems.length : 0) < 2) issue('variacoes', 'Vincule pelo menos 2 produtos componentes na aba Variações.');
  }
  if (data.itemType !== 'service' && !data.categoryIds?.length && !data.categoryId) issue('geral', 'Selecione a categoria do produto.');
  const fiscal = data.fiscal as Record<string, unknown> | undefined;
  const ownProduction = data.merchandiseOrigin === 'own_production' || data.isOwnProduction === true || fiscal?.merchandiseOrigin === 'own_production';
  if (!ownProduction && !data.mainSupplierId && !data.supplierId) issue('estoque', 'Selecione o fornecedor principal na aba Estoque e Precificação.');
  if (!variations.length) issue('variacoes', 'Mantenha a variação principal do produto ou adicione uma nova na aba Variações.');
  const parentPrice = parseLocalizedNumber(data.unitPrice);
  if (!(parentPrice > 0 || variations.some((variation) => parseLocalizedNumber(variation.syncUnitPrice !== false ? parentPrice : variation.price ?? variation.unitPrice) > 0))) issue('estoque', 'Informe o preço de venda do produto.');
  if (options.isStockistOnly && data.itemType !== 'service' && !bulkNcmFormSchema.safeParse({ ncm: String(fiscal?.ncm || '') }).success) issue('fiscal', 'Informe um NCM válido com 8 dígitos na aba Tributário / NF.');
  const invalidVariation = variations.map((variation) => getMobileVariationRegistrationIssue(data, variation, variations)).find(Boolean);
  if (invalidVariation) issue('variacoes', invalidVariation.message);
  if (options.published && !isMobileEcommerceLegible(data)) issue('geral', 'Despublique o Catálogo antes de remover ou alterar um campo obrigatório.');
});
