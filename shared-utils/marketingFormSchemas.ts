import { imageFilesFormSchema } from './fileFormSchemas';
import { z } from 'zod';
import type { MarketingTemplate } from '../erp/src/pages/App/Marketing/Posts/types/template';

const requiredText = z.string().refine((value) => Boolean(value.trim()), 'Preencha este campo.');
export const marketingAssetFormSchema = z.object({ name: requiredText, url: z.url('Informe uma URL válida.') });
export const postModelFormSchema = z.object({ name: requiredText, prompt: requiredText, format: z.enum(['4:5', '9:16']) });
const postModelAsset = z.object({ id: z.string(), name: z.string(), description: z.string().optional(), fileUrl: z.string(), mimeType: z.string() });
const postModelExtra = z.object({ id: z.string(), name: z.string(), type: z.enum(['TEXT', 'FILE']), textValue: z.string().optional(), fileId: z.string().optional() });
export const postModelEditorFormSchema = postModelFormSchema.extend({ assets: z.array(postModelAsset), extras: z.array(postModelExtra) });
export const postModelPreviewFormSchema = postModelEditorFormSchema.extend({ name: z.string() });
export const postModelFilesFormSchema = z.object({ files: z.array(z.custom<File>((file) => typeof file === 'object' && file !== null && 'type' in file && typeof file.type === 'string' && (/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.type === 'application/pdf'), 'Use imagens PNG, JPEG, WebP, SVG ou arquivos PDF.')).min(1, 'Selecione um arquivo.') });
export const postElementModelFormSchema = z.object({
  name: requiredText, prompt: z.string(), elementType: z.string(), opportunityId: z.string(),
}).superRefine((value, ctx) => {
  if (value.elementType === 'BADGE' && !value.opportunityId) {
    ctx.addIssue({ code: 'custom', path: ['opportunityId'], message: 'Selecione a oportunidade.' });
  }
});
export const postElementModelEditorFormSchema = postElementModelFormSchema.safeExtend({
  referenceFiles: z.array(z.object({ id: z.string().min(1), name: z.string(), fileUrl: z.string().min(1, 'Referência sem imagem.'), mimeType: z.string().startsWith('image/', 'Selecione um arquivo de imagem.') })),
});
export const postElementReferenceUploadFormSchema = imageFilesFormSchema;
export const marketingElementImageUploadFormSchema = imageFilesFormSchema.refine(
  (values) => values.files.every((file) => ['image/png', 'image/webp', 'image/jpeg'].includes(file.type)),
  { path: ['files'], message: 'Use PNG, WebP ou JPEG.' },
);
export const marketingLayerFormSchema = z.object({
  id: z.string().min(1), name: z.string(),
  type: z.enum(['PRODUCT_MAIN_IMAGE', 'ASSET', 'DYNAMIC_TEXT', 'DYNAMIC_PRICE', 'DYNAMIC_INSTALLMENT', 'VARIATION_GALLERY', 'HEADER_FOOTER_DECORATION']),
  x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative().optional(),
  rotation: z.number(), zIndex: z.number(), opacity: z.number().min(0).max(1), locked: z.boolean(), visible: z.boolean(),
  role: z.enum(['badge', 'title', 'oldPrice', 'price', 'installment', 'productSlogan', 'storeSlogan', 'gallery', 'brand', 'main']).optional(),
  preferredRegion: z.enum(['TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT', 'CENTER_LEFT', 'CENTER', 'CENTER_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT']).optional(),
  preferredSize: z.enum(['small', 'medium', 'large']).optional(), priority: z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  positionTolerance: z.enum(['strict', 'automatic']).optional(), safeMargin: z.number().nonnegative().optional(),
  opportunityId: z.string().optional(), modelId: z.string().optional(), aiInstructions: z.string().optional(),
  subjectBounds: z.object({ x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative() }).optional(),
  textBinding: z.string().optional(), fontFamily: z.string().optional(), fontSizeRelative: z.number().nonnegative().optional(),
  color: z.string().optional(), fontWeight: z.string().optional(), textAlign: z.enum(['left', 'center', 'right']).optional(),
  assetId: z.string().optional(), assetUrl: z.string().optional(),
}).passthrough();
export const marketingTemplateFormSchema = z.object({
  id: z.string().optional(), name: z.string().trim().min(1, 'Informe o nome do template.'),
  aspectRatio: z.enum(['4:5', '1:1', '9:16', '16:9']), targetWidth: z.number().positive(), targetHeight: z.number().positive(),
  campaignId: z.string().nullable().optional(), layers: z.array(marketingLayerFormSchema), backgroundColor: z.string(),
  isDefault: z.boolean().optional(),
  createdAt: z.string().optional(), updatedAt: z.string().optional(), persistedRemotely: z.boolean().optional(),
  layouts: z.partialRecord(z.enum(['4:5', '9:16']), z.object({
    aspectRatio: z.enum(['4:5', '9:16']), targetWidth: z.number().positive(), targetHeight: z.number().positive(), layers: z.array(marketingLayerFormSchema),
  })).optional(),
  editorSettings: z.object({ environmentPrompts: z.record(z.string(), z.string()).optional(), modelProductId: z.string().optional(), photoOverrides: z.record(z.string(), z.string()).optional(), sampleSlogan: z.string().optional() }).passthrough().optional(),
}).passthrough();
export const marketingElementSaveFormSchema = z.object({ name: z.string().trim().min(1, 'Informe o nome do modelo.'), layer: marketingLayerFormSchema });
const ambientationImageSchema = z.url('Selecione uma imagem válida.').refine((value) => /^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=\r\n]+$/i.test(value), 'A imagem deve ter um endereço HTTPS ou dados de imagem válidos.');
export const ambientationPromptFormSchema = z.object({ productName: z.string().trim().min(1, 'Informe o nome do produto.') });
export const ambientationFormSchema = z.object({
  productId: z.string().trim().min(1, 'Selecione o produto.'), productName: ambientationPromptFormSchema.shape.productName, originalImageUrl: ambientationImageSchema, prompt: z.string().trim(),
});
export const ambientationRecordFormSchema = ambientationFormSchema.pick({ productId: true, originalImageUrl: true }).extend({
  id: z.uuid('Imagem não identificada.'), variationId: z.string().nullable().optional(), ambientedImageUrl: ambientationImageSchema, promptUsed: z.string().trim().optional(),
});
export const ambientationSelectionFormSchema = ambientationRecordFormSchema.pick({ id: true, productId: true, ambientedImageUrl: true });
export const postUploadFormSchema = z.object({
  productId: z.string().trim().min(1, 'Selecione o produto.'), campaignId: z.string().trim(), format: z.enum(['FEED_4_5', 'STORY_STATUS_9_16']),
  file: imageFilesFormSchema.shape.files.element,
  ratioValid: z.boolean().refine(Boolean, 'A proporção da imagem não corresponde ao formato do post.'),
  detectedFormat: z.enum(['FEED_4_5', 'STORY_STATUS_9_16']).nullable(),
}).refine((value) => value.detectedFormat === value.format, { path: ['format'], message: 'O formato escolhido deve corresponder à proporção da imagem.' });
export const postLibraryFilterFormSchema = z.object({
  productId: z.string().trim(), campaignId: z.string().trim(), format: z.enum(['', 'FEED_4_5', 'STORY_STATUS_9_16']),
});
export const postDeleteFormSchema = z.object({
  id: z.string().trim().min(1, 'Arte não identificada.'), productId: z.string().trim().min(1, 'Produto não identificado.'),
  imageStoragePath: z.string().min(1, 'Arquivo não identificado.'),
}).passthrough().refine((value) => value.imageStoragePath.startsWith(`${value.productId}/${value.id}/`) && !value.imageStoragePath.split('/').some((part) => part === '..'),
  { path: ['imageStoragePath'], message: 'O arquivo deve pertencer à arte e ao produto selecionados.' });
