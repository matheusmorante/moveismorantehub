import { z } from 'zod';
import { erpStockUnavailabilityFormSchema } from './operationsFormSchemas';

export const stockUnavailabilitySupplierQuerySchema = z.object({ productId: z.string().trim().min(1, 'Selecione um produto.') });
export const stockUnavailabilityPhotosFormSchema = z.object({ photos: erpStockUnavailabilityFormSchema.shape.photos });
export const stockUnavailabilityWriteFormSchema = erpStockUnavailabilityFormSchema.safeExtend({ variationIsVirtual: z.boolean().default(false) })
  .refine((value) => !value.variationIsVirtual, { path: ['variationId'], message: 'Selecione uma variação física cadastrada.' })
  .refine((value) => Math.abs(value.quantity * 100 - Math.round(value.quantity * 100)) < 0.00000001,
    { path: ['quantity'], message: 'Informe a quantidade com até duas casas decimais.' });
export const stockUnavailabilityOwnerFormSchema = stockUnavailabilityWriteFormSchema.safeExtend({ supplierIds: z.array(z.string()) })
  .refine((value) => !value.supplierId || value.supplierIds.includes(value.supplierId), { path: ['supplierId'], message: 'Selecione um fornecedor vinculado ao produto atual.' });
export const stockUnavailabilityAckSchema = z.union([z.string().trim().min(1), z.object({ id: z.string().trim().min(1) })])
  .transform((value) => typeof value === 'string' ? { id: value } : value);

export class StockUnavailabilityUnconfirmedError extends Error {
  readonly uncertain = true;
  constructor() { super('O registro pode ter sido gravado, mas não foi confirmado. Consulte as indisponibilidades antes de repetir.'); }
}

export interface StockUnavailabilityOperationGuard { active: symbol | null; error: string }
