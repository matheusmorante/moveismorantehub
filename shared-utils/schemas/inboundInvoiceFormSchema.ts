import { z } from 'zod';
import { inboundAccessKeyFormSchema } from './lookupFormSchemas';

export const inboundInvoiceFormSchema = z.object({
  id: z.string(), nfeKey: inboundAccessKeyFormSchema.shape.accessKey,
  nfeNumber: z.string(), series: z.string(),
  issuedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Data de emissão inválida.'),
  emitterCnpj: z.string(), emitterName: z.string(), recipientCnpj: z.string(), recipientName: z.string(),
  totalProducts: z.number().nonnegative(), totalFreight: z.number().nonnegative(), totalIpi: z.number().nonnegative(), totalInvoice: z.number().nonnegative(),
  model: z.string().optional().refine((value) => !value || value === '55', 'Somente NF-e modelo 55 pode ser cadastrada como NF de Entrada.'),
  environment: z.union([z.literal(1), z.literal(2)]).optional(),
  status: z.enum(['pending', 'received', 'manifested']), itemsCount: z.number().int().nonnegative(),
  items: z.array(z.object({
    itemNumber: z.number().int().positive(), productCode: z.string(), productDescription: z.string(),
    ncm: z.string(), cfop: z.string(), unit: z.string(),
    quantity: z.number().positive(), unitCost: z.number().nonnegative(), totalCost: z.number().nonnegative(),
  }).passthrough()).min(1, 'A nota de entrada precisa conter itens.'),
}).passthrough().superRefine((value, ctx) => {
  if (value.itemsCount !== value.items.length) ctx.addIssue({ code: 'custom', path: ['itemsCount'], message: 'A quantidade de linhas da nota não corresponde aos itens importados.' });
});
