import { z } from 'zod';

export const SearchProductsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, 'O termo de busca é obrigatório')
    .max(100, 'O termo de busca não pode exceder 100 caracteres'),
  limit: z
    .number()
    .int()
    .min(1, 'O limite mínimo é 1')
    .max(20, 'O limite máximo permitido é 20 produtos por requisição')
    .default(10)
    .optional(),
});

export const GetProductSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O ID do produto é obrigatório'),
});

export const GetProductImagesSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O ID do produto é obrigatório'),
  variationId: z
    .string()
    .trim()
    .optional(),
});

export const GetCampaignSchema = z.object({
  campaign: z
    .string()
    .trim()
    .optional(),
  campaignId: z
    .string()
    .trim()
    .optional(),
}).refine(data => Boolean(data.campaign || data.campaignId), {
  message: 'Informe o ID ou o Nome da campanha desejada',
});

export const GetCampaignPromptsSchema = z.object({
  campaignId: z
    .string()
    .trim()
    .optional(),
  campaignName: z
    .string()
    .trim()
    .optional(),
});

export const GetStoreAssetsSchema = z.object({
  category: z
    .enum(['logo', 'badge', 'installment', 'seal', 'other'])
    .optional(),
});

export const GetGeneratedPostReferencesSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O ID do produto é obrigatório'),
  campaignId: z
    .string()
    .trim()
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .optional(),
});

export const GetPostGenerationContextSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O ID do produto é obrigatório'),
  campaign: z
    .string()
    .trim()
    .default('Campanha Padrão')
    .optional(),
  campaignId: z
    .string()
    .trim()
    .optional(),
  format: z
    .enum(['4:5', '9:16', 'mobile'])
    .default('4:5')
    .optional(),
  variationId: z
    .string()
    .trim()
    .optional(),
});

export const BuildPostPromptContextSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'O ID do produto é obrigatório'),
  campaign: z
    .string()
    .trim()
    .default('Campanha Padrão')
    .optional(),
  campaignId: z
    .string()
    .trim()
    .optional(),
  format: z
    .enum(['4:5', '9:16', 'mobile'])
    .default('4:5')
    .optional(),
  variationId: z
    .string()
    .trim()
    .optional(),
});
