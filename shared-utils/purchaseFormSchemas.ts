import { z } from 'zod';
import { documentFilesFormSchema } from './fileFormSchemas';

const purchaseItem = z.object({
  productId: z.string(), variationId: z.string().optional(), description: z.string(),
  quantity: z.number().nonnegative(), unitCost: z.number().nonnegative(), totalCost: z.number().nonnegative(),
}).passthrough();
export const purchaseDraftFormSchema = z.object({
  supplierId: z.string(), supplierName: z.string(),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Informe uma data válida.'),
  status: z.enum(['ordered', 'fulfilled', 'cancelled']),
  items: z.array(purchaseItem), totalValue: z.number().nonnegative(),
  ipiPercent: z.number().nonnegative().optional(), freightPercent: z.number().nonnegative().optional(),
  attachments: z.array(z.string()).optional(),
}).passthrough();
export const purchaseFormSchema = purchaseDraftFormSchema.extend({
  supplierId: z.string().min(1, 'Selecione um fornecedor para salvar o pedido.'),
  items: z.array(purchaseItem.extend({ productId: z.string().min(1), quantity: z.number().positive('Informe uma quantidade maior que zero.') })).min(1, 'Adicione pelo menos um item ao pedido.'),
});
const percentageText = z.string().refine((value) => !value || /^\d+(?:[.,]\d+)?$/.test(value.trim()), 'Informe uma porcentagem válida.');
export const purchaseAttachmentUploadFormSchema = documentFilesFormSchema.extend({
  existingCount: z.number().int().nonnegative(),
}).refine((values) => values.existingCount + values.files.length <= 5, { path: ['files'], message: 'Você pode anexar no máximo 5 arquivos (PDF ou imagem).' });
export const mobilePurchaseFormSchema = purchaseFormSchema.extend({
  supplierName: z.string().min(1, 'Selecione o fornecedor.'),
  date: z.iso.date('Informe uma data válida.'),
  ipiInput: percentageText, freightInput: percentageText,
});
