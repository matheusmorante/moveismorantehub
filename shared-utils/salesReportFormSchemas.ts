import { z } from 'zod';
import { reportDateRangeFormSchema } from './scheduleFormSchemas';
import { productReferenceFormSchema } from './catalogFormSchemas';

const finite = z.number({ error: 'Informe um valor numérico válido no relatório.' });
export const salesReportFiltersFormSchema = z.object({
  suppliers: z.array(z.string()), minProfit: finite, maxProfit: finite, search: z.string(),
});
export const salesReportConfigSchema = z.object({
  abcBasis: z.enum(['revenue', 'profit']).optional(),
  turnoverThresholdMode: z.enum(['avg', 'custom']).optional(), profitThresholdMode: z.enum(['avg', 'custom']).optional(),
  turnoverThreshold: finite.optional(), profitThreshold: finite.optional(), excludedItems: z.array(z.string()).optional(),
  dateRange: reportDateRangeFormSchema.optional(),
  filters: salesReportFiltersFormSchema.partial().extend({ supplier: z.string().optional() }).passthrough().optional(),
  date: z.string().optional(), product: z.string().optional(), supplier: z.string().optional(),
  quantity: z.string().optional(), cost: z.string().optional(), salesValue: z.string().optional(), profit: z.string().optional(),
}).passthrough();
export const salesReportResultSchema = z.object({
  product: z.string(), supplier: z.string(), totalQuantity: finite, totalRevenue: finite, totalProfit: finite,
  avgCost: finite, accumulatedPercentage: finite, classification: z.enum(['A', 'B', 'C']),
  monthlyProfit: finite, monthlyTurnover: finite, quadrant: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
});
const timestamp = z.union([z.date().transform(date => date.toISOString()), z.iso.datetime({ offset: true })]).nullish();
export const salesReportProductSchema = z.object({ product: z.string(), supplier: z.string(), qty: finite, rev: finite, profit: finite, cost: finite, quadrant: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) });
export const salesReportDataSchema = z.object({
  results: z.array(salesReportResultSchema),
  allProducts: z.array(salesReportProductSchema).default([]),
  totalProfit: finite, monthCount: finite.int().nonnegative(), avgProfitPerItem: finite, avgTurnoverPerItem: finite,
  reportStartDate: timestamp, reportEndDate: timestamp,
});
const blingReportBody = z.object({
  id: z.uuid('Identificação do relatório inválida.'), name: z.string().trim().min(1, 'Informe o nome do relatório.'),
  source: z.literal('bling', { error: 'Este módulo é exclusivo para relatórios Bling.' }),
  config: salesReportConfigSchema, report_data: salesReportDataSchema,
});
export const blingReportWriteFormSchema = z.discriminatedUnion('intent', [
  blingReportBody.extend({ intent: z.literal('create') }), blingReportBody.extend({ intent: z.literal('update') }),
  z.object({ intent: z.literal('delete'), id: z.uuid('Identificação do relatório inválida.') }),
  z.object({ intent: z.literal('config'), id: z.uuid('Identificação do relatório inválida.'), config: salesReportConfigSchema }),
]);
export const blingReportRowSchema = blingReportBody.extend({
  type: z.literal('abc_curve_bling'), created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }).optional(),
});
export const blingReportQueryFormSchema = z.discriminatedUnion('intent', [
  z.object({ intent: z.literal('list') }), z.object({ intent: z.literal('mappings') }),
  z.object({ intent: z.literal('get'), id: z.uuid('Identificação do relatório inválida.') }),
]);
export const blingReportFetchFormSchema = z.object({ range: reportDateRangeFormSchema.optional() });
export const blingReportEditorFormSchema = blingReportBody.omit({ report_data: true });
const erpReportBody = blingReportBody.extend({ source: z.enum(['erp', 'csv']) });
export const erpReportWriteFormSchema = z.discriminatedUnion('intent', [
  erpReportBody.extend({ intent: z.literal('create') }), erpReportBody.extend({ intent: z.literal('update') }),
  z.object({ intent: z.literal('delete'), id: z.uuid('Identificação do relatório inválida.') }),
  z.object({ intent: z.literal('config'), id: z.uuid('Identificação do relatório inválida.'), config: salesReportConfigSchema }),
]);
// Old reports can be read with incomplete product aggregates. Saving a complete
// analysis still requires salesReportDataSchema; filters can preserve the snapshot.
export const erpReportReadRowSchema = erpReportBody.extend({
  type: z.literal('abc_curve'), created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }).optional(),
  report_data: salesReportDataSchema.extend({ allProducts: z.array(z.union([z.string(), salesReportProductSchema.partial({ supplier: true, rev: true, cost: true, quadrant: true })])).default([]) }),
});
export const salesReportSaleItemsSchema = z.array(z.object({
  date: z.date(), product: z.string(), supplier: z.string(), quantity: finite,
  cost: finite.optional(), salesValue: finite, profit: finite.optional(), variationId: z.string().optional(),
}));
export const salesReportLoadFormSchema = z.object({ config: salesReportConfigSchema, productMappings: z.record(z.string(), z.string()) });
export const salesReportCsvImportFormSchema = salesReportLoadFormSchema.extend({
  file: z.custom<File>(file => typeof File !== 'undefined' && file instanceof File && file.name.toLowerCase().endsWith('.csv'), 'Selecione um arquivo CSV.'),
  forceMonthCount: finite.int().positive().optional(),
});
export const salesReportExportFormSchema = z.object({ results: z.array(salesReportResultSchema) });
export const salesReportLoadSnapshotFormSchema = z.object({ report_data: erpReportReadRowSchema.shape.report_data });
export const erpReportPrepareFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do relatório.'), source: z.enum(['erp', 'csv']),
  config: salesReportConfigSchema, csvData: z.array(z.record(z.string(), z.string())).default([]),
}).superRefine((values, ctx) => {
  if (values.source === 'csv' && values.csvData.length && ['date', 'product', 'supplier', 'quantity', 'cost', 'salesValue', 'profit'].some(key => !values.config[key])) {
    ctx.addIssue({ code: 'custom', path: ['config'], message: 'Confira todos os campos de mapeamento do CSV.' });
  }
});
export const salesReportReferenceRowSchema = z.object({ id: z.uuid(), master_name: z.string(), reference_name: z.string() });
export const salesReportReferenceWriteFormSchema = z.discriminatedUnion('intent', [
  productReferenceFormSchema.extend({ intent: z.literal('add'), id: z.uuid() }),
  z.object({ intent: z.literal('delete'), id: z.uuid(), confirmed: z.literal(true) }),
]);
export const salesReportReferenceQueryFormSchema = z.object({ intent: z.literal('list') });
export const salesReportViewFormSchema = salesReportFiltersFormSchema.extend({
  reportType: z.enum(['abc', 'matrix']), abcBasis: z.enum(['revenue', 'profit']),
  sortConfig: z.object({ key: z.string(), direction: z.enum(['asc', 'desc']) }),
});
// Explicit provider fields consumed by the existing importer. Missing amounts keep
// its zero default; malformed/non-finite amounts stop the import instead of truncating it.
const providerAmount = z.union([z.number(), z.string()]).nullish().transform(value => Number(value ?? 0)).pipe(finite);
export const blingReportPageSchema = z.object({ data: z.array(z.object({
  data: z.string().nullish(), situacao: z.object({ id: z.number() }).nullish(),
  itens: z.array(z.object({ quantidade: providerAmount, valor: providerAmount, custo: providerAmount, descricao: z.string().nullish() })).nullish(),
})) });
