import { z } from 'zod';
import { marketingLayerFormSchema, marketingTemplateFormSchema } from './marketingFormSchemas';

export const postProductQueryFormSchema = z.object({ search: z.string().trim(), page: z.number().int().positive('A página deve ser positiva.') });
export const postPreviewProductFormSchema = z.object({ id: z.string().trim() }); // Empty clears the local preview preference.
export const postEditorCampaignFormSchema = z.object({ id: z.string().trim().min(1, 'Selecione a campanha.'), name: z.string() });
export const postCompositionFormSchema = z.object({
  product: z.object({ name: z.string().min(1, 'Selecione o produto.'), price: z.string(), oldPrice: z.string().optional(), galleryImages: z.array(z.unknown()).optional() }).passthrough(),
  layers: z.array(marketingLayerFormSchema), aspectRatio: marketingTemplateFormSchema.shape.aspectRatio,
});
