import { z } from 'zod';
import { documentFilesFormSchema } from './fileFormSchemas';

const purchaseItem = z.object({
  productId: z.string(), variationId: z.string().optional(), description: z.string(),
  quantity: z.number().nonnegative(), baseCost: z.number().nonnegative().optional(),
  discountUnit: z.number().nonnegative().optional(),
  unitCost: z.number().nonnegative(), totalCost: z.number().nonnegative(),
}).passthrough();
export const purchaseDraftFormSchema = z.object({
  supplierId: z.string(), supplierName: z.string(),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Informe uma data válida.'),
  observation: z.string().optional(),
  status: z.literal('draft'),
  items: z.array(purchaseItem), totalValue: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100).optional(),
  ipiPercent: z.number().nonnegative().optional(), freightPercent: z.number().nonnegative().optional(),
  attachments: z.array(z.string()).max(5, 'Você pode anexar no máximo 5 arquivos.').optional(),
}).passthrough();
export const purchaseFormSchema = purchaseDraftFormSchema.extend({
  status: z.enum(['pending', 'ordered', 'fulfilled', 'cancelled']),
  supplierId: z.string().min(1, 'Selecione um fornecedor para salvar o pedido.'),
  items: z.array(purchaseItem.extend({ productId: z.string().min(1), quantity: z.number().positive('Informe uma quantidade maior que zero.') })).min(1, 'Adicione pelo menos um item ao pedido.'),
});
const percentageText = z.string().refine((value) => !value || /^\d+(?:[.,]\d+)?$/.test(value.trim()), 'Informe uma porcentagem válida.');
const discountPercentageText = percentageText.refine(
  (value) => !value.trim() || Number(value.trim().replace(',', '.')) <= 100,
  'O desconto do pedido deve ficar entre 0% e 100%.'
);
export const purchaseAttachmentUploadFormSchema = documentFilesFormSchema.extend({
  existingCount: z.number().int().nonnegative(),
}).refine((values) => values.existingCount + values.files.length <= 5, { path: ['files'], message: 'Você pode anexar no máximo 5 arquivos (PDF ou imagem).' });
const mobilePurchaseAttachmentAssetSchema = z.object({
  uri: z.string().min(1, 'Não foi possível acessar o arquivo selecionado.'),
  name: z.string().min(1, 'O arquivo selecionado precisa ter um nome.'),
  mimeType: z.string().nullable().optional(),
  size: z.number().nonnegative().optional(),
}).passthrough().refine((asset) => {
  const mimeType = asset.mimeType?.toLowerCase() || '';
  const extension = asset.name.split('.').pop()?.toLowerCase() || '';
  return mimeType === 'application/pdf' || mimeType.startsWith('image/') ||
    ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'heic', 'heif', 'bmp'].includes(extension);
}, 'Selecione arquivos PDF ou imagens.');
export const mobilePurchaseAttachmentUploadFormSchema = z.object({
  existingCount: z.number().int().nonnegative(),
  assets: z.array(mobilePurchaseAttachmentAssetSchema).min(1, 'Selecione um arquivo.'),
}).refine((values) => values.existingCount + values.assets.length <= 5, {
  path: ['assets'],
  message: 'Você pode anexar no máximo 5 arquivos (PDF ou imagem).',
});
export const mobilePurchaseFormSchema = purchaseFormSchema.extend({
  supplierName: z.string().min(1, 'Selecione o fornecedor.'),
  date: z.iso.date('Informe uma data válida.'),
  discountInput: discountPercentageText, ipiInput: percentageText, freightInput: percentageText,
});
export const mobilePurchaseDraftFormSchema = purchaseDraftFormSchema.extend({
  supplierName: z.string(),
  discountInput: discountPercentageText,
  ipiInput: z.string(),
  freightInput: z.string(),
});
