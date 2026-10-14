import { z } from 'zod';

export const orderListFormSchema = z.object({ page: z.number().int().positive(), search: z.string(), status: z.string() });
export const purchaseListFormSchema = z.object({ page: z.number().int().nonnegative(), search: z.string().optional(), supplierId: z.string().optional() });
export const supplierListFormSchema = z.object({ page: z.number().int().nonnegative(), search: z.string(), sortBy: z.enum(['full_name', 'created_at']), sortOrder: z.enum(['asc', 'desc']), activeOnly: z.boolean().optional() });
export const productListFormSchema = z.object({
  page: z.number().int().positive(), search: z.string(), statusFilter: z.enum(['all', 'active', 'disabled', 'draft']),
  category: z.string(), catalogStatus: z.enum(['all', 'published', 'hidden']), itemType: z.enum(['standard', 'composition']), generalType: z.enum(['all', 'product', 'service']), includeDeactivated: z.boolean(),
});
const month = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith('0000');
export const invoiceDateFilterFormSchema = z.object({
  mode: z.enum(['current_month', 'previous_month', 'current_year', 'previous_year', 'custom_month', 'custom_range']),
  customMonth: z.string(), startMonth: z.string(), endMonth: z.string(),
}).superRefine((values, ctx) => {
  if (values.mode === 'custom_month' && !month(values.customMonth)) ctx.addIssue({ code: 'custom', path: ['customMonth'], message: 'Informe um mês válido no formato AAAA-MM.' });
  if (values.mode === 'custom_range' && (!month(values.startMonth) || !month(values.endMonth) || values.startMonth > values.endMonth)) ctx.addIssue({ code: 'custom', path: ['endMonth'], message: 'Informe um intervalo de meses válido.' });
});
export const invoiceListFormSchema = z.object({ page: z.number().int().nonnegative(), searchTerm: z.string(), dateFilter: invoiceDateFilterFormSchema });
