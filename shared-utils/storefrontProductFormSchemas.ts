import { imageFilesFormSchema } from './fileFormSchemas';
import { z } from 'zod';
import { productSchema } from './storefrontProductValidation';

/** Existing catalog currency interpretation, shared by validation and persistence. */
export function parseStorefrontPrice(value: string): number {
  if (!value) return 0;
  let cleaned = value.replace(/[^\d.,-]/g, '');
  if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  else if (!((cleaned.match(/\./g) || []).length === 1 && /\.\d{1,2}$/.test(cleaned))) cleaned = cleaned.replace(/\./g, '');
  return Number.parseFloat(cleaned) || 0;
}
const priceText = z.string().refine((value) => !value || (/^(?:R\$\s*)?-?\d[\d.,\s]*$/.test(value.trim()) && Number.isFinite(parseStorefrontPrice(value)) && parseStorefrontPrice(value) >= 0), 'Informe um valor monetário válido.');
const variation = z.object({
  id: z.string().optional(), name: z.string().optional(), sku: z.string().optional(),
  price: priceText.optional(), promo_price: priceText.optional(),
  stock: z.string().refine((value) => !value || /^\d+$/.test(value), 'Informe um estoque inteiro não negativo.').optional(),
  image_url: z.string().optional(), attributes: z.record(z.string(), z.string()),
  description: z.string().optional(), width: z.string().optional(), depth: z.string().optional(), height: z.string().optional(),
  use_parent_name: z.boolean().optional(), use_parent_price: z.boolean().optional(),
  use_parent_promo_price: z.boolean().optional(), use_parent_dimensions: z.boolean().optional(), use_parent_description: z.boolean().optional(),
}).passthrough();
export const storefrontVariationFormSchema = variation;
const productInput = z.object({
  name: z.string(), slug: z.string(), description: z.string(), price: priceText, promo_price: priceText,
  is_salvado: z.boolean(), opportunity_id: z.string().uuid().nullable(), category_ids: z.array(z.string().uuid()),
  width: z.string(), depth: z.string(), height: z.string(), depth_use_length: z.boolean(), images: z.array(z.string().url()),
});
export const storefrontProductDraftFormSchema = z.object({
  product: productInput, variations: z.array(variation), variationsEnabled: z.boolean(),
});
export const storefrontProductFormSchema = storefrontProductDraftFormSchema.superRefine((values, ctx) => {
  const result = productSchema.safeParse({ ...values.product, price: parseStorefrontPrice(values.product.price), promo_price: values.product.promo_price ? parseStorefrontPrice(values.product.promo_price) : null });
  if (!result.success) for (const issue of result.error.issues) ctx.addIssue({ code: 'custom', path: ['product', ...issue.path], message: issue.message });
  if (values.variationsEnabled && values.variations.some((item) => !item.image_url)) ctx.addIssue({ code: 'custom', path: ['variations'], message: 'Vincule uma foto para cada variação antes de prosseguir.' });
});
export const storefrontAttributeFormSchema = z.object({
  name: z.string().trim().min(1, 'Preencha o nome da característica!'),
  values: z.array(z.string().trim().min(1)).min(1, 'Adicione pelo menos um valor!'),
});
export const storefrontAttributeValueFormSchema = z.object({
  attributeId: z.string().min(1, 'Selecione a característica.'), value: z.string().trim().min(1, 'Informe o valor.'),
});
export const storefrontImageUploadFormSchema = imageFilesFormSchema;
export const storefrontImageUrlFormSchema = z.object({
  url: z.string().trim().url('Informe um endereço de imagem válido.').refine((value) => /^https?:\/\//i.test(value), 'Use um endereço HTTP ou HTTPS.'),
});
