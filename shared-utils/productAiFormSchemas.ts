import { z } from 'zod';
import { productVariationDraftSchema } from './productVariationValidation';
import { normalizeFiscalIdentifier } from './fiscalIdentifiers';

const technicalValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null(), z.undefined()]);

export const productDescriptionAiFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o nome antes de aperfeiçoar a descrição.'),
  currentDescription: z.string(),
  material: z.string().optional(), brand: z.string().optional(), line: z.string().optional(),
  ...productVariationDraftSchema.pick({ width: true, height: true, depth: true, weight: true }).shape,
  technicalValues: z.record(z.string(), technicalValue).optional(),
});

export const productCategorySuggestionFormSchema = z.object({
  title: z.string().trim().min(1, 'Digite o nome ou título para sugerir categoria.'),
  categories: z.array(z.object({ id: z.string().trim().min(1, 'Categoria sem identificação.'), name: z.string().optional(), category: z.string().optional() }).passthrough()),
});
export const productComboNameFormSchema = z.object({
  items: z.array(z.object({
    description: z.string().trim().min(1, 'Informe a descrição dos itens do combo.'),
    quantity: z.number().positive('Informe uma quantidade maior que zero para os itens do combo.'),
  })).min(1, 'Adicione itens ao combo primeiro.'),
});
export const productChannelDescriptionFormSchema = productDescriptionAiFormSchema.pick({ title: true, material: true, brand: true, line: true, width: true, height: true, depth: true }).extend({
  title: z.string().trim().min(1, 'O produto precisa de um título.'),
  type: z.enum(['whatsapp', 'ecommerce'], 'Selecione o canal da descrição.'),
});
export const productMarketplaceTitleFormSchema = z.object({
  description: z.string().trim().min(1, 'O produto precisa de um título base.'),
  material: z.string().optional(),
});
export const productFiscalSuggestionFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o nome ou título do produto para preenchimento fiscal.'),
  description: z.string(), material: z.string(), category: z.string(),
  companyName: z.string(), companyAddress: z.string(),
  companyCnpj: z.string().transform(normalizeFiscalIdentifier),
});
export const productDescriptionImprovementFormSchema = productDescriptionAiFormSchema.extend({
  categoryIds: z.array(z.string().trim().min(1, 'Selecione uma categoria válida.')).min(1, 'Selecione pelo menos uma categoria antes de aperfeiçoar a descrição.'),
}).superRefine((value, context) => {
  if (![value.width, value.height, value.depth].some((measure) => measure !== undefined && measure > 0)) {
    context.addIssue({ code: 'custom', path: ['width'], message: 'Informe pelo menos uma medida (Altura, Largura ou Profundidade) antes de aperfeiçoar.' });
  }
});
export const productPriceSuggestionFormSchema = z.object({
  description: z.string().trim().min(1, 'O produto precisa de um título.'),
  costPrice: z.number().positive('Preço de custo final é necessário para sugerir preços.'),
  material: z.string().optional(),
});
export const productAiGeneratedTextSchema = z.string().trim().min(1);
const priceTierSchema = z.object({ price: z.number().nonnegative(), margin: z.number().optional() });
export const productAiPriceResultsSchema = z.object({
  low: priceTierSchema.optional(), medium: priceTierSchema.optional(), high: priceTierSchema.optional(),
}).refine((value) => Boolean(value.low || value.medium || value.high));
