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

export const productAiCharacteristicsModalFormSchema = z.object({
  additionalInfo: z.string().max(3000, 'Texto adicional não pode exceder 3000 caracteres.').optional().default(''),
});

export type ProductAiCharacteristicsModalFormValues = z.infer<typeof productAiCharacteristicsModalFormSchema>;

export const productAiCharacteristicsContextSchema = z.object({
  productName: z.string().trim().min(2, 'Informe o nome do produto antes de preencher as características.'),
  brand: z.string().trim().min(1, 'Informe a marca do produto antes de preencher com IA.'),
  model: z.string().trim().min(1, 'Informe o modelo do produto antes de preencher com IA.'),
  categoryName: z.string().optional().default(''),
  description: z.string().optional().default(''),
  additionalInfo: z.string().optional().default(''),
  images: z.array(z.string()).optional().default([]),
  availableAttributes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    dataType: z.string().optional(),
    options: z.array(z.string()).optional(),
  })).optional().default([]),
});

export type ProductAiCharacteristicsContext = z.infer<typeof productAiCharacteristicsContextSchema>;

export const productAiSuggestedCharacteristicsSchema = z.object({
  identifiedProduct: z.object({
    name: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    confidence: z.enum(['alta', 'media', 'baixa']).default('alta'),
    sources: z.array(z.object({
      title: z.string(),
      uri: z.string().optional(),
    })).optional(),
    divergences: z.string().optional(),
  }).optional(),
  technicalValues: z.record(z.string(), technicalValue),
  itemConfidence: z.record(z.string(), z.enum(['alta', 'media', 'baixa'])).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  width: z.union([z.number(), z.string()]).optional(),
  depth: z.union([z.number(), z.string()]).optional(),
  weight: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional(),
  reasoning: z.string().optional(),
  sources: z.array(z.object({
    title: z.string(),
    uri: z.string().optional(),
  })).optional(),
});

export type ProductAiSuggestedCharacteristics = z.infer<typeof productAiSuggestedCharacteristicsSchema>;

export const productAiDescriptiveTextFormSchema = z.object({
  descriptiveText: z
    .string()
    .trim()
    .min(5, 'Cole ou digite a descrição ou especificações do produto (mínimo 5 caracteres).'),
  additionalInfo: z.string().optional().default(''),
});

export type ProductAiDescriptiveTextFormValues = z.infer<typeof productAiDescriptiveTextFormSchema>;

export const productAiDescriptiveTextContextSchema = z.object({
  descriptiveText: z.string().trim().min(5),
  currentName: z.string().optional().default(''),
  currentBrand: z.string().optional().default(''),
  currentModel: z.string().optional().default(''),
  categoryName: z.string().optional().default(''),
  additionalInfo: z.string().optional().default(''),
  availableAttributes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    dataType: z.string().optional(),
    options: z.array(z.string()).optional(),
  })).optional().default([]),
});

export type ProductAiDescriptiveTextContext = z.infer<typeof productAiDescriptiveTextContextSchema>;

