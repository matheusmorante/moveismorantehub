import { z } from 'zod';
import { PRODUCT_LIST_SEARCH_MIN_LENGTH } from './productListSearch';

export const orderListFormSchema = z.object({ page: z.number().int().positive(), search: z.string(), status: z.string() });
export const purchaseListFormSchema = z.object({ page: z.number().int().nonnegative(), search: z.string().optional(), supplierId: z.string().optional() });
export const supplierListFormSchema = z.object({ page: z.number().int().nonnegative(), search: z.string(), sortBy: z.enum(['full_name', 'created_at']), sortOrder: z.enum(['asc', 'desc']), activeOnly: z.boolean().optional() });
export const PRODUCT_LIST_PAGE_SIZES = [10, 15] as const;
export type ProductListPageSize = (typeof PRODUCT_LIST_PAGE_SIZES)[number];
export const productListPageSizeSchema = z.union([z.literal(10), z.literal(15)]);
export const productListPageSizeFormSchema = z.object({
  itemsPerPage: z.preprocess(
    (value) => (typeof value === 'string' ? Number(value) : value),
    productListPageSizeSchema
  ),
});
export const productListFormSchema = z.object({
  page: z.number().int().positive(), itemsPerPage: productListPageSizeSchema, search: z.string(), statusFilter: z.enum(['all', 'active', 'disabled', 'draft']),
  category: z.string(), catalogStatus: z.enum(['all', 'published', 'hidden']), itemType: z.enum(['standard', 'composition']), generalType: z.enum(['all', 'product', 'service']), includeDeactivated: z.boolean(), showTrash: z.boolean().optional(), showTestProducts: z.boolean(), showMergedProducts: z.boolean(),
});
export const productListQueryFiltersFormSchema = z.object({
  showTrash: z.boolean().optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  activeOnly: z.boolean().optional(),
  status: z.enum(['published', 'hidden']).optional(),
  isDraft: z.boolean().optional(),
  includeDeactivated: z.boolean().optional(),
  itemType: z.enum(['product', 'composition', 'service']).optional(),
  excludeItemType: z.enum(['product', 'composition', 'service']).optional(),
  sortBy: z.enum(['description', 'unitPrice', 'stock', 'code', 'createdAt', 'category']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  excludeTestProducts: z.boolean().optional(),
});
export const productListSearchFormSchema = z.object({
  input: z.string(),
  intent: z.enum(['debounced', 'submitted']),
}).transform(({ input, intent }) => {
  const search = input.trim();
  if (search.length === 0) return { search: '' };
  if (search.length >= PRODUCT_LIST_SEARCH_MIN_LENGTH) return { search };
  return { search: intent === 'submitted' ? null : '' };
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
export const fiscalDocumentsListFormSchema = z.object({
  pageIndex: z.number().int().nonnegative(), targetDocumentId: z.string().uuid('Identificação da nota inválida.').nullish(),
  filters: z.object({
    search: z.string(), model: z.enum(['all', '55', '65']), environment: z.enum(['all', '1', '2']),
    documentType: z.enum(['all', 'outbound', 'estorno']),
    status: z.enum(['all', 'pendente', 'processando', 'autorizada', 'homologada', 'cancelada', 'rejeitada', 'denegada', 'erro', 'abandoned']),
    dateFrom: z.string(), dateTo: z.string(),
  }),
}).superRefine((values, ctx) => {
  // The existing service ignores the period when opening a specific document.
  if (values.targetDocumentId) return;
  for (const field of ['dateFrom', 'dateTo'] as const) {
    if (!z.iso.date().safeParse(values.filters[field]).success) ctx.addIssue({ code: 'custom', path: ['filters', field], message: field === 'dateFrom' ? 'Informe a data inicial.' : 'Informe a data final.' });
  }
  if (values.filters.dateFrom > values.filters.dateTo) ctx.addIssue({ code: 'custom', path: ['filters', 'dateTo'], message: 'A data final deve ser igual ou posterior à inicial.' });
});