export const postDownloadFormSchema = z.object({
  id: z.string().trim().min(1), format: z.enum(['FEED_4_5', 'STORY_STATUS_9_16']),
  imageUrl: z.url('A imagem não tem um endereço válido.').refine((url) => url.startsWith('https://'), 'A arte precisa de um endereço HTTPS público.'),
});
/** Preserve metadata while making interface payloads compatible with the loose Zod input type. */
export const marketingTemplateFormValues = (value: Omit<MarketingTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }) => ({
  ...value, layers: value.layers.map((layer) => ({ ...layer })),
  layouts: value.layouts ? Object.fromEntries(Object.entries(value.layouts).map(([format, layout]) => [format, layout ? { ...layout, layers: layout.layers.map((layer) => ({ ...layer })) } : undefined])) : undefined,
  editorSettings: value.editorSettings ? { ...value.editorSettings } : undefined,
});
const selectionImageSchema = z.url('Selecione uma imagem válida.').refine((value) => /^(https?:|data:image\/|blob:)/i.test(value), 'Selecione uma imagem válida.');
export const marketingImageSelectionFormSchema = z.object({
  productId: z.string().trim().min(1, 'Produto não identificado.'),
  selection: z.object({ primaryUrl: selectionImageSchema.optional(), openViewUrl: selectionImageSchema.nullable().optional(), variationUrls: z.record(z.string().min(1), selectionImageSchema).optional() }),
});
export const marketingImageSelectionResetFormSchema = marketingImageSelectionFormSchema.pick({ productId: true });
